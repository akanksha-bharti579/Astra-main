"""Green compute incentive API router."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.models.incentive import (
    ScoreRequest, SustainabilityScore,
    ClaimRewardRequest, ClaimRewardResponse,
    LeaderboardEntry, BadgeDefinition, UserBadge,
    GreenPointsTransaction
)
from app.services.incentive_service import IncentiveService

router = APIRouter(prefix="/incentives", tags=["incentives"])

# Singleton service
_incentive_service: Optional[IncentiveService] = None


def _get_service() -> IncentiveService:
    global _incentive_service
    if _incentive_service is None:
        _incentive_service = IncentiveService()
    return _incentive_service


@router.post("/score", response_model=SustainabilityScore)
async def calculate_score(request: ScoreRequest):
    """
    Calculate sustainability score for an architecture.

    Compares current carbon footprint against a previous baseline
    and scores the improvement. Awards green points automatically.
    """
    try:
        service = _get_service()
        score = service.calculate_sustainability_score(
            current_carbon_kg=request.current_carbon_kg,
            previous_carbon_kg=request.previous_carbon_kg,
            region=request.region,
            previous_region=request.previous_region,
        )

        # Award points if user_id provided
        if request.user_id and score.green_points > 0:
            await service.award_green_points(
                user_id=request.user_id,
                points=score.green_points,
                reason=f"Sustainability score: {score.score}/100",
                category="carbon_reduction" if score.carbon_saved_kg > 0 else "general",
            )

            # Check and award badges
            eligible = await service.check_badge_eligibility(request.user_id)
            for badge in eligible:
                await service.claim_badge(request.user_id, badge.badge_id)

        return score

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@router.get("/points/{user_id}")
async def get_user_points(user_id: str):
    """Get green points balance for a user."""
    try:
        service = _get_service()
        return await service.get_user_points(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get points: {str(e)}")


@router.get("/points/{user_id}/history", response_model=List[GreenPointsTransaction])
async def get_points_history(user_id: str, limit: int = Query(50, ge=1, le=200)):
    """Get green points transaction history for a user."""
    try:
        service = _get_service()
        return await service.get_points_history(user_id, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get history: {str(e)}")


@router.get("/badges/{user_id}", response_model=List[UserBadge])
async def get_user_badges(user_id: str):
    """Get all badges earned by a user."""
    try:
        service = _get_service()
        return await service.get_user_badges(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get badges: {str(e)}")


@router.get("/badges", response_model=List[BadgeDefinition])
async def get_all_badges():
    """Get all available badge definitions."""
    service = _get_service()
    return service.get_all_badge_definitions()


@router.post("/claim", response_model=ClaimRewardResponse)
async def claim_reward(request: ClaimRewardRequest):
    """
    Claim a token or badge reward.

    For tokens: Converts green points to GRN tokens (ERC-20) minted on-chain.
    For badges: Mints badge as NFT (ERC-721) to the provided wallet.
    """
    try:
        service = _get_service()

        if request.claim_type == "tokens":
            if not request.token_amount or request.token_amount <= 0:
                raise HTTPException(status_code=400, detail="token_amount must be positive")
            return await service.claim_tokens(
                user_id=request.user_id,
                wallet_address=request.wallet_address,
                amount=request.token_amount,
            )

        elif request.claim_type == "badge":
            if not request.badge_id:
                raise HTTPException(status_code=400, detail="badge_id required for badge claims")
            return await service.claim_badge(
                user_id=request.user_id,
                badge_id=request.badge_id,
                wallet_address=request.wallet_address,
            )

        else:
            raise HTTPException(status_code=400, detail="claim_type must be 'tokens' or 'badge'")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claim failed: {str(e)}")


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = Query(20, ge=1, le=100)):
    """Get global sustainability leaderboard."""
    try:
        service = _get_service()
        return await service.get_leaderboard(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get leaderboard: {str(e)}")
