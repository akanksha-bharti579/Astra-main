"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useArchitectureStore } from "@/lib/store";
import { Send, Bot, User, Trash2, Paperclip, X, FileText, Sparkles, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { generateId } from "@/lib/utils";
import { sendChatMessage, clearSession, uploadToCanvas, uploadDocument, UploadDocumentResponse } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface UploadedFileStatus {
    name: string;
    status: "success" | "error";
    message?: string;
}

export default function Chatbot() {
    const {
        chatMessages, addChatMessage, sessionId, setSessionId,
        nodes, edges, scope, clearChat, setNodes, setEdges, updateScope, loadFromFile
    } = useArchitectureStore();
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    // Upload state
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadMode, setUploadMode] = useState<"canvas" | "knowledge" | "import">("canvas");
    const [isUploading, setIsUploading] = useState(false);
    const [lastUploadStatus, setLastUploadStatus] = useState<UploadedFileStatus | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change or typing indicator appears
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages, isTyping]);

    const handleClear = async () => {
        if (chatMessages.length === 0) return;

        if (confirm("Are you sure you want to clear the conversation history?")) {
            try {
                if (sessionId) {
                    await clearSession(sessionId);
                }
                clearChat();
                setLastUploadStatus(null);
            } catch (error) {
                console.error("Failed to clear session:", error);
                clearChat();
            }
        }
    };

    const handleFile = useCallback(async (file: File) => {
        setLastUploadStatus(null);

        // JSON Import Logic
        if (uploadMode === "import") {
            if (!file.name.endsWith(".json")) {
                setLastUploadStatus({ name: file.name, status: "error", message: "Only .json files allowed for import" });
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    JSON.parse(content); // Validate
                    loadFromFile(content);
                    setLastUploadStatus({ name: file.name, status: "success", message: "Project imported successfully" });
                    setIsUploadOpen(false); // Close panel on success
                } catch (error) {
                    setLastUploadStatus({ name: file.name, status: "error", message: "Invalid JSON project file" });
                }
            };
            reader.readAsText(file);
            return;
        }

        // Document Upload Logic (Canvas / Knowledge)
        const allowed = [".pdf", ".docx", ".doc", ".txt"];
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        if (!allowed.includes(ext)) {
            setLastUploadStatus({ name: file.name, status: "error", message: `Unsupported type: ${ext}` });
            return;
        }

        setIsUploading(true);
        try {
            if (uploadMode === "canvas") {
                // Upload & Visualize
                const result = await uploadToCanvas(file);
                if (result.architecture) {
                    setNodes(result.architecture.nodes || []);
                    setEdges(result.architecture.edges || []);
                }
                setLastUploadStatus({
                    name: file.name,
                    status: "success",
                    message: `Generated ${result.components_found.length} components from doc`
                });
            } else {
                // Upload to Knowledge Base
                const result: UploadDocumentResponse = await uploadDocument(file);
                setLastUploadStatus({
                    name: file.name,
                    status: "success",
                    message: `Added to context (${result.chunks_added} chunks)`
                });
            }
        } catch (error) {
            setLastUploadStatus({
                name: file.name,
                status: "error",
                message: error instanceof Error ? error.message : "Upload failed"
            });
        } finally {
            setIsUploading(false);
        }
    }, [uploadMode, loadFromFile, setNodes, setEdges]);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = {
            id: generateId(),
            role: "user" as const,
            content: input,
            timestamp: Date.now(),
        };
        addChatMessage(userMessage);
        const currentInput = input;
        setInput("");
        setIsTyping(true);

        try {
            const currentArchitecture = { nodes, edges, scope };
            const chatWidth = chatContainerRef.current?.offsetWidth || 400;

            const response = await sendChatMessage(
                currentInput,
                sessionId,
                currentArchitecture,
                chatWidth
            );

            if (response.session_id && response.session_id !== sessionId) {
                setSessionId(response.session_id);
            }

            const aiMessage = {
                id: generateId(),
                role: "assistant" as const,
                content: response.message,
                timestamp: Date.now(),
            };
            addChatMessage(aiMessage);

            if (response.canvas_action === "update" && response.updated_architecture) {
                setNodes(response.updated_architecture.nodes || []);
                setEdges(response.updated_architecture.edges || []);
            } else if (response.canvas_action === "clear") {
                setNodes([]);
                setEdges([]);
            }

            if (response.updated_scope) {
                updateScope(response.updated_scope);
            }
        } catch (error) {
            console.error("Failed to get chat response:", error);
            const errorMessage = {
                id: generateId(),
                role: "assistant" as const,
                content: "Sorry, I'm having trouble connecting to the backend. Is it running?",
                timestamp: Date.now(),
            };
            addChatMessage(errorMessage);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div ref={chatContainerRef} className="flex flex-col h-full relative">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--background-secondary)] z-10">
                <div>
                    <div className="flex items-center gap-2">
                        <Bot className="w-5 h-5 text-[var(--primary)]" />
                        <h3 className="text-sm font-semibold text-[var(--foreground)]">
                            AI Assistant
                        </h3>
                    </div>
                </div>
                {chatMessages.length > 0 && (
                    <button
                        onClick={handleClear}
                        className="p-1.5 rounded-lg hover:bg-[var(--background-tertiary)] text-[var(--foreground-secondary)] hover:text-[var(--destructive)] transition-colors"
                        title="Clear conversation"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Collapsible Upload Section */}
            {isUploadOpen && (
                <div className="border-b border-[var(--border)] bg-[var(--background-secondary)] shadow-lg animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3 space-y-3">
                        {/* Mode Toggle */}
                        <div className="flex rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--background)]">
                            <button
                                onClick={() => setUploadMode("canvas")}
                                className={cn("flex-1 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1",
                                    uploadMode === "canvas" ? "bg-[var(--primary)] text-white" : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                                )}
                            >
                                <Sparkles className="w-3 h-3" /> Visualize
                            </button>
                            <button
                                onClick={() => setUploadMode("knowledge")}
                                className={cn("flex-1 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1",
                                    uploadMode === "knowledge" ? "bg-[var(--primary)] text-white" : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                                )}
                            >
                                <FileText className="w-3 h-3" /> Knowledge
                            </button>
                            <button
                                onClick={() => setUploadMode("import")}
                                className={cn("flex-1 py-1.5 text-[10px] font-medium transition-colors flex items-center justify-center gap-1",
                                    uploadMode === "import" ? "bg-[var(--primary)] text-white" : "text-[var(--foreground-secondary)] hover:bg-[var(--background-tertiary)]"
                                )}
                            >
                                <Upload className="w-3 h-3" /> Import
                            </button>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDrop={onDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors relative",
                                isUploading ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--background-tertiary)]"
                            )}
                        >
                            {isUploading ? (
                                <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin mx-auto" />
                            ) : (
                                <Upload className="w-6 h-6 text-[var(--foreground-secondary)] mx-auto" />
                            )}
                            <p className="text-xs text-[var(--foreground-secondary)] mt-2">
                                {isUploading ? "Processing..." : uploadMode === "import" ? "Drop .json project file" : "Drop PDF, DOCX, TXT"}
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={uploadMode === "import" ? ".json" : ".pdf,.docx,.doc,.txt"}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFile(file);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                }}
                                className="hidden"
                            />
                        </div>

                        {/* Status Message */}
                        {lastUploadStatus && (
                            <div className={cn("text-xs p-2 rounded flex items-center gap-2",
                                lastUploadStatus.status === "success" ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--error)]/10 text-[var(--error)]"
                            )}>
                                {lastUploadStatus.status === "success" ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                                <span className="truncate flex-1">{lastUploadStatus.message}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-[var(--primary)]" />
                        <p className="text-sm text-[var(--foreground-secondary)]">
                            Start a conversation to get architecture advice
                        </p>
                        <div className="mt-4 space-y-2">
                            <button
                                onClick={() => setInput("How should I structure my backend?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                💡 How should I structure my backend?
                            </button>
                            <button
                                onClick={() => setInput("How can I reduce costs?")}
                                className="block w-full text-left px-3 py-2 rounded-lg bg-[var(--background-tertiary)] hover:bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--foreground)] transition-colors"
                            >
                                💰 How can I reduce costs?
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {chatMessages.map((message) => (
                            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                {message.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                                        <Bot className="w-4 h-4 text-[var(--primary)]" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${message.role === "user" ? "bg-[#99f6e4] text-black" : "glass border border-[var(--glass-border)] text-[var(--foreground)]"}`}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            code: ({ inline, className, children, ...props }: any) => {
                                                const match = /language-(\w+)/.exec(className || "");
                                                return !inline && match ? (
                                                    <code className="block bg-black/30 p-2 rounded text-xs overflow-x-auto my-1" {...props}>{children}</code>
                                                ) : (
                                                    <code className="bg-black/20 px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                                                );
                                            }
                                        }}
                                    >
                                        {message.content}
                                    </ReactMarkdown>
                                </div>
                                {message.role === "user" && (
                                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-[var(--accent)]" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center flex-shrink-0">
                                    <Bot className="w-4 h-4 text-[var(--primary)]" />
                                </div>
                                <div className="glass border border-[var(--glass-border)] px-4 py-2 rounded-xl">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-secondary)] animate-pulse" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-secondary)] animate-pulse delay-100" />
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--foreground-secondary)] animate-pulse delay-200" />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--background-secondary)]">
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsUploadOpen(!isUploadOpen)}
                        className={cn(
                            "p-2 rounded-lg transition-colors flex-shrink-0 border",
                            isUploadOpen
                                ? "bg-[var(--primary)]/20 border-[var(--primary)] text-[var(--primary)]"
                                : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                        )}
                        title="Attach file / Import project"
                    >
                        <Paperclip className="w-4 h-4" />
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Ask about your architecture..."
                        className="flex-1 px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="px-3 py-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
