"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { listCarbonReports, getRegionCarbonData } from "@/lib/api";
import type { CarbonReportResponse } from "@/lib/types";
import {
  Leaf, ArrowLeft, Shield, CheckCircle2, Clock,
  Zap, Globe, TrendingDown, ExternalLink, ArrowRight,
  BarChart3, Lock, FileCheck2, Layers,
} from "lucide-react";

/* ── tiny circular gauge ────────────────────────────── */
function CircularGauge({ value, max, size = 80, color = "#10b981" }: { value: number; max: number; size?: number; color?: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} className="gauge-ring">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} />
    </svg>
  );
}

/* ── region bar ─────────────────────────────────────── */
function RegionBar({ region, intensity, maxIntensity }: { region: string; intensity: number; maxIntensity: number }) {
  const pct = Math.min((intensity / maxIntensity) * 100, 100);
  const color = intensity < 100 ? "bg-emerald-500" : intensity < 300 ? "bg-amber-500" : "bg-red-500";
  const textColor = intensity < 100 ? "text-emerald-400" : intensity < 300 ? "text-amber-400" : "text-red-400";
  return (
    <div className="group glass rounded-xl p-4 border border-[var(--glass-border)] card-glow card-glow-green hover:border-emerald-500/20 animate-fade-in-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--foreground)]">{region}</span>
        <span className={`text-lg font-bold ${textColor}`}>{intensity}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[10px] text-[var(--foreground-secondary)] mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        gCO₂/kWh
      </p>
    </div>
  );
}

