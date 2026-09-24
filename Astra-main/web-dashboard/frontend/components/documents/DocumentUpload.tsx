"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Sparkles } from "lucide-react";
import { uploadDocument, uploadToCanvas, UploadDocumentResponse } from "@/lib/api";
import { useArchitectureStore } from "@/lib/store";

interface UploadedFile {
    name: string;
    chunks?: number;
    components?: string[];
    status: "success" | "error";
    mode: "knowledge" | "canvas";
    message?: string;
}

export default function DocumentUpload() {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadMode, setUploadMode] = useState<"knowledge" | "canvas">("canvas");
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { setNodes, setEdges } = useArchitectureStore();

    const handleFile = useCallback(async (file: File) => {
        const allowed = [".pdf", ".docx", ".doc", ".txt"];
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            setUploadedFiles((prev) => [
                { name: file.name, status: "error", mode: uploadMode, message: `Unsupported type: ${ext}` },
                ...prev,
            ]);
            return;
        }

        setIsUploading(true);
        try {
            if (uploadMode === "canvas") {
                // Upload & Visualize — generates architecture on canvas
                const result = await uploadToCanvas(file);
                if (result.architecture) {
                    setNodes(result.architecture.nodes || []);
                    setEdges(result.architecture.edges || []);
                }
                setUploadedFiles((prev) => [
                    {
                        name: result.filename,
                        components: result.components_found,
                        status: "success",
                        mode: "canvas",
                    },
                    ...prev,
                ]);
            } else {
                // Upload to Knowledge Base — for chat context
                const result: UploadDocumentResponse = await uploadDocument(file);
                setUploadedFiles((prev) => [
                    { name: result.filename, chunks: result.chunks_added, status: "success", mode: "knowledge" },
                    ...prev,
                ]);
            }
        } catch (error) {
            setUploadedFiles((prev) => [
                {
                    name: file.name,
                    status: "error",
                    mode: uploadMode,
                    message: error instanceof Error ? error.message : "Upload failed",
                },
                ...prev,
            ]);
        } finally {
            setIsUploading(false);
        }
    }, [uploadMode, setNodes, setEdges]);

    const onDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
        },
        [handleFile]
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback(() => setIsDragging(false), []);

    const onFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
        },
        [handleFile]
    );

    const clearHistory = () => setUploadedFiles([]);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[var(--primary)]" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            Document Upload
                        </h3>
                    </div>
                    <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                        PDF, DOCX, or TXT
                    </p>
                </div>
                {uploadedFiles.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--destructive)] transition-colors"
                        title="Clear history"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Mode Toggle */}
            <div className="px-4 pt-3">
                <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                    <button
                        onClick={() => setUploadMode("canvas")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                            uploadMode === "canvas"
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--background)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Visualize
                    </button>
                    <button
                        onClick={() => setUploadMode("knowledge")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
                            uploadMode === "knowledge"
                                ? "bg-[var(--primary)] text-white"
                                : "bg-[var(--background)] text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                        }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        Knowledge Base
                    </button>
                </div>
                <p className="text-[10px] text-[var(--foreground-secondary)] mt-1.5 text-center">
                    {uploadMode === "canvas"
                        ? "Analyze doc → generate architecture on canvas"
                        : "Add content to AI chat knowledge base"}
                </p>
            </div>

            {/* Drop Zone */}
            <div className="p-4">
                <div
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        relative flex flex-col items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200
                        ${isDragging
                            ? "border-[var(--primary)] bg-[var(--primary)]/10 scale-[1.02]"
                            : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--background-tertiary)]"
                        }
                        ${isUploading ? "pointer-events-none opacity-60" : ""}
                    `}
                >
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
                    ) : uploadMode === "canvas" ? (
                        <Sparkles className="w-8 h-8 text-[var(--primary)]" />
                    ) : (
                        <Upload className="w-8 h-8 text-[var(--foreground-secondary)]" />
                    )}
                    <div className="text-center">
                        <p className="text-sm font-medium text-[var(--foreground)]">
                            {isUploading
                                ? uploadMode === "canvas" ? "Analyzing with AI..." : "Uploading..."
                                : "Drop file here or click"}
                        </p>
                        <p className="text-xs text-[var(--foreground-secondary)] mt-1">
                            PDF, DOCX, TXT
                        </p>
                    </div>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={onFileSelect}
                    className="hidden"
                />
            </div>

            {/* Upload History */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
                {uploadedFiles.map((file, i) => (
                    <div
                        key={`${file.name}-${i}`}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                            file.status === "success"
                                ? "border-[var(--success)]/30 bg-[var(--success)]/5"
                                : "border-[var(--error)]/30 bg-[var(--error)]/5"
                        }`}
                    >
                        {file.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-[var(--success)] mt-0.5 flex-shrink-0" />
                        ) : (
                            <AlertCircle className="w-4 h-4 text-[var(--error)] mt-0.5 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                {file.name}
                            </p>
                            <p className="text-xs text-[var(--foreground-secondary)]">
                                {file.status === "success"
                                    ? file.mode === "canvas"
                                        ? `${file.components?.length || 0} components → canvas`
                                        : `${file.chunks} chunks added`
                                    : file.message || "Upload failed"}
                            </p>
                            {file.status === "success" && file.mode === "canvas" && file.components && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {file.components.slice(0, 8).map((c) => (
                                        <span
                                            key={c}
                                            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]"
                                        >
                                            {c}
                                        </span>
                                    ))}
                                    {file.components.length > 8 && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]">
                                            +{file.components.length - 8} more
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
