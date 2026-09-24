"use client";

import React from "react";
import { useArchitectureStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend,
    Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

// Approximate carbon factor: kgCO₂ per dollar of cloud spend
// Based on average IEA data for cloud datacenters (~0.4 kgCO₂/$ is a reasonable heuristic)
const CARBON_FACTOR = 0.4;

interface ChartDataItem {
    name: string;
    cost: number;
    carbon: number;
    category: string;
}

export default function CostCarbonChart() {
    const { costEstimate } = useArchitectureStore();

    const data: ChartDataItem[] = costEstimate.breakdown.map((item) => ({
        name: item.component.length > 14 ? item.component.slice(0, 12) + "…" : item.component,
        fullName: item.component,
        cost: Math.round(item.scaledCost * 100) / 100,
        carbon: Math.round(item.scaledCost * CARBON_FACTOR * 100) / 100,
        category: item.category,
    }));

    // Sort by cost descending
    data.sort((a, b) => b.cost - a.cost);

    if (data.length === 0) {
        return (
            <div className="glass rounded-xl p-8 border border-[var(--glass-border)] text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-[var(--background-tertiary)] rounded-full flex items-center justify-center mb-3">
                    <BarChart3 className="w-6 h-6 text-[var(--foreground-secondary)]" />
                </div>
                <div className="text-sm text-[var(--foreground-secondary)]">
                    Add components to see cost vs carbon
                </div>
            </div>
        );
    }

    const totalCost = costEstimate.total;
    const totalCarbon = Math.round(totalCost * CARBON_FACTOR * 100) / 100;

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const d = payload[0]?.payload;
        return (
            <div className="glass rounded-lg border border-[var(--glass-border)] p-3 shadow-lg backdrop-blur-xl">
                <p className="text-sm font-semibold text-[var(--foreground)] mb-1">
                    {d.fullName || d.name}
                </p>
                <p className="text-xs text-[var(--foreground-secondary)] capitalize mb-2">
                    {d.category}
                </p>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
                        <span className="text-xs text-[var(--foreground)]">
                            {formatCurrency(d.cost)}/mo
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-xs text-[var(--foreground)]">
                            {d.carbon} kgCO₂
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-3">
            {/* Summary stat */}
            <div className="glass rounded-xl p-4 border border-[var(--glass-border)]">
                <div className="text-xs text-[var(--foreground-secondary)] mb-1">
                    Estimated Monthly Impact
                </div>
                <div className="flex items-baseline gap-4">
                    <div>
                        <span className="text-2xl font-bold text-[var(--foreground)]">
                            {formatCurrency(totalCost)}
                        </span>
                        <span className="text-xs text-[var(--foreground-secondary)] ml-1">cost</span>
                    </div>
                    <div className="text-[var(--foreground-secondary)]">·</div>
                    <div>
                        <span className="text-2xl font-bold text-emerald-400">
                            {totalCarbon}
                        </span>
                        <span className="text-xs text-[var(--foreground-secondary)] ml-1">kgCO₂</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="glass rounded-xl p-4 border border-[var(--glass-border)]">
                <div className="text-sm font-semibold text-[var(--foreground)] mb-3">
                    Cost vs Carbon by Component
                </div>
                <ResponsiveContainer width="100%" height={Math.max(200, data.length * 45 + 60)}>
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                        barGap={2}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                            horizontal={false}
                        />
                        <XAxis
                            type="number"
                            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                            axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                            tickLine={false}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                        <Legend
                            wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}
                            iconType="circle"
                            iconSize={8}
                        />
                        <Bar
                            dataKey="cost"
                            name="Cost ($)"
                            fill="#8b5cf6"
                            radius={[0, 4, 4, 0]}
                            barSize={14}
                        />
                        <Bar
                            dataKey="carbon"
                            name="Carbon (kgCO₂)"
                            fill="#10b981"
                            radius={[0, 4, 4, 0]}
                            barSize={14}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
