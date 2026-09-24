import * as vscode from 'vscode';
import { llm_call } from './types';

export class CostDecorationProvider {
    // Decoration types for different cost tiers
    private lowCostDecoration: vscode.TextEditorDecorationType;
    private mediumCostDecoration: vscode.TextEditorDecorationType;
    private highCostDecoration: vscode.TextEditorDecorationType;

    constructor() {
        // Initialize decoration types with subtle background colors
        // We use rgba to ensure transparency and good contrast in both themes

        // Low Carbon: Fresh Green
        this.lowCostDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            isWholeLine: true,
            overviewRulerColor: 'rgba(76, 175, 80, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        // Medium Carbon: Amber/Yellow
        this.mediumCostDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 193, 7, 0.15)',
            isWholeLine: true,
            overviewRulerColor: 'rgba(255, 193, 7, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });

        // High Carbon: Burnt Orange/Brown
        this.highCostDecoration = vscode.window.createTextEditorDecorationType({
            backgroundColor: 'rgba(255, 87, 34, 0.2)',
            isWholeLine: true,
            overviewRulerColor: 'rgba(255, 87, 34, 0.6)',
            overviewRulerLane: vscode.OverviewRulerLane.Right
        });
    }

    /**
     * Update decorations for the active editor
     */
    public updateDecorations(editor: vscode.TextEditor, calls: llm_call[]) {
        if (!editor || !calls) return;

        const lowCostRanges: vscode.Range[] = [];
        const mediumCostRanges: vscode.Range[] = [];
        const highCostRanges: vscode.Range[] = [];

        const editorPath = editor.document.uri.fsPath;

        // Filter calls for this file
        const fileCalls = calls.filter(call => call.file_path === editorPath);

        for (const call of fileCalls) {
            // VS Code ranges are 0-indexed
            const range = new vscode.Range(
                call.line - 1,
                0,
                call.line - 1,
                editor.document.lineAt(Math.max(0, call.line - 1)).text.length
            );

            // Carbon Thresholds (gCO2e)
            const carbon = call.estimated_carbon || 0;

            if (carbon < 0.1) {
                lowCostRanges.push(range); // Low Carbon
            } else if (carbon < 1.0) {
                mediumCostRanges.push(range); // Medium Carbon
            } else {
                highCostRanges.push(range); // High Carbon
            }
        }

        // Apply decorations
        editor.setDecorations(this.lowCostDecoration, lowCostRanges);
        editor.setDecorations(this.mediumCostDecoration, mediumCostRanges);
        editor.setDecorations(this.highCostDecoration, highCostRanges);
    }

    public dispose() {
        this.lowCostDecoration.dispose();
        this.mediumCostDecoration.dispose();
        this.highCostDecoration.dispose();
    }
}
