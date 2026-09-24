"""Pydantic models for carbon accountability reports and on-chain verification."""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.architecture import ArchitectureJson


class CarbonMetrics(BaseModel):
    """Carbon estimation metrics for an architecture."""
    energy_kwh: float = Field(description="Estimated energy consumption in kWh/month")
    carbon_kg: float = Field(description="Estimated CO2 emissions in kg/month")
    carbon_intensity: float = Field(description="Regional carbon intensity in gCO2/kWh")
    region: str = Field(default="us-east-1", description="Cloud region used for estimation")
    cost_usd: float = Field(default=0.0, description="Estimated monthly cost in USD")


class ComponentCarbon(BaseModel):
    """Carbon breakdown per component."""
    component_id: str
    component_name: str
    category: str
    energy_kwh: float
    carbon_kg: float
    power_draw_watts: float


class CarbonReport(BaseModel):
    """Full carbon report for an architecture."""
    report_id: Optional[str] = None
    architecture_json: ArchitectureJson
    metrics: CarbonMetrics
    component_breakdown: List[ComponentCarbon] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: Optional[str] = None


class CarbonReportOnChain(BaseModel):
    """On-chain proof for a carbon report."""
    report_hash: str = Field(description="SHA-256 hash of the canonical report JSON")
    ipfs_cid: Optional[str] = Field(default=None, description="IPFS CID of the full report")
    tx_hash: Optional[str] = Field(default=None, description="Ethereum transaction hash")
    block_number: Optional[int] = Field(default=None, description="Block number of the tx")
    chain_id: str = Field(default="sepolia", description="Chain where hash is stored")
    committed_at: Optional[datetime] = None


class CarbonReportResponse(BaseModel):
    """Combined carbon report with optional on-chain proof."""
    report: CarbonReport
    on_chain: Optional[CarbonReportOnChain] = None
    verified: bool = False


class CarbonReportRequest(BaseModel):
    """Request to generate a carbon report."""
    architecture_json: ArchitectureJson
    region: str = Field(default="us-east-1", description="Cloud region for carbon intensity")
    user_id: Optional[str] = None


class CommitRequest(BaseModel):
    """Request to commit a report hash on-chain."""
    report_id: str


class VerifyRequest(BaseModel):
    """Request to verify a report hash."""
    report_hash: str


class VerifyResponse(BaseModel):
    """Verification result."""
    report_hash: str
    verified: bool
    on_chain_data: Optional[dict] = None
