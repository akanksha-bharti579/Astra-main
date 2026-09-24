"""Decentralized carbon data registry service."""

import asyncio
import hashlib
import json
import uuid
from typing import Optional, List
from datetime import datetime

from app.models.registry import (
    RegistryEntry, RegistryEntryData, RegistrySubmission,
    RegistryVote, RegistryFilter, RegistryStats
)
from app.services.blockchain import BlockchainService
from app.db.mongodb import MongoDB


# ---- Seed data: LLM carbon benchmarks ----
SEED_MODEL_BENCHMARKS = [
    RegistryEntryData(
        name="GPT-4 (OpenAI)",
        description="CO2 emissions per 1K tokens for GPT-4 inference",
        value=4.32,
        unit="gCO2/1K tokens",
        source="ML CO2 Impact (2024), IEA energy data",
        methodology="Estimated from GPU power draw × inference time × US grid intensity",
    ),
    RegistryEntryData(
        name="GPT-3.5 Turbo (OpenAI)",
        description="CO2 emissions per 1K tokens for GPT-3.5 Turbo inference",
        value=0.95,
        unit="gCO2/1K tokens",
        source="ML CO2 Impact (2024)",
        methodology="Estimated from GPU power draw × inference time × US grid intensity",
    ),
    RegistryEntryData(
        name="Gemini 2.5 Flash (Google)",
        description="CO2 emissions per 1K tokens for Gemini 2.5 Flash inference",
        value=0.72,
        unit="gCO2/1K tokens",
        source="Google Sustainability Report (2024)",
        methodology="Google's carbon-free energy matched datacenters",
    ),
    RegistryEntryData(
        name="Claude 3.5 Sonnet (Anthropic)",
        description="CO2 emissions per 1K tokens for Claude 3.5 Sonnet inference",
        value=1.85,
        unit="gCO2/1K tokens",
        source="Anthropic usage reports, IEA data",
        methodology="Estimated from inference costs and datacenter PUE",
    ),
    RegistryEntryData(
        name="Llama 3 70B (Meta)",
        description="CO2 emissions per 1K tokens for Llama 3 70B self-hosted inference",
        value=3.10,
        unit="gCO2/1K tokens",
        source="Hugging Face Energy Score, ML CO2 Impact",
        methodology="A100 GPU power draw × inference latency × US average grid intensity",
    ),
    RegistryEntryData(
        name="Mistral Large (Mistral AI)",
        description="CO2 emissions per 1K tokens for Mistral Large inference",
        value=2.40,
        unit="gCO2/1K tokens",
        source="Mistral AI, EU energy statistics",
        methodology="EU-based datacenter grid intensity, estimated GPU draw",
    ),
]

# ---- Seed data: Region carbon intensities ----
SEED_REGION_METRICS = [
    RegistryEntryData(
        name="eu-north-1 (Stockholm)",
        description="AWS Stockholm — powered by hydro and nuclear energy",
        value=8.0,
        unit="gCO2/kWh",
        source="Electricity Maps (2024), Swedish Energy Agency",
    ),
    RegistryEntryData(
        name="sa-east-1 (São Paulo)",
        description="AWS São Paulo — largely hydroelectric power",
        value=61.0,
        unit="gCO2/kWh",
        source="Brazilian National Grid Operator (ONS)",
    ),
    RegistryEntryData(
        name="us-west-2 (Oregon)",
        description="AWS Oregon — significant hydroelectric power from Columbia River",
        value=102.0,
        unit="gCO2/kWh",
        source="EPA eGRID, BPA data",
    ),
    RegistryEntryData(
        name="eu-west-1 (Ireland)",
        description="AWS Ireland — growing wind power share",
        value=296.0,
        unit="gCO2/kWh",
        source="EirGrid, SEAI (2024)",
    ),
    RegistryEntryData(
        name="us-east-1 (Virginia)",
        description="AWS Virginia — mixed grid with coal and natural gas",
        value=379.0,
        unit="gCO2/kWh",
        source="EPA eGRID (2024)",
    ),
    RegistryEntryData(
        name="ap-south-1 (Mumbai)",
        description="AWS Mumbai — largely coal-powered Indian grid",
        value=708.0,
        unit="gCO2/kWh",
        source="Central Electricity Authority India (2024)",
    ),
]

