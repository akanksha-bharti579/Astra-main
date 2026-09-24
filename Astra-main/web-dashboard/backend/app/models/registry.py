"""Pydantic models for the decentralized carbon data registry."""

from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field


class RegistryEntryData(BaseModel):
    """Flexible data payload for a registry entry."""
    name: str
    description: str
    value: Any = Field(description="Primary metric value (e.g., gCO2/kWh, gCO2/1K tokens)")
    unit: str = Field(default="gCO2/kWh", description="Unit of measurement")
    source: Optional[str] = None
    methodology: Optional[str] = None
    extra: Optional[dict] = None


class RegistryEntry(BaseModel):
    """A single entry in the carbon data registry."""
    entry_id: Optional[str] = None
    entry_type: str = Field(description="model_benchmark | region_metric | architecture_template")
    data: RegistryEntryData
    submitter: str = Field(default="system", description="User ID or 'system' for seed data")
    status: str = Field(default="pending", description="pending | verified | rejected")
    votes_for: int = Field(default=0)
    votes_against: int = Field(default=0)
    on_chain_hash: Optional[str] = None
    on_chain_tx: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class RegistrySubmission(BaseModel):
    """Request to submit a new registry entry."""
    entry_type: str = Field(description="model_benchmark | region_metric | architecture_template")
    data: RegistryEntryData
    submitter: str = Field(default="anonymous")


class RegistryVote(BaseModel):
    """Vote on a registry entry."""
    voter_id: str
    vote: str = Field(description="approve | reject")


class RegistryFilter(BaseModel):
    """Filters for listing registry entries."""
    entry_type: Optional[str] = None
    status: Optional[str] = None
    search: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    skip: int = Field(default=0, ge=0)


class RegistryStats(BaseModel):
    """Registry statistics."""
    total_entries: int
    verified_entries: int
    pending_entries: int
    total_votes: int
    entry_types: dict
