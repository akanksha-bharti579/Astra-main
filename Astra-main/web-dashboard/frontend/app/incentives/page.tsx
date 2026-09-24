"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getLeaderboard, getAllBadges } from "@/lib/api";
import type { LeaderboardEntry, BadgeDefinition } from "@/lib/types";
import {
  ArrowLeft, Trophy, Award, Sparkles, ArrowRight,
  Medal, TrendingUp, Leaf, Star, Coins, Crown,
  Shield, Hexagon, Gift,
} from "lucide-react";

/* ── Podium bar ─────────────────────────────────────── */
function PodiumUser({ entry, medal, height, color }: { entry: LeaderboardEntry; medal: string; height: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2 animate-fade-in-up">
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-2xl shadow-lg`}>
        {medal}
      </div>
      <span className="text-sm font-bold text-[var(--foreground)] truncate max-w-[100px]">{entry.user_id}</span>
      <span className="text-xs text-amber-400 font-semibold">{entry.total_points.toLocaleString()} pts</span>
      <div className={`w-24 ${height} rounded-t-xl bg-gradient-to-t ${color} flex items-end justify-center pb-3`}>
        <span className="text-lg font-black text-white/80">#{entry.rank}</span>
      </div>
    </div>
  );
}

export default function IncentivesPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [badges, setBadges] = useState<BadgeDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [lb, bg] = await Promise.all([
        getLeaderboard(15).catch(() => []),
        getAllBadges().catch(() => []),
      ]);
      setLeaderboard(lb);
      setBadges(bg);
    } catch { /* */ } finally { setLoading(false); }
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="flex flex-col h-screen overflow-y-auto bg-[var(--background)]">

      {/* ── Header ─────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--background-secondary)]/80 backdrop-blur-xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[var(--foreground)]">Green Score</h1>
          </div>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/carbon" className="text-[var(--foreground-secondary)] hover:text-emerald-400 transition-colors">Carbon Reports</Link>
            <Link href="/registry" className="text-[var(--foreground-secondary)] hover:text-blue-400 transition-colors">Registry</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow relative">

        {/* Floating orbs */}
        <div className="floating-orb floating-orb-1" style={{ top: "10%", left: "5%", background: "radial-gradient(circle, rgba(245,158,11,0.5), transparent 70%)" }} />
        <div className="floating-orb floating-orb-3" style={{ top: "50%", right: "5%" }} />

        <div className="relative z-10 px-6 py-12 max-w-7xl mx-auto space-y-14">

          {/* ── Hero ──────────────────────────── */}
          <div className="text-center space-y-4 animate-fade-in-up">
            <div className="inline-flex items-center gap-2 value-pill text-xs text-amber-400 mb-2">
              <Coins className="w-3 h-3" /> ERC-20 GRN Tokens · ERC-721 NFT Badges
            </div>
            <h2 className="text-5xl font-extrabold text-[var(--foreground)] leading-tight tracking-tight">
              Green Compute{" "}
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 bg-clip-text text-transparent glow-text-amber">
                Incentive Tokens
              </span>
            </h2>
            <p className="text-lg text-[var(--foreground-secondary)] max-w-2xl mx-auto leading-relaxed">
              Reduce your carbon footprint, earn green points, and claim on-chain ERC-20 tokens and NFT achievement badges.
            </p>
          </div>

          {/* ── How It Works ─────────────────── */}
          <div className="glass rounded-2xl border border-[var(--glass-border)] p-8 blockchain-hero-gradient animate-fade-in-up stagger-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: Leaf, num: "01", title: "Reduce Carbon", desc: "Optimize your architecture to pick greener regions and efficient components", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { icon: Star, num: "02", title: "Earn Points", desc: "Every carbon reduction awards green points based on improvement percentage", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                { icon: Gift, num: "03", title: "Claim Rewards", desc: "Convert points to GRN tokens or unlock exclusive NFT achievement badges", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
              ].map((s) => (
                <div key={s.num} className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl ${s.bg} border flex items-center justify-center shrink-0 relative`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-white/10 rounded-full w-5 h-5 flex items-center justify-center text-[var(--foreground-secondary)]">
                      {s.num}
                    </span>
                  </div>
                  <div>
                    <h5 className="font-bold text-[var(--foreground)] text-sm mb-1">{s.title}</h5>
                    <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── Left: Badge Showcase ────────── */}
            <div className="lg:col-span-4 space-y-5">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">NFT Badges</h3>
                <span className="value-pill text-[10px] text-[var(--foreground-secondary)] ml-auto">{badges.length} available</span>
              </div>
              <div className="space-y-3">
                {badges.map((badge, i) => (
                  <div key={badge.badge_id}
                    className={`glass rounded-2xl p-4 border border-[var(--glass-border)] card-glow card-glow-purple hover:border-purple-500/25 animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                    <div className="flex items-center gap-3">
                      <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        {badge.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[var(--foreground)] text-sm truncate">{badge.name}</h4>
                        <p className="text-[11px] text-[var(--foreground-secondary)] line-clamp-2">{badge.description}</p>
                        {badge.threshold_points && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500" style={{ width: "0%" }} />
                            </div>
                            <span className="text-[10px] text-amber-400 font-medium shrink-0">{badge.threshold_points} pts</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {badges.length === 0 && !loading && (
                  <div className="glass rounded-2xl p-10 border border-[var(--glass-border)] text-center blockchain-hero-gradient">
                    <Hexagon className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
                    <p className="text-sm text-[var(--foreground-secondary)]">Badges load when the backend is running</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Leaderboard ─────────── */}
            <div className="lg:col-span-8 space-y-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-[var(--foreground)]">Global Leaderboard</h3>
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((n) => (
                    <div key={n} className="glass rounded-2xl p-6 border border-[var(--glass-border)] animate-pulse h-16" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="glass rounded-2xl p-16 border border-[var(--glass-border)] text-center blockchain-hero-gradient">
                  <div className="relative inline-block mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
                      <Trophy className="w-10 h-10 text-amber-400/50" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Crown className="w-3 h-3 text-amber-400" />
                    </div>
                  </div>
                  <h4 className="text-xl font-bold text-[var(--foreground)] mb-2">No Rankings Yet</h4>
                  <p className="text-[var(--foreground-secondary)] mb-6 max-w-md mx-auto">
                    Generate carbon reports and optimize your architectures to climb the leaderboard!
                  </p>
                  <Link href="/sandbox/new"
                    className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300">
                    Start Building <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Podium for Top 3 */}
                  {top3.length >= 3 && (
                    <div className="glass rounded-2xl border border-[var(--glass-border)] p-8 blockchain-hero-gradient">
                      <div className="flex items-end justify-center gap-6">
                        <PodiumUser entry={top3[1]} medal="🥈" height="h-24" color="from-gray-400/20 to-gray-500/10" />
                        <PodiumUser entry={top3[0]} medal="🥇" height="h-32" color="from-amber-400/20 to-amber-500/10" />
                        <PodiumUser entry={top3[2]} medal="🥉" height="h-20" color="from-orange-400/20 to-orange-500/10" />
                      </div>
                    </div>
                  )}

                  {/* Table for rest */}
                  <div className="glass rounded-2xl border border-[var(--glass-border)] overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left px-5 py-3.5 text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">Rank</th>
                          <th className="text-left px-5 py-3.5 text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">Developer</th>
                          <th className="text-right px-5 py-3.5 text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">Points</th>
                          <th className="text-right px-5 py-3.5 text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">Carbon Saved</th>
                          <th className="text-center px-5 py-3.5 text-[10px] uppercase tracking-wider font-medium text-[var(--foreground-secondary)]">Badges</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(top3.length < 3 ? leaderboard : rest).map((entry, i) => (
                          <tr key={entry.user_id}
                            className={`border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors animate-fade-in-up stagger-${Math.min(i + 1, 8)}`}>
                            <td className="px-5 py-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                                ${entry.rank <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-white/[0.04] text-[var(--foreground-secondary)]"}`}>
                                {entry.rank}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-medium text-[var(--foreground)]">{entry.user_id}</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="font-bold text-amber-400">{entry.total_points.toLocaleString()}</span>
                              <span className="text-[10px] text-[var(--foreground-secondary)] ml-1">pts</span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span className="font-medium text-emerald-400">{entry.carbon_saved_kg.toFixed(1)}</span>
                              <span className="text-[10px] text-[var(--foreground-secondary)] ml-1">kgCO₂</span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {entry.badges_count > 0 ? (
                                <span className="value-pill text-[10px] text-purple-400">
                                  {entry.badges_count} 🏅
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--foreground-secondary)]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
