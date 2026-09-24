"use client";

import React from "react";
import CostCarbonChart from "./CostCarbonChart";
import OptimizationGauge from "./OptimizationGauge";

export default function VisualsPanel() {
    return (
        <div className="p-4 space-y-6 h-full overflow-y-auto">
            {/* Section: Cost vs Carbon */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        Cost vs Carbon
                    </h3>
                </div>
                <CostCarbonChart />
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Section: Optimization Impact */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">
                        Optimization Impact
                    </h3>
                </div>
                <OptimizationGauge />
            </div>
        </div>
    );
}
