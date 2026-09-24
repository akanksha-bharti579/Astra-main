"use client";

import React, { useMemo } from "react";
import { useArchitectureStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";
import { TrendingDown, Zap, Leaf } from "lucide-react";

const CARBON_FACTOR = 0.4;

export default function OptimizationGauge() {
    const { costEstimate, suggestions } = useArchitectureStore();

    const { currentCost, projectedCost, totalSavings, savingsPercent, currentCarbon, projectedCarbon } =
        useMemo(() => {
            const current = costEstimate.total;
            const savings = suggestions.reduce((sum, s) => sum + (s.savings || 0), 0);
            const projected = Math.max(0, current - savings);
            const percent = current > 0 ? Math.round((savings / current) * 100) : 0;
            return {
                currentCost: current,
                projectedCost: projected,
                totalSavings: savings,
                savingsPercent: percent,
                currentCarbon: Math.round(current * CARBON_FACTOR * 100) / 100,
                projectedCarbon: Math.round(projected * CARBON_FACTOR * 100) / 100,
            };
        }, [costEstimate.total, suggestions]);

    if (suggestions.length === 0 || totalSavings === 0) {
        return (
            <div className="glass rounded-xl p-6 border border-[var(--glass-border)] text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-[var(--background-tertiary)] rounded-full flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-[var(--foreground-secondary)]" />
                </div>
                <div className="text-sm text-[var(--foreground-secondary)]">
                    No optimization suggestions yet
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                    Add components and check the Tips tab
                </div>
            </div>
        );
    }

    // Donut chart data: projected (remaining) vs savings
    const donutData = [
        { name: "Projected", value: projectedCost },
        { name: "Savings", value: totalSavings },
    ];

    const COLORS = ["#6366f1", "#10b981"];

    return (
        <div className="space-y-3">
            <div className="glass rounded-xl p-4 border border-[var(--glass-border)]">
                <div className="text-sm font-semibold text-[var(--foreground)] mb-3">
                    Optimization Impact
                </div>
                <p className="text-xs text-[var(--foreground-secondary)] mb-4">
                    Projected savings if all {suggestions.length} suggestion{suggestions.length !== 1 ? "s" : ""} are applied
                </p>

                {/* Donut gauge */}
                <div className="relative mx-auto" style={{ width: 180, height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={donutData}
                                cx="50%"
                                cy="50%"
                                innerRadius={55}
                                outerRadius={80}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {donutData.map((_, index) => (
                                    <Cell key={index} fill={COLORS[index]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-emerald-400">
                            {savingsPercent}%
                        </span>
                        <span className="text-[10px] text-[var(--foreground-secondary)]">
                            potential savings
                        </span>
                    </div>
                </div>

                {/* Legend */}
                <div className="flex justify-center gap-4 mt-2 mb-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" />
                        <span className="text-[10px] text-[var(--foreground-secondary)]">Projected cost</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                        <span className="text-[10px] text-[var(--foreground-secondary)]">Savings</span>
                    </div>
                </div>
            </div>

            {/* Before / After cards */}
            <div className="grid grid-cols-2 gap-3">
                {/* Current */}
                <div className="glass rounded-xl p-3 border border-[var(--glass-border)]">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--foreground-secondary)] mb-2">
                        Current
                    </div>
                    <div className="text-lg font-bold text-[var(--foreground)]">
                        {formatCurrency(currentCost)}
                    </div>
                    <div className="text-xs text-[var(--foreground-secondary)] flex items-center gap-1 mt-1">
                        <Leaf className="w-3 h-3 text-emerald-400" />
                        {currentCarbon} kgCO₂
                    </div>
                </div>

                {/* Projected */}
                <div className="glass rounded-xl p-3 border border-emerald-500/20">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-400 mb-2">
                        After Optimization
                    </div>
                    <div className="text-lg font-bold text-emerald-400">
                        {formatCurrency(projectedCost)}
                    </div>
                    <div className="text-xs text-[var(--foreground-secondary)] flex items-center gap-1 mt-1">
                        <Leaf className="w-3 h-3 text-emerald-400" />
                        {projectedCarbon} kgCO₂
                    </div>
                </div>
            </div>

            {/* Savings summary */}
            <div className="glass rounded-xl p-3 border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                        <span className="text-sm font-semibold text-emerald-400">
                            Save {formatCurrency(totalSavings)}/mo
                        </span>
                        <span className="text-xs text-[var(--foreground-secondary)] ml-2">
                            ({Math.round((currentCarbon - projectedCarbon) * 100) / 100} kgCO₂ reduction)
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
