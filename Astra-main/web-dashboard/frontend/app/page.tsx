"use client";

import React from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import SplashCursor from "@/components/SplashCursor";
import ClickSpark from "@/components/ClickSpark";
import RotatingText from "@/components/RotatingText";
import GradualBlur from "@/components/GradualBlur";
import { ArrowRight, Layers, DollarSign, Share2, Activity, Zap, ListOrdered } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="relative h-screen bg-[var(--background)] overflow-hidden">
      <div className="flex flex-col h-full overflow-y-auto w-full">
        <SplashCursor />

        <ClickSpark
          sparkColor="#fff"
          sparkSize={10}
          sparkRadius={15}
          sparkCount={8}
          duration={400}
        >
          {/* Header */}
          <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background-secondary)] px-6 py-4">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center">
                  <Logo className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-[var(--foreground)]">Astra Home</h1>
              </div>
              <Link
                href="/explore"
                className="text-sm text-[var(--foreground-secondary)] hover:text-[var(--primary)] transition-colors"
              >
                Explore Sandboxes
              </Link>
            </div>
          </header>

          {/* Main scrollable content */}
          <main className="flex-grow px-6 py-20">
            <div className="max-w-4xl mx-auto text-center space-y-8">

              {/* Hero Section */}
              <div className="space-y-4">
                <h2 className="text-5xl font-bold text-[var(--foreground)] leading-tight">
                  Design, Estimate, and Optimize
                  <br />
                  <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] bg-clip-text text-transparent">
                    Your Tech Stack
                  </span>
                </h2>
                <p className="text-xl text-[var(--foreground-secondary)] max-w-2xl mx-auto">
                  Build cloud architectures visually, get instant cost estimates, and share your designs with the community.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/sandbox/new"
                  className="group flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white font-semibold text-lg hover:shadow-[var(--shadow-glow)] transition-all duration-300"
                >
                  Enter Sandbox
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/explore"
                  className="flex items-center gap-2 px-8 py-4 rounded-xl border-2 border-[var(--border)] text-[var(--foreground)] font-semibold text-lg hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-300"
                >
                  Browse Sandboxes
                </Link>
              </div>


              {/* Blockchain Features */}
              <section className="space-y-6 mt-16">
                <div className="space-y-3 text-center">
                  <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[var(--foreground-secondary)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ethereum Sepolia · IPFS · Verifiable
                  </div>
                  <h3 className="text-3xl font-extrabold text-[var(--foreground)] text-center flex flex-col items-center gap-2 sm:block sm:gap-0">
                    Blockchain{" "}
                    <div className="inline-block relative">
                      <RotatingText
                        texts={['Sustainability', 'Transparency', 'Security']}
                        mainClassName="px-2 sm:px-2 md:px-3 bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent overflow-hidden py-0.5 sm:py-1 md:py-2 justify-center rounded-lg"
                        staggerFrom={"last"}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "-120%" }}
                        staggerDuration={0.025}
                        splitLevelClassName="overflow-hidden pb-0.5 sm:pb-1 md:pb-1"
                        transition={{ type: "spring", damping: 30, stiffness: 400 }}
                        rotationInterval={3000}
                      />
                    </div>
                  </h3>
                  <p className="text-[var(--foreground-secondary)] text-center max-w-2xl mx-auto">
                    Immutable carbon records, green incentive tokens, and decentralized data — all on-chain
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <Link href="/carbon" className="blockchain-card blockchain-card-green glass rounded-2xl p-7 border border-[var(--glass-border)] hover:border-emerald-500/30 group">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                      <Activity className="w-7 h-7 text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-1.5 group-hover:text-emerald-400 transition-colors">Carbon Reports</h3>
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed mb-4">
                      SHA-256 hashed, IPFS pinned, Ethereum verified carbon footprint records.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400/80">SHA-256</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400/80">IPFS</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400/80">Sepolia</span>
                    </div>
                  </Link>

                  <Link href="/incentives" className="blockchain-card blockchain-card-amber glass rounded-2xl p-7 border border-[var(--glass-border)] hover:border-amber-500/30 group">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                      <Zap className="w-7 h-7 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-1.5 group-hover:text-amber-400 transition-colors">Green Score</h3>
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed mb-4">
                      Earn green points and claim ERC-20 tokens & NFT achievement badges.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400/80">ERC-20</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400/80">NFT Badges</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400/80">Leaderboard</span>
                    </div>
                  </Link>

                  <Link href="/registry" className="blockchain-card blockchain-card-blue glass rounded-2xl p-7 border border-[var(--glass-border)] hover:border-blue-500/30 group">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                      <ListOrdered className="w-7 h-7 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-1.5 group-hover:text-blue-400 transition-colors">Carbon Registry</h3>
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed mb-4">
                      Community-verified carbon benchmarks for AI models and cloud regions.
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400/80">Crowd-Sourced</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400/80">Voted</span>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400/80">On-Chain</span>
                    </div>
                  </Link>
                </div>
              </section>

              {/* Sandbox Features */}
              <section className="space-y-4 mt-20">
                <h3 className="text-2xl font-bold text-[var(--foreground)] text-center">Sandbox Features</h3>
                <p className="text-[var(--foreground-secondary)] text-center max-w-2xl mx-auto mb-8">
                  Design and visualize your cloud architecture with our interactive sandbox
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                      <Layers className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Visual Design</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Drag and drop components to build your architecture. <br></br>No code required.
                    </p>
                  </div>

                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--secondary)]/20 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-[var(--secondary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Cost Estimation</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Get instant monthly cost breakdowns based on your<br></br>scale and traffic.
                    </p>
                  </div>

                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--accent)]/20 flex items-center justify-center">
                      <Share2 className="w-6 h-6 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Share & Explore</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Publish your designs<br></br> and discover architectures<br></br> from the community.
                    </p>
                  </div>
                </div>
              </section>

              {/* VSCode Extension Features */}
              <section className="space-y-4 mt-20">
                <h3 className="text-2xl font-bold text-[var(--foreground)] text-center">VSCode Extension</h3>
                <p className="text-[var(--foreground-secondary)] text-center max-w-2xl mx-auto mb-8">
                  Analyze your codebase and get real-time insights directly in your editor
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--success)]/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-[var(--success)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Visualize & Simulate<br></br>Cost Inline</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      See cost estimates directly in<br></br>your code as you build.
                    </p>
                  </div>

                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--warning)]/20 flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[var(--warning)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Get Optimization Suggestions</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Receive smart recommendations to improve your architecture.
                    </p>
                  </div>

                  <div className="glass rounded-xl p-6 border border-[var(--glass-border)] space-y-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--primary)]/20 flex items-center justify-center">
                      <ListOrdered className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-[var(--foreground)]">Prioritize What<br></br> to Fix First</h3>
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      Get actionable insights on which issues to tackle first.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </main>


        </ClickSpark>
      </div>

      <GradualBlur
        target="parent"
        position="bottom"
        height="7rem"
        strength={2}
        divCount={5}
        curve="bezier"
        exponential
        opacity={1}
        zIndex={50}
      />
    </div >
  );
}
