"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import CostEstimatePanel from "../cost/CostEstimatePanel";
import SmartSuggestions from "../suggestions/SmartSuggestions";
import Chatbot from "../chat/Chatbot";
import VisualsPanel from "../visuals/VisualsPanel";
import { DollarSign, Lightbulb, MessageSquare, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "cost" | "suggestions" | "chat" | "visuals";

interface RightSidebarProps {
    width: number;
    onWidthChange: (width: number) => void;
}

export default function RightSidebar({ width, onWidthChange }: RightSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>("cost");
    const [isDragging, setIsDragging] = useState(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const MIN_WIDTH = 320;
    const MAX_WIDTH = 600;

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setIsDragging(true);
            dragStartX.current = e.clientX;
            dragStartWidth.current = width;
        },
        [width]
    );

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const delta = dragStartX.current - e.clientX; // dragging left = wider
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta));
            onWidthChange(newWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, onWidthChange]);

    const tabs = [
        { id: "cost" as Tab, label: "Cost", icon: DollarSign },
        { id: "suggestions" as Tab, label: "Tips", icon: Lightbulb },
        { id: "chat" as Tab, label: "Chat", icon: MessageSquare },
        { id: "visuals" as Tab, label: "Visuals", icon: BarChart3 },
    ];

    return (
        <div className="h-full flex flex-row">
            {/* Drag handle */}
            <div
                onMouseDown={handleMouseDown}
                className={cn(
                    "w-1 flex-shrink-0 cursor-col-resize transition-colors group relative",
                    isDragging
                        ? "bg-[var(--primary)]"
                        : "bg-transparent hover:bg-[var(--primary)]/50"
                )}
            >
                {/* Wider invisible hit area */}
                <div className="absolute inset-y-0 -left-1.5 -right-1.5" />
            </div>

            {/* Sidebar content */}
            <div className="flex-1 flex flex-col bg-[var(--background-secondary)] border-l border-[var(--border)] min-w-0">
                {/* Tabs */}
                <div className="flex border-b border-[var(--border)]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors",
                                activeTab === tab.id
                                    ? "bg-[var(--background)] text-[var(--primary)] border-b-2 border-[var(--primary)]"
                                    : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--background-tertiary)]"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden">
                    {activeTab === "cost" && <CostEstimatePanel />}
                    {activeTab === "suggestions" && <SmartSuggestions />}
                    {activeTab === "chat" && <Chatbot />}
                    {activeTab === "visuals" && <VisualsPanel />}
                </div>
            </div>
        </div>
    );
}