export default function CarbonPage() {
  const [reports, setReports] = useState<CarbonReportResponse[]>([]);
  const [regionData, setRegionData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [reportsData, regions] = await Promise.all([
        listCarbonReports(10).catch(() => []),
        getRegionCarbonData().catch(() => ({})),
      ]);
      setReports(reportsData);
      setRegionData(regions);
    } catch { /* empty */ } finally { setLoading(false); }
  }

  const sortedRegions = useMemo(() =>
    Object.entries(regionData)
      .filter(([k]) => k !== "default")
      .sort((a, b) => a[1] - b[1])
      .slice(0, 12),
    [regionData],
  );
  const maxIntensity = useMemo(() => Math.max(...sortedRegions.map(([, v]) => v), 1), [sortedRegions]);

  const totalCarbon = reports.reduce((s, r) => s + (r.report?.metrics?.carbon_kg || 0), 0);
  const totalEnergy = reports.reduce((s, r) => s + (r.report?.metrics?.energy_kwh || 0), 0);
  const verifiedCount = reports.filter((r) => r.verified).length;

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--background)]">

      {/* ── Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background-secondary)]/80 backdrop-blur-xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Carbon Reports</h1>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/incentives" className="text-[var(--foreground-secondary)] hover:text-amber-400 transition-colors">Green Score</Link>
            <Link href="/registry" className="text-[var(--foreground-secondary)] hover:text-blue-400 transition-colors">Registry</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative">

        {/* Floating orbs */}
        <div className="floating-orb floating-orb-1" style={{ top: "5%", right: "10%" }} />
        <div className="floating-orb floating-orb-2" style={{ top: "60%", left: "5%" }} />

        <div className="relative z-10 px-6 py-12 max-w-7xl mx-auto space-y-14">

          {/* ── Hero ──────────────────────────────── */}
          <div className="text-center space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 value-pill text-xs text-emerald-400 mb-2">
              <Lock className="w-3 h-3" /> Ethereum Sepolia · Immutable
            </div>
            <h2 className="text-5xl font-extrabold text-[var(--foreground)] leading-tight tracking-tight">
              On-Chain{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 bg-clip-text text-transparent glow-text-green">
                Carbon Accountability
              </span>
            </h2>
            <p className="text-lg text-[var(--foreground-secondary)] max-w-2xl mx-auto leading-relaxed">
              Every architecture gets a SHA-256 hash, pinned to IPFS, and committed on Ethereum. Tamper-proof ESG reporting for auditable sustainability.
            </p>
          </div>

          {/* ── Stats Grid ────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Leaf, label: "Total CO₂", value: `${totalCarbon.toFixed(1)} kg`, color: "emerald", glow: "green" },
              { icon: Zap, label: "Total Energy", value: `${totalEnergy.toFixed(1)} kWh`, color: "blue", glow: "blue" },
              { icon: Shield, label: "On-Chain Verified", value: `${verifiedCount}`, color: "purple", glow: "purple" },
              { icon: BarChart3, label: "Total Reports", value: `${reports.length}`, color: "amber", glow: "amber" },
            ].map((s, i) => (
              <div key={s.label} className={`glass rounded-2xl p-5 border border-[var(--glass-border)] card-glow card-glow-${s.glow} animate-fade-in-up stagger-${i + 1}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-${s.color}-500/15 flex items-center justify-center`}>
                    <s.icon className={`w-5 h-5 text-${s.color}-400`} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-[var(--foreground-secondary)]">{s.label}</p>
                    <p className="text-2xl font-bold text-[var(--foreground)] animate-count">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Reports List ──────────────────────── */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[var(--foreground)]">Recent Reports</h3>
              {reports.length > 0 && (
                <span className="value-pill text-xs text-[var(--foreground-secondary)]">{reports.length} total</span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="glass rounded-2xl p-6 border border-[var(--glass-border)] animate-pulse h-28" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="glass rounded-2xl p-16 border border-[var(--glass-border)] text-center blockchain-hero-gradient">
                <div className="relative inline-block mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <FileCheck2 className="w-10 h-10 text-emerald-400/60" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center status-pulse">
                    <Zap className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-xl font-bold text-[var(--foreground)] mb-2">No Reports Yet</h4>
                <p className="text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
                  Design an architecture in the sandbox, then generate a carbon report to see immutable on-chain footprint data.
                </p>
                <Link href="/sandbox/new"
                  className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300">
                  Open Sandbox <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r, i) => (
                  <div key={r.report.report_id || i}
                    className={`glass rounded-2xl p-5 border border-[var(--glass-border)] card-glow card-glow-green hover:border-emerald-500/25 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Circular gauge */}
                        <div className="relative">
                          <CircularGauge value={r.report.metrics.carbon_kg} max={10} size={64} />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400">
                            {r.report.metrics.carbon_kg.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-[var(--foreground)]">
                              {r.report.metrics.carbon_kg.toFixed(2)} kgCO₂/mo
                            </span>
                            {r.verified ? (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 status-pulse">
                                <CheckCircle2 className="w-3 h-3" /> On-Chain
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--foreground-secondary)]">
                            <span className="value-pill text-[10px] mr-2">{r.report.metrics.energy_kwh.toFixed(2)} kWh</span>
                            <span className="value-pill text-[10px] mr-2">{r.report.metrics.region}</span>
                            <span className="value-pill text-[10px]">${r.report.metrics.cost_usd.toFixed(0)}/mo</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-xs text-[var(--foreground-secondary)]">
                        <span className="value-pill text-[10px]">{r.report.component_breakdown.length} components</span>
                        {r.on_chain?.tx_hash && (
                          <a href={`https://sepolia.etherscan.io/tx/${r.on_chain.tx_hash}`} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-end gap-1 mt-2 text-purple-400 hover:text-purple-300 transition-colors">
                            <ExternalLink className="w-3 h-3" /> Etherscan
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Component breakdown */}
                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                      {r.report.component_breakdown.slice(0, 4).map((c) => (
                        <div key={c.component_id} className="rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5">
                          <span className="text-xs font-medium text-[var(--foreground)]">{c.component_name}</span>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-[var(--foreground-secondary)]">
                            <span>{c.carbon_kg.toFixed(3)} kg</span>
                            <span className="w-px h-3 bg-white/10" />
                            <span>{c.power_draw_watts.toFixed(0)}W</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Region Map ────────────────────────── */}
          {sortedRegions.length > 0 && (
            <section className="space-y-5 animate-fade-in-up stagger-4">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-bold text-[var(--foreground)]">Region Carbon Intensity</h3>
                <span className="value-pill text-[10px] text-[var(--foreground-secondary)] ml-auto">{sortedRegions.length} regions</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedRegions.map(([region, intensity], i) => (
                  <RegionBar key={region} region={region} intensity={intensity} maxIntensity={maxIntensity} />
                ))}
              </div>
            </section>
          )}

          {/* ── How it works ──────────────────────── */}
          <section className="glass rounded-2xl border border-[var(--glass-border)] p-8 blockchain-hero-gradient animate-fade-in-up stagger-6">
            <h4 className="text-lg font-bold text-[var(--foreground)] mb-6 text-center">How On-Chain Accountability Works</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { step: "01", icon: Layers, title: "Design", desc: "Build architecture in the interactive sandbox", color: "text-teal-400" },
                { step: "02", icon: BarChart3, title: "Analyze", desc: "AI estimates energy draw & carbon per component", color: "text-emerald-400" },
                { step: "03", icon: Lock, title: "Hash & Pin", desc: "SHA-256 hash → IPFS via Pinata for permanent storage", color: "text-blue-400" },
                { step: "04", icon: Shield, title: "Commit", desc: "Hash committed on Ethereum Sepolia for immutability", color: "text-purple-400" },
              ].map((s) => (
                <div key={s.step} className="text-center space-y-3">
                  <div className="relative inline-block">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto">
                      <s.icon className={`w-6 h-6 ${s.color}`} />
                    </div>
                    <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-white/10 rounded-full w-5 h-5 flex items-center justify-center text-[var(--foreground-secondary)]">
                      {s.step}
                    </span>
                  </div>
                  <h5 className="font-semibold text-[var(--foreground)] text-sm">{s.title}</h5>
                  <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
