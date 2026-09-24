import { generateId } from "./utils";

const API_BASE_URL = "http://localhost:8000/api";

import { Scope } from "./types";

export interface ChatResponse {
    message: string;
    session_id: string;
    suggest_implementation: boolean;
    updated_architecture?: any;
    updated_scope?: Partial<Scope>;
    canvas_action?: "update" | "clear" | "none";
}

export interface ImplementResponse {
    updated_architecture: any;
    explanation: string;
}

/**
 * Send a message to the backend chat API
 */
export async function sendChatMessage(
    message: string,
    sessionId?: string,
    currentArchitecture?: any,
    chatWidth?: number
): Promise<ChatResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message,
                session_id: sessionId,
                architecture_json: currentArchitecture,
                chat_width: chatWidth || 600,  // Increased default width
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Chat API error:", error);
        throw error;
    }
}

/**
 * Request architecture implementation
 */
export async function implementArchitecture(
    request: string,
    sessionId: string,
    currentArchitecture: any
): Promise<ImplementResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/chat/implement`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                implementation_request: request,
                session_id: sessionId,
                architecture_json: currentArchitecture,
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Implementation API error:", error);
        throw error;
    }
}

/**
 * Clear chat session
 */
export async function clearSession(sessionId: string): Promise<void> {
    try {
        const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
            method: "DELETE",
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Clear session API error:", error);
        throw error;
    }
}

// ===== Sandbox API =====

export interface SandboxCreate {
    projectName: string;
    description?: string;
    architectureJson: any;
}

export interface SandboxResponse {
    sandboxId: string;
    projectName: string;
    description?: string;
    architectureJson: any;
    techStack: string[];
    totalCost: number;
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    views: number;
}

export interface SandboxListItem {
    sandboxId: string;
    projectName: string;
    description?: string;
    techStack: string[];
    totalCost: number;
    createdAt: string;
    views: number;
}

/**
 * Publish a new sandbox
 */
export async function publishSandbox(data: SandboxCreate): Promise<SandboxResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/sandboxes`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Publish sandbox API error:", error);
        throw error;
    }
}

/**
 * Get a sandbox by ID
 */
export async function getSandbox(sandboxId: string): Promise<SandboxResponse> {
    try {
        const response = await fetch(`${API_BASE_URL}/sandboxes/${sandboxId}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Sandbox not found");
            }
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Get sandbox API error:", error);
        throw error;
    }
}

/**
 * List public sandboxes
 */
export async function listSandboxes(params?: {
    search?: string;
    techStack?: string;
    minCost?: number;
    maxCost?: number;
    limit?: number;
    skip?: number;
}): Promise<SandboxListItem[]> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.techStack) queryParams.append("tech_stack", params.techStack);
        if (params?.minCost !== undefined) queryParams.append("min_cost", params.minCost.toString());
        if (params?.maxCost !== undefined) queryParams.append("max_cost", params.maxCost.toString());
        if (params?.limit) queryParams.append("limit", params.limit.toString());
        if (params?.skip) queryParams.append("skip", params.skip.toString());

        const url = `${API_BASE_URL}/sandboxes${queryParams.toString() ? `?${queryParams}` : ""}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("List sandboxes API error:", error);
        throw error;
    }
}

// ===== Document Upload API =====

export interface UploadDocumentResponse {
    filename: string;
    chunks_added: number;
    status: string;
}

/**
 * Upload a document (PDF, DOCX, TXT) to the RAG knowledge base
 */
export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/documents/upload`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `Upload failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Document upload API error:", error);
        throw error;
    }
}

export interface CanvasUploadResponse {
    filename: string;
    components_found: string[];
    architecture: any;
    status: string;
}

/**
 * Upload a document and generate an architecture diagram from it using Gemini
 */
export async function uploadToCanvas(file: File): Promise<CanvasUploadResponse> {
    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE_URL}/documents/upload-to-canvas`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `Upload failed: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Canvas upload API error:", error);
        throw error;
    }
}

// ==========================================
// Carbon Accountability API
// ==========================================

import type {
    CarbonReportResponse,
    SustainabilityScore,
    LeaderboardEntry,
    BadgeDefinition,
    RegistryEntry,
    RegistryStats,
} from "./types";

export async function generateCarbonReport(
    architectureJson: any,
    region: string = "us-east-1",
    userId?: string
): Promise<CarbonReportResponse> {
    const response = await fetch(`${API_BASE_URL}/carbon/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            architecture_json: architectureJson,
            region,
            user_id: userId,
        }),
    });
    if (!response.ok) throw new Error(`Carbon report failed: ${response.status}`);
    return response.json();
}

export async function getCarbonReport(reportId: string): Promise<CarbonReportResponse> {
    const response = await fetch(`${API_BASE_URL}/carbon/report/${reportId}`);
    if (!response.ok) throw new Error(`Get report failed: ${response.status}`);
    return response.json();
}

export async function commitReportOnChain(reportId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/carbon/report/${reportId}/commit`, {
        method: "POST",
    });
    if (!response.ok) throw new Error(`Commit failed: ${response.status}`);
    return response.json();
}