# Entry type mapping to on-chain type codes
ENTRY_TYPE_CODES = {
    "model_benchmark": 0,
    "region_metric": 1,
    "architecture_template": 2,
}


class RegistryService:
    """Service for managing the decentralized carbon data registry."""

    def __init__(self):
        self.blockchain = BlockchainService()

    def _get_collection(self):
        return MongoDB.get_collection("carbon_registry")

    def _get_votes_collection(self):
        return MongoDB.get_collection("registry_votes")

    async def seed_initial_data(self):
        """Populate registry with seed data if empty."""
        try:
            collection = self._get_collection()
            count = await asyncio.wait_for(collection.count_documents({}), timeout=5.0)
            if count > 0:
                return  # Already seeded

            entries = []

            # Seed model benchmarks
            for data in SEED_MODEL_BENCHMARKS:
                entry = RegistryEntry(
                    entry_id=str(uuid.uuid4()),
                    entry_type="model_benchmark",
                    data=data,
                    submitter="system",
                    status="verified",
                    votes_for=10,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                entries.append(entry.model_dump(mode="json"))

            # Seed region metrics
            for data in SEED_REGION_METRICS:
                entry = RegistryEntry(
                    entry_id=str(uuid.uuid4()),
                    entry_type="region_metric",
                    data=data,
                    submitter="system",
                    status="verified",
                    votes_for=10,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                entries.append(entry.model_dump(mode="json"))

            if entries:
                for entry in entries:
                    entry["_id"] = entry["entry_id"]
                await collection.insert_many(entries)
                print(f"🌱 Seeded {len(entries)} registry entries")
        except (asyncio.TimeoutError, Exception) as e:
            print(f"⚠️ Registry seeding failed (MongoDB timeout): {e}")

    async def submit_entry(self, submission: RegistrySubmission) -> RegistryEntry:
        """Submit a new entry to the registry."""
        entry = RegistryEntry(
            entry_id=str(uuid.uuid4()),
            entry_type=submission.entry_type,
            data=submission.data,
            submitter=submission.submitter,
            status="pending",
            votes_for=0,
            votes_against=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        collection = self._get_collection()
        doc = entry.model_dump(mode="json")
        doc["_id"] = entry.entry_id
        await collection.insert_one(doc)

        return entry

    async def vote_on_entry(self, entry_id: str, vote: RegistryVote) -> RegistryEntry:
        """Cast a vote on a registry entry."""
        collection = self._get_collection()
        votes_col = self._get_votes_collection()

        # Check if already voted
        existing = await votes_col.find_one({
            "entry_id": entry_id,
            "voter_id": vote.voter_id,
        })
        if existing:
            raise ValueError("Already voted on this entry")

        # Record vote
        await votes_col.insert_one({
            "entry_id": entry_id,
            "voter_id": vote.voter_id,
            "vote": vote.vote,
            "timestamp": datetime.utcnow(),
        })

        # Update entry counts
        field = "votes_for" if vote.vote == "approve" else "votes_against"
        await collection.update_one(
            {"_id": entry_id},
            {
                "$inc": {field: 1},
                "$set": {"updated_at": datetime.utcnow()},
            }
        )

        # Auto-verify if enough votes
        doc = await collection.find_one({"_id": entry_id})
        if doc and doc.get("votes_for", 0) >= 5 and doc.get("status") == "pending":
            await collection.update_one(
                {"_id": entry_id},
                {"$set": {"status": "verified", "updated_at": datetime.utcnow()}}
            )

        # Auto-reject if too many against votes
        if doc and doc.get("votes_against", 0) >= 5 and doc.get("status") == "pending":
            await collection.update_one(
                {"_id": entry_id},
                {"$set": {"status": "rejected", "updated_at": datetime.utcnow()}}
            )

        updated = await collection.find_one({"_id": entry_id})
        return RegistryEntry(**{k: v for k, v in updated.items() if k != "_id"})

    async def verify_entry_on_chain(self, entry_id: str) -> RegistryEntry:
        """Store a verified entry's hash on-chain."""
        collection = self._get_collection()
        doc = await collection.find_one({"_id": entry_id})
        if not doc:
            raise ValueError(f"Entry {entry_id} not found")

        if doc.get("status") != "verified":
            raise ValueError("Entry must be verified before on-chain registration")

        # Hash the entry data
        entry_data = {
            "entry_type": doc["entry_type"],
            "data": doc["data"],
        }
        canonical = json.dumps(entry_data, sort_keys=True, default=str)
        entry_hash = hashlib.sha256(canonical.encode()).hexdigest()

        # Store on-chain
        tx_hash = None
        if self.blockchain.is_available:
            try:
                entry_type_code = ENTRY_TYPE_CODES.get(doc["entry_type"], 0)
                result = self.blockchain.register_entry_on_chain(entry_hash, entry_type_code)
                tx_hash = result.get("tx_hash")
            except Exception as e:
                print(f"⚠️ On-chain registration failed: {e}")

        # Update MongoDB
        await collection.update_one(
            {"_id": entry_id},
            {"$set": {
                "on_chain_hash": entry_hash,
                "on_chain_tx": tx_hash,
                "updated_at": datetime.utcnow(),
            }}
        )

        updated = await collection.find_one({"_id": entry_id})
        return RegistryEntry(**{k: v for k, v in updated.items() if k != "_id"})

    async def get_entry(self, entry_id: str) -> Optional[RegistryEntry]:
        """Get a single registry entry."""
        collection = self._get_collection()
        doc = await collection.find_one({"_id": entry_id})
        if not doc:
            return None
        return RegistryEntry(**{k: v for k, v in doc.items() if k != "_id"})

    async def get_entries(self, filters: RegistryFilter) -> List[RegistryEntry]:
        """Get filtered + paginated list of registry entries."""
        collection = self._get_collection()

        query = {}
        if filters.entry_type:
            query["entry_type"] = filters.entry_type
        if filters.status:
            query["status"] = filters.status
        if filters.search:
            query["$or"] = [
                {"data.name": {"$regex": filters.search, "$options": "i"}},
                {"data.description": {"$regex": filters.search, "$options": "i"}},
            ]

        try:
            cursor = collection.find(query).sort("created_at", -1).skip(filters.skip).limit(filters.limit)
            docs = await asyncio.wait_for(cursor.to_list(length=filters.limit), timeout=5.0)

            return [
                RegistryEntry(**{k: v for k, v in doc.items() if k != "_id"})
                for doc in docs
            ]
        except (asyncio.TimeoutError, Exception) as e:
            print(f"⚠️ get_entries failed: {e}")
            return []

    async def get_benchmarks(self) -> List[RegistryEntry]:
        """Get all model carbon benchmarks."""
        return await self.get_entries(RegistryFilter(
            entry_type="model_benchmark",
            status="verified",
            limit=100,
        ))

    async def get_region_metrics(self) -> List[RegistryEntry]:
        """Get all region carbon intensity metrics."""
        return await self.get_entries(RegistryFilter(
            entry_type="region_metric",
            status="verified",
            limit=100,
        ))

    async def get_stats(self) -> RegistryStats:
        """Get registry statistics."""
        try:
            collection = self._get_collection()
            total = await asyncio.wait_for(collection.count_documents({}), timeout=5.0)
            verified = await asyncio.wait_for(collection.count_documents({"status": "verified"}), timeout=5.0)
            pending = await asyncio.wait_for(collection.count_documents({"status": "pending"}), timeout=5.0)

            votes_col = self._get_votes_collection()
            total_votes = await asyncio.wait_for(votes_col.count_documents({}), timeout=5.0)

            # Count by type
            pipeline = [
                {"$group": {"_id": "$entry_type", "count": {"$sum": 1}}}
            ]
            type_counts = {}
            async for doc in collection.aggregate(pipeline):
                type_counts[doc["_id"]] = doc["count"]

            return RegistryStats(
                total_entries=total,
                verified_entries=verified,
                pending_entries=pending,
                total_votes=total_votes,
                entry_types=type_counts,
            )
        except (asyncio.TimeoutError, Exception) as e:
            print(f"⚠️ get_stats failed: {e}")
            return RegistryStats(
                total_entries=0,
                verified_entries=0,
                pending_entries=0,
                total_votes=0,
                entry_types={},
            )
