"""Carbon report generation and on-chain accountability service."""

import asyncio
import hashlib
import json
import uuid
import math
from typing import Optional, List
from datetime import datetime

from app.models.carbon_report import (
    CarbonReport, CarbonMetrics, ComponentCarbon,
    CarbonReportOnChain, CarbonReportResponse
)
from app.models.architecture import ArchitectureJson
from app.services.blockchain import BlockchainService
from app.services.ipfs_service import IPFSService
from app.data.components_data import get_component_by_id
from app.db.mongodb import MongoDB


# ---- Region carbon intensity data (gCO2/kWh) ----
# Source: Electricity Maps, IEA, cloud provider sustainability reports
REGION_CARBON_INTENSITY = {
    # AWS regions
    "us-east-1": 379.0,       # Virginia
    "us-east-2": 531.0,       # Ohio
    "us-west-1": 210.0,       # N. California
    "us-west-2": 102.0,       # Oregon (hydro)
    "eu-west-1": 296.0,       # Ireland
    "eu-west-2": 228.0,       # London
    "eu-central-1": 338.0,    # Frankfurt
    "eu-north-1": 8.0,        # Stockholm (hydro/nuclear)
    "ap-southeast-1": 431.0,  # Singapore
    "ap-northeast-1": 465.0,  # Tokyo
    "ap-south-1": 708.0,      # Mumbai
    "sa-east-1": 61.0,        # Sao Paulo (hydro)
    "ca-central-1": 120.0,    # Canada
    # GCP regions
    "us-central1": 440.0,     # Iowa
    "us-east4": 379.0,        # Virginia
    "europe-west1": 80.0,     # Belgium
    "europe-north1": 8.0,     # Finland
    "asia-east1": 509.0,      # Taiwan
    # Azure regions
    "eastus": 379.0,
    "westus": 210.0,
    "westeurope": 296.0,
    "northeurope": 296.0,
    # Default
    "default": 400.0,
}

# ---- Component power draw estimates (Watts) ----
COMPONENT_POWER_DRAW = {
    # Backend frameworks (server instance)
    "backend": 50.0,
    # Frontend (CDN/edge)
    "frontend": 5.0,
    # Databases
    "database": 80.0,
    # Hosting
    "hosting": 60.0,
    # ML/AI
    "ml": 300.0,
    # Auth
    "auth": 10.0,
    # Cache
    "cache": 30.0,
    # Queue
    "queue": 25.0,
    # Storage
    "storage": 15.0,
    # CI/CD
    "cicd": 20.0,
    # Monitoring
    "monitoring": 10.0,
    # Search
    "search": 60.0,
}


