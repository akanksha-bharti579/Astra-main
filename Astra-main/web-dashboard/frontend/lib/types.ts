import { Node, Edge } from "@xyflow/react";

export interface ArchitectureNode extends Node {
  data: {
    label: string;
    componentId: string;
    category: string;
    icon: string;
    color: string;
    config?: Record<string, any>;
  };
}

export interface ArchitectureEdge extends Edge {}

export interface Scope {
  users: number;
  trafficLevel: 1 | 2 | 3 | 4 | 5;
  dataVolumeGB: number;
  regions: number;
  availability: number; // percentage
}

export interface CostBreakdown {
  category: string;
  component: string;
  componentId: string;
  baseCost: number;
  scaledCost: number;
}

export interface CostEstimate {
  total: number;
  breakdown: CostBreakdown[];
}

export interface Suggestion {
  id: string;
  type: "cost" | "architecture" | "performance";
  title: string;
  description: string;
  savings?: number;
  priority: "high" | "medium" | "low";
  action?: () => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ---- Carbon Accountability Types ----

export interface CarbonMetrics {
  energy_kwh: number;
  carbon_kg: number;
  carbon_intensity: number;
  region: string;
  cost_usd: number;
}

export interface ComponentCarbon {
  component_id: string;
  component_name: string;
  category: string;
  energy_kwh: number;
  carbon_kg: number;
  power_draw_watts: number;
}

export interface CarbonReportOnChain {
  report_hash: string;
  ipfs_cid?: string;
  tx_hash?: string;
  block_number?: number;
  chain_id: string;
  committed_at?: string;
}

export interface CarbonReport {
  report_id: string;
  metrics: CarbonMetrics;
  component_breakdown: ComponentCarbon[];
  created_at: string;
  user_id?: string;
}

export interface CarbonReportResponse {
  report: CarbonReport;
  on_chain?: CarbonReportOnChain;
  verified: boolean;
}

// ---- Incentive Types ----

export interface SustainabilityScore {
  score: number;
  carbon_saved_kg: number;
  energy_saved_kwh: number;
  green_points: number;
  improvements: string[];
}

export interface BadgeDefinition {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  threshold_points?: number;
  threshold_condition?: string;
}

export interface UserBadge {
  badge_id: string;
  badge: BadgeDefinition;
  earned_at: string;
  tx_hash?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  total_points: number;
  rank: number;
  badges_count: number;
  carbon_saved_kg: number;
  badge_ids: string[];
}

// ---- Registry Types ----

export interface RegistryEntryData {
  name: string;
  description: string;
  value: number;
  unit: string;
  source?: string;
  methodology?: string;
}

export interface RegistryEntry {
  entry_id: string;
  entry_type: string;
  data: RegistryEntryData;
  submitter: string;
  status: string;
  votes_for: number;
  votes_against: number;
  on_chain_hash?: string;
  on_chain_tx?: string;
  created_at: string;
}

export interface RegistryStats {
  total_entries: number;
  verified_entries: number;
  pending_entries: number;
  total_votes: number;
  entry_types: Record<string, number>;
}
