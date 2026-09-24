"""Green compute incentive service: sustainability scoring, points, badges, and token rewards."""

import asyncio
import uuid
from typing import Optional, List
from datetime import datetime

from app.models.incentive import (
    SustainabilityScore, GreenPointsTransaction,
    BadgeDefinition, UserBadge, LeaderboardEntry,
    ClaimRewardResponse
)
from app.services.blockchain import BlockchainService
from app.services.carbon_service import REGION_CARBON_INTENSITY
from app.db.mongodb import MongoDB


# ---- Badge definitions ----
BADGE_DEFINITIONS: List[BadgeDefinition] = [
    BadgeDefinition(
        badge_id="green_starter",
        name="🌱 Green Starter",
        description="Earned your first green points by reducing carbon emissions.",
        icon="🌱",
        threshold_points=100,
    ),
    BadgeDefinition(
        badge_id="eco_developer",
        name="🌿 Eco Developer",
        description="Consistently making green computing choices.",
        icon="🌿",
        threshold_points=500,
    ),
    BadgeDefinition(
        badge_id="carbon_champion",
        name="🌳 Carbon Champion",
        description="Major sustainability impact through code optimization.",
        icon="🌳",
        threshold_points=1000,
    ),
    BadgeDefinition(
        badge_id="region_optimizer",
        name="♻️ Region Optimizer",
        description="Chose low-carbon cloud regions 5 or more times.",
        icon="♻️",
        threshold_condition="region_optimizations >= 5",
    ),
    BadgeDefinition(
        badge_id="budget_keeper",
        name="⚡ Budget Keeper",
        description="Stayed under carbon budget 3 or more times.",
        icon="⚡",
        threshold_condition="budget_kept >= 3",
    ),
    BadgeDefinition(
        badge_id="sustainability_pioneer",
        name="🏆 Sustainability Pioneer",
        description="Top 10 on the global leaderboard.",
        icon="🏆",
        threshold_points=5000,
    ),
]