export async function verifyReport(reportHash: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/carbon/verify/${reportHash}`);
    if (!response.ok) throw new Error(`Verify failed: ${response.status}`);
    return response.json();
}

export async function listCarbonReports(limit = 20, skip = 0): Promise<CarbonReportResponse[]> {
    const response = await fetch(`${API_BASE_URL}/carbon/reports?limit=${limit}&skip=${skip}`);
    if (!response.ok) throw new Error(`List reports failed: ${response.status}`);
    return response.json();
}

export async function getRegionCarbonData(): Promise<Record<string, number>> {
    const response = await fetch(`${API_BASE_URL}/carbon/regions`);
    if (!response.ok) throw new Error(`Get regions failed: ${response.status}`);
    return response.json();
}

// ==========================================
// Incentive Token API
// ==========================================

export async function calculateSustainabilityScore(
    currentCarbonKg: number,
    previousCarbonKg?: number,
    region?: string,
    previousRegion?: string,
    userId?: string
): Promise<SustainabilityScore> {
    const response = await fetch(`${API_BASE_URL}/incentives/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            current_carbon_kg: currentCarbonKg,
            previous_carbon_kg: previousCarbonKg,
            region,
            previous_region: previousRegion,
            user_id: userId,
        }),
    });
    if (!response.ok) throw new Error(`Score failed: ${response.status}`);
    return response.json();
}

export async function getUserPoints(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/incentives/points/${userId}`);
    if (!response.ok) throw new Error(`Get points failed: ${response.status}`);
    return response.json();
}

export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
    const response = await fetch(`${API_BASE_URL}/incentives/leaderboard?limit=${limit}`);
    if (!response.ok) throw new Error(`Leaderboard failed: ${response.status}`);
    return response.json();
}

export async function getAllBadges(): Promise<BadgeDefinition[]> {
    const response = await fetch(`${API_BASE_URL}/incentives/badges`);
    if (!response.ok) throw new Error(`Get badges failed: ${response.status}`);
    return response.json();
}

export async function getUserBadges(userId: string): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/incentives/badges/${userId}`);
    if (!response.ok) throw new Error(`Get user badges failed: ${response.status}`);
    return response.json();
}

export async function claimReward(
    userId: string,
    walletAddress: string,
    claimType: "tokens" | "badge",
    badgeId?: string,
    tokenAmount?: number
): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/incentives/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            user_id: userId,
            wallet_address: walletAddress,
            claim_type: claimType,
            badge_id: badgeId,
            token_amount: tokenAmount,
        }),
    });
    if (!response.ok) throw new Error(`Claim failed: ${response.status}`);
    return response.json();
}

// ==========================================
// Carbon Registry API
// ==========================================

export async function getRegistryEntries(
    entryType?: string,
    status?: string,
    search?: string,
    limit = 20,
    skip = 0
): Promise<RegistryEntry[]> {
    const params = new URLSearchParams();
    if (entryType) params.set("entry_type", entryType);
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    params.set("limit", String(limit));
    params.set("skip", String(skip));

    const response = await fetch(`${API_BASE_URL}/registry/entries?${params}`);
    if (!response.ok) throw new Error(`Registry list failed: ${response.status}`);
    return response.json();
}

export async function submitRegistryEntry(
    entryType: string,
    data: { name: string; description: string; value: number; unit: string; source?: string },
    submitter = "anonymous"
): Promise<RegistryEntry> {
    const response = await fetch(`${API_BASE_URL}/registry/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry_type: entryType, data, submitter }),
    });
    if (!response.ok) throw new Error(`Submit failed: ${response.status}`);
    return response.json();
}

export async function voteOnEntry(entryId: string, voterId: string, vote: "approve" | "reject"): Promise<RegistryEntry> {
    const response = await fetch(`${API_BASE_URL}/registry/entries/${entryId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voter_id: voterId, vote }),
    });
    if (!response.ok) throw new Error(`Vote failed: ${response.status}`);
    return response.json();
}

export async function getRegistryBenchmarks(): Promise<RegistryEntry[]> {
    const response = await fetch(`${API_BASE_URL}/registry/benchmarks`);
    if (!response.ok) throw new Error(`Benchmarks failed: ${response.status}`);
    return response.json();
}

export async function getRegistryRegions(): Promise<RegistryEntry[]> {
    const response = await fetch(`${API_BASE_URL}/registry/regions`);
    if (!response.ok) throw new Error(`Regions failed: ${response.status}`);
    return response.json();
}

export async function getRegistryStats(): Promise<RegistryStats> {
    const response = await fetch(`${API_BASE_URL}/registry/stats`);
    if (!response.ok) throw new Error(`Stats failed: ${response.status}`);
    return response.json();
}
