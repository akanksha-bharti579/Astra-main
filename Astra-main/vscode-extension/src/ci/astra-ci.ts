/**
 * astra-ci.ts - Astra CI/CD Carbon Budget Checker
 * 
 * A standalone CLI tool that runs in CI/CD pipelines (GitHub Actions, GitLab CI, etc.)
 * to enforce carbon/cost budgets on pull requests.
 * 
 * This file has ZERO VS Code dependencies - it runs in plain Node.js.
 * 
 * Usage:
 *   npx ts-node src/ci/astra-ci.ts [project-root]
 *   node out/ci/astra-ci.js [project-root]
 * 
 * Exit codes:
 *   0 = Pass (within budget)
 *   1 = Fail (budget exceeded)
 *   2 = Error (configuration/scan failure)
 * 
 * Reads .astra.json for budget thresholds.
 */

import * as fs from 'fs';
import * as path from 'path';
import { pricing } from '../data/price_table';

// ─── Types (self-contained, no vscode imports) ──────────────────

interface AstraConfig {
    carbonBudget?: {
        monthly?: number;       // gCO2e
        daily?: number;         // gCO2e  
        perCommit?: number;     // gCO2e per commit/PR
        alertThreshold?: number; // 0-1
    };
    team?: {
        dailyUsers?: number;
    };
    greenPolicy?: {
        maxModelTier?: 'heavy' | 'medium' | 'light';
        bannedModels?: string[];
        allowedRegions?: string[];
        requireCaching?: boolean;
    };
    ci?: {
        failOnWarning?: boolean;    // fail on warnings too (strict mode)
        excludePaths?: string[];    // paths to exclude from scanning
        maxCarbonPerPR?: number;    // gCO2e threshold per PR
        maxCostPerPR?: number;      // $ threshold per PR
    };
}

interface CIViolation {
    file: string;
    line: number;
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    model?: string;
    estimatedCarbon?: number;
    estimatedCost?: number;
}

interface CIScanResult {
    passed: boolean;
    totalCarbon: number;       // gCO2e
    totalCost: number;         // $
    violations: CIViolation[];
    filesScanned: number;
    apiCallsFound: number;
    summary: string;
}

// ─── Model Classification ───────────────────────────────────────

const HEAVY_MODELS = [
    'gpt-4-32k', 'gpt-4-turbo', 'gpt-5-pro', 'o1',
    'claude-3-opus', 'dall-e-3', 'dall-e',
    'gemini-3-pro', 'gemini-2.5-pro', 'gemini-1.5-pro',
];

const MEDIUM_MODELS = [
    'gpt-5', 'gpt-4o', 'gpt-4.1',
    'claude-3-5-sonnet', 'claude-sonnet',
    'mistral-large', 'command-r-plus', 'llama-3.3-70b',
];

// ─── Cloud Regions ──────────────────────────────────────────────

const DIRTY_REGIONS: Record<string, { intensity: number; location: string }> = {
    'ap-south-1': { intensity: 700, location: 'Mumbai' },
    'af-south-1': { intensity: 750, location: 'Cape Town' },
    'ap-southeast-2': { intensity: 550, location: 'Sydney' },
    'me-south-1': { intensity: 500, location: 'Bahrain' },
    'ap-northeast-1': { intensity: 460, location: 'Tokyo' },
    'ap-northeast-2': { intensity: 420, location: 'Seoul' },
    'us-east-1': { intensity: 380, location: 'N. Virginia' },
    'us-east-2': { intensity: 410, location: 'Ohio' },
    'ap-southeast-1': { intensity: 410, location: 'Singapore' },
    'us-central1': { intensity: 410, location: 'Iowa' },
    'centralindia': { intensity: 700, location: 'Pune' },
    'eastasia': { intensity: 600, location: 'Hong Kong' },
    'australiaeast': { intensity: 550, location: 'Sydney' },
};

// ─── Scanner ────────────────────────────────────────────────────