class IncentiveService:
    """Service for sustainability scoring, green points, and reward management."""

    def __init__(self):
        self.blockchain = BlockchainService()

    def _get_points_collection(self):
        return MongoDB.get_collection("green_points")

    def _get_badges_collection(self):
        return MongoDB.get_collection("user_badges")

    def _get_users_collection(self):
        return MongoDB.get_collection("green_users")

    def calculate_sustainability_score(
        self,
        current_carbon_kg: float,
        previous_carbon_kg: Optional[float] = None,
        region: str = "us-east-1",
        previous_region: Optional[str] = None,
    ) -> SustainabilityScore:
        """
        Calculate sustainability score based on carbon comparison.

        Scoring:
        - Carbon reduction: Up to 60 points (proportional to % reduction)
        - Low-carbon region: Up to 25 points
        - Base score: 15 points for any architecture evaluation
        """
        improvements = []
        score = 15.0  # Base score for evaluating
        green_points = 10  # Base points
        carbon_saved = 0.0
        energy_saved = 0.0

        # Carbon reduction scoring (0-60 points)
        if previous_carbon_kg and previous_carbon_kg > 0:
            reduction_pct = (previous_carbon_kg - current_carbon_kg) / previous_carbon_kg * 100

            if reduction_pct > 0:
                # Scale: 10% reduction = 20 pts, 25% = 40 pts, 50%+ = 60 pts
                carbon_score = min(60, reduction_pct * 1.2)
                score += carbon_score
                carbon_saved = previous_carbon_kg - current_carbon_kg
                energy_saved = carbon_saved * 2.5  # Rough energy estimate

                green_points += int(reduction_pct * 5)
                improvements.append(f"Carbon reduced by {reduction_pct:.1f}% ({carbon_saved:.2f} kgCO2 saved)")

        # Region scoring (0-25 points)
        current_intensity = REGION_CARBON_INTENSITY.get(region, 400)
        if current_intensity <= 100:
            score += 25
            green_points += 25
            improvements.append(f"Using very low-carbon region ({region}: {current_intensity} gCO2/kWh)")
        elif current_intensity <= 250:
            score += 15
            green_points += 15
            improvements.append(f"Using low-carbon region ({region}: {current_intensity} gCO2/kWh)")
        elif current_intensity <= 400:
            score += 5
            green_points += 5

        # Region improvement bonus
        if previous_region:
            prev_intensity = REGION_CARBON_INTENSITY.get(previous_region, 400)
            if current_intensity < prev_intensity:
                bonus = min(15, int((prev_intensity - current_intensity) / 20))
                green_points += bonus
                improvements.append(f"Switched to greener region ({previous_region} → {region})")

        return SustainabilityScore(
            score=min(100, round(score, 1)),
            carbon_saved_kg=round(carbon_saved, 4),
            energy_saved_kwh=round(energy_saved, 4),
            green_points=green_points,
            improvements=improvements,
        )

    async def award_green_points(
        self,
        user_id: str,
        points: int,
        reason: str,
        category: str = "general",
    ) -> GreenPointsTransaction:
        """Award green points to a user and record the transaction."""
        tx = GreenPointsTransaction(
            tx_id=str(uuid.uuid4()),
            user_id=user_id,
            points=points,
            reason=reason,
            category=category,
            timestamp=datetime.utcnow(),
        )

        # Save transaction
        collection = self._get_points_collection()
        await collection.insert_one(tx.model_dump(mode="json"))

        # Update user total
        users = self._get_users_collection()
        await users.update_one(
            {"user_id": user_id},
            {
                "$inc": {"total_points": points, "total_carbon_saved_kg": 0},
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )

        return tx

    async def get_user_points(self, user_id: str) -> dict:
        """Get total green points for a user."""
        users = self._get_users_collection()
        user = await users.find_one({"user_id": user_id})
        if not user:
            return {"user_id": user_id, "total_points": 0, "badges_count": 0}

        badges = self._get_badges_collection()
        badge_count = await badges.count_documents({"user_id": user_id})

        return {
            "user_id": user_id,
            "total_points": user.get("total_points", 0),
            "badges_count": badge_count,
            "total_carbon_saved_kg": user.get("total_carbon_saved_kg", 0),
        }

    async def get_points_history(self, user_id: str, limit: int = 50) -> list:
        """Get points transaction history for a user."""
        collection = self._get_points_collection()
        cursor = collection.find({"user_id": user_id}).sort("timestamp", -1).limit(limit)
        txs = await cursor.to_list(length=limit)
        return [
            GreenPointsTransaction(**{k: v for k, v in tx.items() if k != "_id"})
            for tx in txs
        ]

    async def check_badge_eligibility(self, user_id: str) -> List[BadgeDefinition]:
        """Check which badges a user is eligible for but hasn't earned yet."""
        user_data = await self.get_user_points(user_id)
        total_points = user_data.get("total_points", 0)

        # Get already earned badges
        badges_col = self._get_badges_collection()
        earned = await badges_col.find({"user_id": user_id}).to_list(length=100)
        earned_ids = {b["badge_id"] for b in earned}

        eligible = []
        for badge in BADGE_DEFINITIONS:
            if badge.badge_id in earned_ids:
                continue
            if badge.threshold_points and total_points >= badge.threshold_points:
                eligible.append(badge)

        return eligible

    async def get_user_badges(self, user_id: str) -> List[UserBadge]:
        """Get all badges earned by a user."""
        badges_col = self._get_badges_collection()
        earned = await badges_col.find({"user_id": user_id}).to_list(length=100)

        result = []
        for doc in earned:
            badge_def = next((b for b in BADGE_DEFINITIONS if b.badge_id == doc["badge_id"]), None)
            if badge_def:
                result.append(UserBadge(
                    badge_id=doc["badge_id"],
                    badge=badge_def,
                    earned_at=doc.get("earned_at", datetime.utcnow()),
                    tx_hash=doc.get("tx_hash"),
                ))

        return result

    async def claim_badge(self, user_id: str, badge_id: str, wallet_address: Optional[str] = None) -> ClaimRewardResponse:
        """Award a badge to a user, optionally minting as NFT."""
        badge_def = next((b for b in BADGE_DEFINITIONS if b.badge_id == badge_id), None)
        if not badge_def:
            return ClaimRewardResponse(
                success=False, claim_type="badge", message=f"Badge '{badge_id}' not found"
            )

        # Check if already earned
        badges_col = self._get_badges_collection()
        existing = await badges_col.find_one({"user_id": user_id, "badge_id": badge_id})
        if existing:
            return ClaimRewardResponse(
                success=False, claim_type="badge",
                badge_id=badge_id, message="Badge already earned"
            )

        # Mint NFT on-chain (if wallet provided and blockchain available)
        tx_hash = None
        if wallet_address and self.blockchain.is_available:
            try:
                badge_uri = f"https://astra.dev/badges/{badge_id}.json"
                result = self.blockchain.mint_badge(wallet_address, badge_uri)
                tx_hash = result.get("tx_hash")
            except Exception as e:
                print(f"⚠️ Badge NFT mint failed: {e}")

        # Save to MongoDB
        await badges_col.insert_one({
            "user_id": user_id,
            "badge_id": badge_id,
            "earned_at": datetime.utcnow(),
            "tx_hash": tx_hash,
            "wallet_address": wallet_address,
        })

        return ClaimRewardResponse(
            success=True, claim_type="badge",
            badge_id=badge_id, tx_hash=tx_hash,
            message=f"Badge '{badge_def.name}' earned!"
        )

    async def claim_tokens(self, user_id: str, wallet_address: str, amount: int) -> ClaimRewardResponse:
        """Mint green tokens to a user's wallet."""
        # Verify user has enough points (1 point = 1 token)
        user_data = await self.get_user_points(user_id)
        if user_data["total_points"] < amount:
            return ClaimRewardResponse(
                success=False, claim_type="tokens",
                message=f"Insufficient points. Have {user_data['total_points']}, need {amount}"
            )

        tx_hash = None
        if self.blockchain.is_available:
            try:
                result = self.blockchain.mint_green_tokens(wallet_address, amount * 10**18)
                tx_hash = result.get("tx_hash")
            except Exception as e:
                print(f"⚠️ Token mint failed: {e}")
                return ClaimRewardResponse(
                    success=False, claim_type="tokens",
                    message=f"Token minting failed: {str(e)}"
                )

        # Deduct points
        users = self._get_users_collection()
        await users.update_one(
            {"user_id": user_id},
            {"$inc": {"total_points": -amount}}
        )

        # Record the claim
        await self._get_points_collection().insert_one({
            "tx_id": str(uuid.uuid4()),
            "user_id": user_id,
            "points": -amount,
            "reason": f"Claimed {amount} GRN tokens",
            "category": "token_claim",
            "timestamp": datetime.utcnow(),
        })

        return ClaimRewardResponse(
            success=True, claim_type="tokens",
            amount=amount, tx_hash=tx_hash,
            message=f"Minted {amount} GRN tokens!"
        )

    async def get_leaderboard(self, limit: int = 20) -> List[LeaderboardEntry]:
        """Get global leaderboard sorted by total points."""
        try:
            users = self._get_users_collection()
            cursor = users.find().sort("total_points", -1).limit(limit)
            user_docs = await asyncio.wait_for(cursor.to_list(length=limit), timeout=5.0)

            badges_col = self._get_badges_collection()

            leaderboard = []
            for rank, doc in enumerate(user_docs, 1):
                user_id = doc["user_id"]
                user_badges = await badges_col.find({"user_id": user_id}).to_list(length=100)
                badge_ids = [b["badge_id"] for b in user_badges]

                leaderboard.append(LeaderboardEntry(
                    user_id=user_id,
                    total_points=doc.get("total_points", 0),
                    rank=rank,
                    badges_count=len(badge_ids),
                    carbon_saved_kg=doc.get("total_carbon_saved_kg", 0),
                    badge_ids=badge_ids,
                ))

            return leaderboard
        except (asyncio.TimeoutError, Exception) as e:
            print(f"⚠️ get_leaderboard failed: {e}")
            return []

    def get_all_badge_definitions(self) -> List[BadgeDefinition]:
        """Get all available badge definitions."""
        return BADGE_DEFINITIONS
