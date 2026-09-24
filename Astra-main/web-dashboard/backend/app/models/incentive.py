"""Pydantic models for green compute incentive tokens and sustainability scoring."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class SustainabilityScore(BaseModel):
    """Sustainability score for an architecture comparison."""
    score: float = Field(ge=0, le=100, description="Sustainability score (0-100)")
    carbon_saved_kg: float = Field(default=0.0, description="CO2 saved vs baseline (kg)")
    energy_saved_kwh: float = Field(default=0.0, description="Energy saved vs baseline (kWh)")
    green_points: int = Field(default=0, description="Green points earned")
    improvements: List[str] = Field(default_factory=list, description="List of improvements made")


class GreenPointsTransaction(BaseModel):
    """A single green points transaction."""
    tx_id: Optional[str] = None
    user_id: str
    points: int
    reason: str
    category: str = Field(default="general", description="carbon_reduction | region_optimization | budget_keeper")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BadgeDefinition(BaseModel):
    """Badge definition for sustainability achievements."""
    badge_id: str
    name: str
    description: str
    icon: str
    threshold_points: Optional[int] = None
    threshold_condition: Optional[str] = None
    nft_token_id: Optional[int] = None


class UserBadge(BaseModel):
    """Badge earned by a user."""
    badge_id: str
    badge: BadgeDefinition
    earned_at: datetime
    tx_hash: Optional[str] = None


class LeaderboardEntry(BaseModel):
    """Leaderboard entry for a user."""
    user_id: str
    total_points: int
    rank: int
    badges_count: int
    carbon_saved_kg: float
    badge_ids: List[str] = Field(default_factory=list)


class ScoreRequest(BaseModel):
    """Request to calculate sustainability score."""
    current_carbon_kg: float
    previous_carbon_kg: Optional[float] = None
    region: str = Field(default="us-east-1")
    previous_region: Optional[str] = None
    user_id: Optional[str] = None


class ClaimRewardRequest(BaseModel):
    """Request to claim token/badge reward."""
    user_id: str
    wallet_address: str
    claim_type: str = Field(description="tokens | badge")
    badge_id: Optional[str] = None
    token_amount: Optional[int] = None


class ClaimRewardResponse(BaseModel):
    """Response after claiming a reward."""
    success: bool
    claim_type: str
    tx_hash: Optional[str] = None
    amount: Optional[int] = None
    badge_id: Optional[str] = None
    message: str