const CODE_EXTENSIONS = ['.ts', '.js', '.py', '.tsx', '.jsx'];
const CONFIG_EXTENSIONS = ['.tf', '.tfvars', '.yml', '.yaml', '.json', '.env', '.toml'];
const IGNORE_DIRS = ['node_modules', '.git', 'dist', 'out', 'build', '__pycache__', '.venv', '.next', 'coverage'];

function getAllFiles(dir: string, excludePaths: string[] = []): string[] {
    const results: string[] = [];

    function walk(currentDir: string) {
        try {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                const relativePath = path.relative(dir, fullPath);

                if (excludePaths.some(p => relativePath.startsWith(p))) continue;

                if (entry.isDirectory()) {
                    if (!IGNORE_DIRS.includes(entry.name)) walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (CODE_EXTENSIONS.includes(ext) || CONFIG_EXTENSIONS.includes(ext)) {
                        results.push(fullPath);
                    }
                }
            }
        } catch (e) {
            // Permission errors etc - skip
        }
    }

    walk(dir);
    return results;
}

// ─── Detection Rules ────────────────────────────────────────────

/**
 * Detect model usage in a file and calculate carbon/cost impact.
 */
function detectModels(content: string, filePath: string): {
    calls: { model: string; line: number; tokens: number; cost: number; carbon: number }[];
    violations: CIViolation[];
} {
    const calls: { model: string; line: number; tokens: number; cost: number; carbon: number }[] = [];
    const violations: CIViolation[] = [];
    const lines = content.split('\n');

    // Match model strings in code
    const modelPattern = /["']((?:gpt-[a-z0-9.-]+|o[13]-?[a-z]*|claude-[a-z0-9.-]+|gemini-[a-z0-9.-]+|mistral-[a-z-]+|command-r[a-z-]*|dall-e-[0-9]+|text-davinci-[0-9]+|text-embedding-[a-z0-9.-]+|llama-[a-z0-9.-]+))["']/gi;

    let match;
    while ((match = modelPattern.exec(content)) !== null) {
        const model = match[1].toLowerCase();
        const lineNum = content.substring(0, match.index).split('\n').length;

        // Estimate tokens from surrounding prompt text
        const promptContext = content.substring(
            Math.max(0, match.index - 500),
            Math.min(content.length, match.index + 500)
        );
        const promptMatch = promptContext.match(/["'`]([^"'`]{10,500})["'`]/);
        const promptText = promptMatch ? promptMatch[1] : 'default prompt';
        const tokens = Math.ceil(promptText.length / 4);

        // Calculate cost and carbon
        const matchedKey = findPricingKey(model);
        let cost = 0;
        let carbon = 0;

        if (matchedKey && pricing[matchedKey]) {
            cost = (tokens / 1000) * pricing[matchedKey].input;
            carbon = pricing[matchedKey].carbon
                ? (tokens / 1000) * pricing[matchedKey].carbon!.input
                : (tokens / 1000) * 0.5;
        } else {
            cost = (tokens / 1000) * 0.01;
            carbon = (tokens / 1000) * 0.5;
        }

        calls.push({ model, line: lineNum, tokens, cost, carbon });
    }

    return { calls, violations };
}

function findPricingKey(model: string): string | undefined {
    const lower = model.toLowerCase().trim();
    if (pricing[lower]) return lower;

    const potentialMatches = Object.keys(pricing).filter(key => lower.includes(key));
    if (potentialMatches.length > 0) {
        potentialMatches.sort((a, b) => b.length - a.length);
        return potentialMatches[0];
    }
    return undefined;
}

/**
 * Check model tier policy violations.
 */
function checkModelPolicy(
    calls: { model: string; line: number }[],
    filePath: string,
    config: AstraConfig
): CIViolation[] {
    const violations: CIViolation[] = [];
    const policy = config.greenPolicy;
    if (!policy) return violations;

    for (const call of calls) {
        const lower = call.model.toLowerCase();

        // Banned models check
        if (policy.bannedModels?.some(b => lower.includes(b.toLowerCase()))) {
            violations.push({
                file: filePath,
                line: call.line,
                rule: 'banned-model',
                severity: 'error',
                message: `Model "${call.model}" is banned by .astra.json policy.`,
                model: call.model
            });
        }

        // Tier check
        if (policy.maxModelTier) {
            const isHeavy = HEAVY_MODELS.some(h => lower.includes(h));
            const isMedium = MEDIUM_MODELS.some(m => lower.includes(m));

            if (policy.maxModelTier === 'light' && (isHeavy || isMedium)) {
                violations.push({
                    file: filePath,
                    line: call.line,
                    rule: 'model-tier-violation',
                    severity: 'error',
                    message: `Model "${call.model}" exceeds "light" tier policy. Use a lighter model.`,
                    model: call.model
                });
            } else if (policy.maxModelTier === 'medium' && isHeavy) {
                violations.push({
                    file: filePath,
                    line: call.line,
                    rule: 'model-tier-violation',
                    severity: 'error',
                    message: `Model "${call.model}" exceeds "medium" tier policy. Use a medium or lighter model.`,
                    model: call.model
                });
            }
        }
    }

    return violations;
}

/**
 * Detect high-carbon cloud regions.
 */
function checkRegions(content: string, filePath: string, config: AstraConfig): CIViolation[] {
    const violations: CIViolation[] = [];
    const regionPattern = /["']([a-z]{2}-[a-z]+-\d|[a-z]+-[a-z]+\d|[a-z]+(?:east|west|central|south|north)[a-z0-9]*)["']/gi;

    let match;
    while ((match = regionPattern.exec(content)) !== null) {
        const region = match[1].toLowerCase();
        const lineNum = content.substring(0, match.index).split('\n').length;

        // Check allowlist
        if (config.greenPolicy?.allowedRegions?.length) {
            const allowed = config.greenPolicy.allowedRegions.map(r => r.toLowerCase());
            if (!allowed.includes(region) && DIRTY_REGIONS[region]) {
                violations.push({
                    file: filePath,
                    line: lineNum,
                    rule: 'region-not-allowed',
                    severity: 'error',
                    message: `Region "${region}" (${DIRTY_REGIONS[region].location}, ${DIRTY_REGIONS[region].intensity}g/kWh) is not in the allowed regions list.`
                });
            }
        }

        // Check dirty regions
        if (DIRTY_REGIONS[region] && DIRTY_REGIONS[region].intensity > 400) {
            violations.push({
                file: filePath,
                line: lineNum,
                rule: 'high-carbon-region',
                severity: 'warning',
                message: `Region "${region}" (${DIRTY_REGIONS[region].location}) has high carbon intensity: ${DIRTY_REGIONS[region].intensity} gCO2/kWh. Consider eu-north-1 or us-west-2.`
            });
        }
    }

    return violations;
}

/**
 * Check for deprecated/legacy models.
 */
function checkLegacyModels(content: string, filePath: string): CIViolation[] {
    const violations: CIViolation[] = [];

    const legacyPatterns = [
        { pattern: /["']text-davinci-003["']/g, model: 'text-davinci-003', replacement: 'gpt-3.5-turbo-instruct' },
        { pattern: /["']gpt-4-32k["']/g, model: 'gpt-4-32k', replacement: 'gpt-4o' },
        { pattern: /["']code-davinci-002["']/g, model: 'code-davinci-002', replacement: 'gpt-4o-mini' },
    ];

    for (const legacy of legacyPatterns) {
        let match;
        while ((match = legacy.pattern.exec(content)) !== null) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            violations.push({
                file: filePath,
                line: lineNum,
                rule: 'legacy-model',
                severity: 'warning',
                message: `Legacy model "${legacy.model}" detected. Replace with "${legacy.replacement}" for lower cost and carbon.`,
                model: legacy.model
            });
        }
    }

    return violations;
}

// ─── Main Scanner ───────────────────────────────────────────────

function loadConfig(projectRoot: string): AstraConfig {
    const configPath = path.join(projectRoot, '.astra.json');
    if (!fs.existsSync(configPath)) {
        console.log('⚠️  No .astra.json found. Using default thresholds.');
        return {
            ci: {
                maxCarbonPerPR: 50,  // 50 gCO2e default
                maxCostPerPR: 1.0,   // $1 default
            }
        };
    }

    try {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config: AstraConfig = JSON.parse(raw);
        console.log('📋 Loaded .astra.json configuration');
        return config;
    } catch (e) {
        console.error('❌ Failed to parse .astra.json:', e);
        process.exit(2);
    }
}

function scan(projectRoot: string): CIScanResult {
    const config = loadConfig(projectRoot);
    const excludePaths = config.ci?.excludePaths || [];

    console.log(`\n🔍 Scanning: ${projectRoot}`);
    console.log('━'.repeat(60));

    const files = getAllFiles(projectRoot, excludePaths);
    console.log(`📁 Found ${files.length} files to scan\n`);

    let totalCarbon = 0;
    let totalCost = 0;
    let apiCallsFound = 0;
    const allViolations: CIViolation[] = [];

    for (const filePath of files) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const relativePath = path.relative(projectRoot, filePath);

            // 1. Detect models and calculate carbon/cost
            const { calls } = detectModels(content, relativePath);
            apiCallsFound += calls.length;

            for (const call of calls) {
                totalCarbon += call.carbon;
                totalCost += call.cost;
            }

            // 2. Check model tier policy
            const modelViolations = checkModelPolicy(calls, relativePath, config);
            allViolations.push(...modelViolations);

            // 3. Check cloud regions
            const regionViolations = checkRegions(content, relativePath, config);
            allViolations.push(...regionViolations);

            // 4. Check legacy/deprecated models
            const legacyViolations = checkLegacyModels(content, relativePath);
            allViolations.push(...legacyViolations);

        } catch (e) {
            // Skip unreadable files
        }
    }

    // ─── Budget Threshold Check ─────────────────────────────────

    const maxCarbon = config.ci?.maxCarbonPerPR ?? config.carbonBudget?.perCommit ?? 50;
    const maxCost = config.ci?.maxCostPerPR ?? 1.0;

    if (totalCarbon > maxCarbon) {
        allViolations.push({
            file: '.astra.json',
            line: 0,
            rule: 'carbon-budget-exceeded',
            severity: 'error',
            message: `Total carbon footprint (${totalCarbon.toFixed(2)} gCO2e) exceeds PR budget of ${maxCarbon} gCO2e.`,
            estimatedCarbon: totalCarbon
        });
    }

    if (totalCost > maxCost) {
        allViolations.push({
            file: '.astra.json',
            line: 0,
            rule: 'cost-budget-exceeded',
            severity: 'error',
            message: `Total estimated cost ($${totalCost.toFixed(4)}) exceeds PR budget of $${maxCost.toFixed(2)}.`,
            estimatedCost: totalCost
        });
    }

    // ─── Determine Pass/Fail ────────────────────────────────────

    const errors = allViolations.filter(v => v.severity === 'error');
    const warnings = allViolations.filter(v => v.severity === 'warning');
    const failOnWarning = config.ci?.failOnWarning ?? false;

    const passed = errors.length === 0 && (!failOnWarning || warnings.length === 0);

    // ─── Build Summary ──────────────────────────────────────────

    const summary = buildSummary(totalCarbon, totalCost, maxCarbon, maxCost, apiCallsFound, files.length, allViolations, passed);

    return {
        passed,
        totalCarbon,
        totalCost,
        violations: allViolations,
        filesScanned: files.length,
        apiCallsFound,
        summary
    };
}

function buildSummary(
    totalCarbon: number, totalCost: number,
    maxCarbon: number, maxCost: number,
    apiCalls: number, filesScanned: number,
    violations: CIViolation[], passed: boolean
): string {
    const errors = violations.filter(v => v.severity === 'error').length;
    const warnings = violations.filter(v => v.severity === 'warning').length;

    const carbonBar = buildProgressBar(totalCarbon, maxCarbon);
    const costBar = buildProgressBar(totalCost, maxCost);

    let summary = `
## 🌿 Astra Carbon Budget Report

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| 🌱 Carbon | ${totalCarbon.toFixed(2)} gCO2e | ${maxCarbon} gCO2e | ${totalCarbon <= maxCarbon ? '✅ Pass' : '❌ Over'} |
| 💰 Cost | $${totalCost.toFixed(4)} | $${maxCost.toFixed(2)} | ${totalCost <= maxCost ? '✅ Pass' : '❌ Over'} |

**Carbon:** ${carbonBar}
**Cost:** ${costBar}

📁 Files scanned: ${filesScanned}
🔗 API calls found: ${apiCalls}
❌ Errors: ${errors}
⚠️ Warnings: ${warnings}
`;

    if (violations.length > 0) {
        summary += `\n### Violations\n\n`;
        summary += `| Severity | File | Line | Rule | Message |\n`;
        summary += `|----------|------|------|------|---------|\n`;

        for (const v of violations.slice(0, 20)) { // Limit to 20 in summary
            const icon = v.severity === 'error' ? '❌' : v.severity === 'warning' ? '⚠️' : 'ℹ️';
            summary += `| ${icon} | \`${v.file}\` | ${v.line} | ${v.rule} | ${v.message} |\n`;
        }

        if (violations.length > 20) {
            summary += `\n_...and ${violations.length - 20} more violations._\n`;
        }
    }

    summary += `\n---\n${passed ? '### ✅ Astra Check Passed' : '### ❌ Astra Check Failed'}\n`;

    return summary;
}

function buildProgressBar(current: number, max: number): string {
    const percent = Math.min(100, (current / max) * 100);
    const filled = Math.round(percent / 5);
    const empty = 20 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `\`${bar}\` ${percent.toFixed(0)}%`;
}

// ─── CLI Entry Point ────────────────────────────────────────────

function main() {
    console.log('');
    console.log('🌿 Astra CI - Carbon Budget Checker v0.1.0');
    console.log('━'.repeat(60));

    const projectRoot = process.argv[2] || process.cwd();

    if (!fs.existsSync(projectRoot)) {
        console.error(`❌ Project root not found: ${projectRoot}`);
        process.exit(2);
    }

    const result = scan(projectRoot);

    // Print report
    console.log('\n' + '━'.repeat(60));
    console.log('📊 SCAN RESULTS');
    console.log('━'.repeat(60));
    console.log(`  Files scanned:   ${result.filesScanned}`);
    console.log(`  API calls found: ${result.apiCallsFound}`);
    console.log(`  Carbon total:    ${result.totalCarbon.toFixed(2)} gCO2e`);
    console.log(`  Cost total:      $${result.totalCost.toFixed(4)}`);
    console.log(`  Violations:      ${result.violations.length}`);
    console.log('');

    // Print violations
    const errors = result.violations.filter(v => v.severity === 'error');
    const warnings = result.violations.filter(v => v.severity === 'warning');

    if (errors.length > 0) {
        console.log('❌ ERRORS:');
        for (const v of errors) {
            console.log(`  ${v.file}:${v.line} [${v.rule}] ${v.message}`);
        }
        console.log('');
    }

    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:');
        for (const v of warnings) {
            console.log(`  ${v.file}:${v.line} [${v.rule}] ${v.message}`);
        }
        console.log('');
    }

    // Write GitHub Actions summary if available
    if (process.env.GITHUB_STEP_SUMMARY) {
        try {
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, result.summary);
            console.log('📝 Report written to GitHub Actions Summary');
        } catch (e) {
            console.warn('⚠️  Could not write to GITHUB_STEP_SUMMARY');
        }
    }

    // Write report to file for PR comments
    const reportPath = path.join(projectRoot, '.astra-report.md');
    fs.writeFileSync(reportPath, result.summary, 'utf-8');
    console.log(`📝 Report saved to ${reportPath}`);

    // Final verdict
    console.log('');
    console.log('━'.repeat(60));
    if (result.passed) {
        console.log('✅ ASTRA CHECK PASSED - Within carbon budget');
    } else {
        console.log('❌ ASTRA CHECK FAILED - Budget violations detected');
    }
    console.log('━'.repeat(60));
    console.log('');

    process.exit(result.passed ? 0 : 1);
}

// Export for testing
export { scan, loadConfig, CIScanResult, CIViolation, AstraConfig };

// Run if called directly
main();