class CarbonService:
    """Service for generating carbon reports and managing on-chain accountability."""

    def __init__(self):
        self.blockchain = BlockchainService()
        self.ipfs = IPFSService()

    def _get_collection(self):
        """Get MongoDB collection for carbon reports."""
        return MongoDB.get_collection("carbon_reports")

    def generate_report(
        self,
        architecture_json: ArchitectureJson,
        region: str = "us-east-1",
        user_id: Optional[str] = None,
    ) -> CarbonReport:
        """
        Generate a carbon report for an architecture.

        Carbon estimation formula:
            Energy (kWh/month) = Power Draw (W) × Hours/Month × Traffic Multiplier / 1000
            Carbon (kg/month) = Energy × Carbon Intensity (gCO2/kWh) / 1000
        """
        carbon_intensity = REGION_CARBON_INTENSITY.get(region, REGION_CARBON_INTENSITY["default"])
        hours_per_month = 730  # Average hours in a month

        # Traffic multiplier from scope
        traffic_mul = architecture_json.scope.trafficLevel / 3.0
        user_mul = math.log10(architecture_json.scope.users + 1) / 2.0

        component_breakdown: List[ComponentCarbon] = []
        total_energy = 0.0
        total_carbon = 0.0

        for node in architecture_json.nodes:
            category = node.data.category
            power_draw = COMPONENT_POWER_DRAW.get(category, 30.0)

            # Scale power draw by traffic and users
            scaled_power = power_draw * max(traffic_mul, 0.5) * max(user_mul, 0.5)

            # ML components scale more with traffic
            if category == "ml":
                scaled_power *= traffic_mul

            energy_kwh = (scaled_power * hours_per_month) / 1000.0
            carbon_kg = (energy_kwh * carbon_intensity) / 1000.0

            component_breakdown.append(ComponentCarbon(
                component_id=node.data.componentId,
                component_name=node.data.label,
                category=category,
                energy_kwh=round(energy_kwh, 4),
                carbon_kg=round(carbon_kg, 4),
                power_draw_watts=round(scaled_power, 2),
            ))

            total_energy += energy_kwh
            total_carbon += carbon_kg

        # Calculate cost from existing cost calculator
        from app.services.cost_calculator import calculate_costs
        nodes_dict = [
            {"id": n.id, "data": {"componentId": n.data.componentId, "category": n.data.category, "label": n.data.label}}
            for n in architecture_json.nodes
        ]
        scope_dict = {
            "users": architecture_json.scope.users,
            "trafficLevel": architecture_json.scope.trafficLevel,
            "dataVolumeGB": architecture_json.scope.dataVolumeGB,
            "regions": architecture_json.scope.regions,
            "availability": architecture_json.scope.availability,
        }
        cost_estimate = calculate_costs(nodes_dict, scope_dict)

        report = CarbonReport(
            report_id=str(uuid.uuid4()),
            architecture_json=architecture_json,
            metrics=CarbonMetrics(
                energy_kwh=round(total_energy, 4),
                carbon_kg=round(total_carbon, 4),
                carbon_intensity=carbon_intensity,
                region=region,
                cost_usd=round(cost_estimate["total"], 2),
            ),
            component_breakdown=component_breakdown,
            created_at=datetime.utcnow(),
            user_id=user_id,
        )

        return report

    def hash_report(self, report: CarbonReport) -> str:
        """
        Generate SHA-256 hash of a carbon report (canonical JSON).
        Excludes report_id and created_at for deterministic hashing.
        """
        hashable_data = {
            "metrics": report.metrics.model_dump(),
            "component_breakdown": [c.model_dump() for c in report.component_breakdown],
            "nodes_count": len(report.architecture_json.nodes),
            "edges_count": len(report.architecture_json.edges),
            "scope": report.architecture_json.scope.model_dump(),
        }
        canonical = json.dumps(hashable_data, sort_keys=True, default=str)
        return hashlib.sha256(canonical.encode()).hexdigest()

    async def save_report(self, report: CarbonReport) -> str:
        """Save carbon report to MongoDB. Returns report_id."""
        collection = self._get_collection()
        doc = report.model_dump(mode="json")
        doc["_id"] = report.report_id
        await collection.insert_one(doc)
        return report.report_id

    async def get_report(self, report_id: str) -> Optional[CarbonReportResponse]:
        """Get a carbon report by ID with on-chain status."""
        collection = self._get_collection()
        doc = await collection.find_one({"_id": report_id})
        if not doc:
            return None

        report = CarbonReport(**{k: v for k, v in doc.items() if k != "_id"})
        on_chain = doc.get("on_chain")
        on_chain_model = CarbonReportOnChain(**on_chain) if on_chain else None

        return CarbonReportResponse(
            report=report,
            on_chain=on_chain_model,
            verified=on_chain_model is not None and on_chain_model.tx_hash is not None,
        )

    async def commit_on_chain(self, report_id: str) -> CarbonReportOnChain:
        """
        Commit a carbon report hash on-chain:
        1. Load report from MongoDB
        2. Hash the report
        3. Pin full report to IPFS
        4. Store hash on-chain
        5. Update MongoDB with on-chain proof
        """
        collection = self._get_collection()
        doc = await collection.find_one({"_id": report_id})
        if not doc:
            raise ValueError(f"Report {report_id} not found")

        report = CarbonReport(**{k: v for k, v in doc.items() if k != "_id"})
        report_hash = self.hash_report(report)

        # Pin to IPFS (if available)
        ipfs_cid = None
        if self.ipfs.is_available:
            try:
                report_data = report.model_dump(mode="json")
                ipfs_cid = self.ipfs.pin_json(report_data, name=f"carbon-report-{report_id}")
            except Exception as e:
                print(f"⚠️ IPFS pin failed: {e}")

        # Store hash on-chain (if available)
        tx_result = None
        if self.blockchain.is_available:
            try:
                tx_result = self.blockchain.store_carbon_hash(report_hash, ipfs_cid or "")
            except Exception as e:
                print(f"⚠️ On-chain commit failed: {e}")

        on_chain = CarbonReportOnChain(
            report_hash=report_hash,
            ipfs_cid=ipfs_cid,
            tx_hash=tx_result["tx_hash"] if tx_result else None,
            block_number=tx_result["block_number"] if tx_result else None,
            chain_id="sepolia",
            committed_at=datetime.utcnow(),
        )

        # Update MongoDB
        await collection.update_one(
            {"_id": report_id},
            {"$set": {"on_chain": on_chain.model_dump(mode="json")}}
        )

        return on_chain

    async def verify_report(self, report_hash: str) -> dict:
        """Verify a report hash against on-chain record."""
        # Check on-chain
        on_chain_data = None
        if self.blockchain.is_available:
            on_chain_data = self.blockchain.verify_carbon_hash(report_hash)

        # Also check MongoDB
        collection = self._get_collection()
        db_doc = await collection.find_one({"on_chain.report_hash": report_hash})

        return {
            "report_hash": report_hash,
            "verified": on_chain_data is not None or (db_doc is not None and db_doc.get("on_chain")),
            "on_chain_data": on_chain_data,
            "db_record_exists": db_doc is not None,
        }

    async def list_reports(self, limit: int = 20, skip: int = 0) -> list:
        """List all carbon reports (paginated)."""
        try:
            collection = self._get_collection()
            cursor = collection.find().sort("created_at", -1).skip(skip).limit(limit)
            reports = await asyncio.wait_for(cursor.to_list(length=limit), timeout=5.0)

            results = []
            for doc in reports:
                report = CarbonReport(**{k: v for k, v in doc.items() if k != "_id"})
                on_chain = doc.get("on_chain")
                results.append(CarbonReportResponse(
                    report=report,
                    on_chain=CarbonReportOnChain(**on_chain) if on_chain else None,
                    verified=on_chain is not None and on_chain.get("tx_hash") is not None,
                ))

            return results
        except (asyncio.TimeoutError, Exception) as e:
            print(f"⚠️ list_reports failed: {e}")
            return []

    def get_region_carbon_data(self) -> dict:
        """Get all region carbon intensity data."""
        return REGION_CARBON_INTENSITY
