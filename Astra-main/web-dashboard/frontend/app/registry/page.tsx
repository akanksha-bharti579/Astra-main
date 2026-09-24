"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  getRegistryEntries, getRegistryStats, submitRegistryEntry, voteOnEntry,
} from "@/lib/api";
import type { RegistryEntry, RegistryStats } from "@/lib/types";
import {
  ArrowLeft, Database, ThumbsUp, ThumbsDown, Plus, Shield,
  Search, Cpu, Globe, Layers, CheckCircle2, Clock, X, Send,
  TrendingUp, BarChart3, Users, Hash,
} from "lucide-react";

type TabType = "all" | "model_benchmark" | "region_metric" | "architecture_template";

/* ── Stat card ──────────────────────────────────────── */
function StatCard({ icon: Icon, value, label, color, delay }: {
  icon: React.ElementType; value: string | number; label: string; color: string; delay: number;
}) {
  return (
    <div className={`glass rounded-2xl p-5 border border-[var(--glass-border)] card-glow card-glow-${color} animate-fade-in-up`}
      style={{ animationDelay: `${delay * 0.05}s` }}>
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl bg-${color}-500/15 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-[var(--foreground)] animate-count">{value}</p>
          <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-secondary)]">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function RegistryPage() {
  const [entries, setEntries] = useState<RegistryEntry[]>([]);
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // Submit form state
  const [newType, setNewType] = useState("model_benchmark");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newUnit, setNewUnit] = useState("gCO2/kWh");
  const [newSource, setNewSource] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [activeTab, searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      const type = activeTab === "all" ? undefined : activeTab;
      const [e, s] = await Promise.all([
        getRegistryEntries(type, undefined, searchQuery || undefined, 30).catch(() => []),
        getRegistryStats().catch(() => null),
      ]);
      setEntries(e);
      setStats(s);
    } catch { /* */ } finally { setLoading(false); }
  }

  async function handleVote(entryId: string, vote: "approve" | "reject") {
    try {
      const updated = await voteOnEntry(entryId, `voter_${Date.now()}`, vote);
      setEntries((prev) => prev.map((e) => (e.entry_id === entryId ? updated : e)));
    } catch (e) { console.error("Vote failed:", e); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const entry = await submitRegistryEntry(newType, {
        name: newName, description: newDesc,
        value: parseFloat(newValue), unit: newUnit,
        source: newSource || undefined,
      });
      setEntries((prev) => [entry, ...prev]);
      setShowSubmitForm(false);
      setNewName(""); setNewDesc(""); setNewValue(""); setNewSource("");
    } catch (err) { console.error("Submit failed:", err); }
    finally { setSubmitting(false); }
  }

  const tabConfig = [
    { id: "all" as TabType, label: "All", icon: Database, count: stats?.total_entries },
    { id: "model_benchmark" as TabType, label: "AI Models", icon: Cpu, count: stats?.entry_types?.model_benchmark },
    { id: "region_metric" as TabType, label: "Regions", icon: Globe, count: stats?.entry_types?.region_metric },
    { id: "architecture_template" as TabType, label: "Templates", icon: Layers, count: stats?.entry_types?.architecture_template },
  ];

  const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
    model_benchmark: { icon: Cpu, color: "purple" },
    region_metric: { icon: Globe, color: "blue" },
    architecture_template: { icon: Layers, color: "emerald" },
  };

  const statusStyles: Record<string, string> = {
    verified: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    rejected: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--background)]">

      {/* ── Header ─────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background-secondary)]/80 backdrop-blur-xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Carbon Registry</h1>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/carbon" className="text-[var(--foreground-secondary)] hover:text-emerald-400 transition-colors">Carbon Reports</Link>
            <Link href="/incentives" className="text-[var(--foreground-secondary)] hover:text-amber-400 transition-colors">Green Score</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative">

        {/* Floating orbs */}
        <div className="floating-orb floating-orb-2" style={{ top: "5%", right: "8%" }} />
        <div className="floating-orb floating-orb-3" style={{ top: "55%", left: "3%" }} />

        <div className="relative z-10 px-6 py-12 max-w-7xl mx-auto space-y-10">

          {/* ── Hero ──────────────────────────── */}
          <div className="text-center space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 value-pill text-xs text-blue-400 mb-2">
              <Hash className="w-3 h-3" /> Community-Verified · On-Chain Hashable
            </div>
            <h2 className="text-5xl font-extrabold text-[var(--foreground)] leading-tight tracking-tight">
              Decentralized{" "}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent glow-text-blue">
                Carbon Data Registry
              </span>
            </h2>
            <p className="text-lg text-[var(--foreground-secondary)] max-w-2xl mx-auto leading-relaxed">
              Crowd-sourced and community-verified carbon benchmarks for AI models, cloud regions, and sustainable architecture patterns.
            </p>
          </div>

          {/* ── Stats ────────────────────────── */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Database} value={stats.total_entries} label="Total Entries" color="blue" delay={1} />
              <StatCard icon={CheckCircle2} value={stats.verified_entries} label="Verified" color="emerald" delay={2} />
              <StatCard icon={Clock} value={stats.pending_entries} label="Pending Review" color="amber" delay={3} />
              <StatCard icon={Users} value={stats.total_votes} label="Community Votes" color="purple" delay={4} />
            </div>
          )}

          {/* ── Controls ─────────────────────── */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fade-in-up stagger-3">
            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-2xl bg-[var(--background-secondary)] border border-[var(--border)]">
              {tabConfig.map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all duration-200
                    ${activeTab === tab.id
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-white/[0.03]"
                    }`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? "bg-white/20" : "bg-white/[0.06]"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Search + Submit */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-secondary)]" />
                <input type="text" placeholder="Search entries..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2.5 rounded-xl bg-[var(--background-secondary)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 w-48 transition-all" />
              </div>
              <button onClick={() => setShowSubmitForm(!showSubmitForm)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300">
                <Plus className="w-4 h-4" /> Submit
              </button>
            </div>
          </div>

          {/* ── Submit Form ──────────────────── */}
          {showSubmitForm && (
            <form onSubmit={handleSubmit}
              className="glass rounded-2xl p-6 border border-blue-500/20 animate-fade-in-up blockchain-hero-gradient">
              <div className="flex items-center justify-between mb-5">
                <h4 className="font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" /> Submit New Entry
                </h4>
                <button type="button" onClick={() => setShowSubmitForm(false)}
                  className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select value={newType} onChange={(e) => setNewType(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-blue-500/50">
                  <option value="model_benchmark">🤖 AI Model Benchmark</option>
                  <option value="region_metric">🌍 Region Metric</option>
                  <option value="architecture_template">🏗️ Architecture Template</option>
                </select>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g., GPT-5 Turbo)" required
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50" />
                <input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Value (e.g., 2.5)" type="number" step="any" required
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50" />
                <input value={newUnit} onChange={(e) => setNewUnit(e.target.value)} placeholder="Unit"
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50" />
                <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" required
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50 md:col-span-2" />
                <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Data source (optional)"
                  className="px-3 py-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--foreground-secondary)] focus:outline-none focus:border-blue-500/50" />
                <button type="submit" disabled={submitting}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 disabled:opacity-50">
                  <Send className="w-4 h-4" /> {submitting ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </form>
          )}

          {/* ── Entries Grid ─────────────────── */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="glass rounded-2xl p-6 border border-[var(--glass-border)] animate-pulse h-40" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="glass rounded-2xl p-16 border border-[var(--glass-border)] text-center blockchain-hero-gradient">
              <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                <Database className="w-10 h-10 text-blue-400/50" />
              </div>
              <h4 className="text-xl font-bold text-[var(--foreground)] mb-2">No Entries Found</h4>
              <p className="text-[var(--foreground-secondary)] max-w-md mx-auto">
                {searchQuery ? `No results for "${searchQuery}". Try a different search term.` : "Be the first to submit a carbon data entry to the registry!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {entries.map((entry, i) => {
                const typeInfo = typeIcons[entry.entry_type] || { icon: Database, color: "blue" };
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={entry.entry_id}
                    className={`glass rounded-2xl p-5 border border-[var(--glass-border)] card-glow card-glow-${typeInfo.color} hover:border-${typeInfo.color}-500/25 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>

                    {/* Top row: type + status */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg bg-${typeInfo.color}-500/15 flex items-center justify-center`}>
                          <TypeIcon className={`w-3.5 h-3.5 text-${typeInfo.color}-400`} />
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">
                          {entry.entry_type.replace("_", " ")}
                        </span>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border ${statusStyles[entry.status] || ""}`}>
                        {entry.status === "verified" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {entry.status}
                      </span>
                    </div>

                    {/* Name + description */}
                    <h4 className="font-bold text-[var(--foreground)] mb-1">{entry.data.name}</h4>
                    <p className="text-xs text-[var(--foreground-secondary)] line-clamp-2 mb-3">{entry.data.description}</p>

                    {/* Value + actions */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-extrabold text-[var(--foreground)]">{entry.data.value}</span>
                          <span className="text-xs text-[var(--foreground-secondary)]">{entry.data.unit}</span>
                        </div>
                        {entry.data.source && (
                          <p className="text-[10px] text-[var(--foreground-secondary)] mt-1 opacity-70 truncate max-w-[200px]">
                            📎 {entry.data.source}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleVote(entry.entry_id, "approve")}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/10 hover:border-emerald-500/20 transition-all duration-200">
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span className="font-semibold">{entry.votes_for}</span>
                        </button>
                        <button onClick={() => handleVote(entry.entry_id, "reject")}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/10 hover:border-red-500/20 transition-all duration-200">
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span className="font-semibold">{entry.votes_against}</span>
                        </button>
                        {entry.on_chain_hash && (
                          <span title="On-chain verified"
                            className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
                            <Shield className="w-3.5 h-3.5 text-purple-400" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
