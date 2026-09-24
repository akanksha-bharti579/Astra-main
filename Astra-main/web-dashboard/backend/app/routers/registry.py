"""Decentralized carbon data registry API router."""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from app.models.registry import (
    RegistryEntry, RegistrySubmission,
    RegistryVote, RegistryFilter, RegistryStats
)
from app.services.registry_service import RegistryService

router = APIRouter(prefix="/registry", tags=["registry"])

# Singleton service
_registry_service: Optional[RegistryService] = None


def _get_service() -> RegistryService:
    global _registry_service
    if _registry_service is None:
        _registry_service = RegistryService()
    return _registry_service




@router.get("/entries", response_model=List[RegistryEntry])
async def list_entries(
    entry_type: Optional[str] = Query(None, description="Filter by type: model_benchmark, region_metric, architecture_template"),
    status: Optional[str] = Query(None, description="Filter by status: pending, verified, rejected"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """
    List registry entries with optional filters.
    
    The registry contains crowd-sourced and verified carbon data:
    - **model_benchmark**: CO2 per 1K tokens for LLMs
    - **region_metric**: Carbon intensity by cloud region
    - **architecture_template**: Sustainable architecture patterns
    """
    try:
        service = _get_service()
        filters = RegistryFilter(
            entry_type=entry_type,
            status=status,
            search=search,
            limit=limit,
            skip=skip,
        )
        return await service.get_entries(filters)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list entries: {str(e)}")


@router.get("/entries/{entry_id}", response_model=RegistryEntry)
async def get_entry(entry_id: str):
    """Get a single registry entry by ID."""
    try:
        service = _get_service()
        entry = await service.get_entry(entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")
        return entry
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get entry: {str(e)}")


@router.post("/entries", response_model=RegistryEntry)
async def submit_entry(submission: RegistrySubmission):
    """
    Submit a new entry to the carbon data registry.
    
    New entries start with 'pending' status and require community
    votes to become 'verified'. Once verified, they can be committed on-chain.
    """
    try:
        if submission.entry_type not in ("model_benchmark", "region_metric", "architecture_template"):
            raise HTTPException(
                status_code=400,
                detail="entry_type must be: model_benchmark, region_metric, or architecture_template"
            )
        service = _get_service()
        return await service.submit_entry(submission)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Submission failed: {str(e)}")


@router.post("/entries/{entry_id}/vote", response_model=RegistryEntry)
async def vote_on_entry(entry_id: str, vote: RegistryVote):
    """
    Vote on a registry entry.
    
    When an entry receives 5+ 'approve' votes, it is automatically verified.
    When it receives 5+ 'reject' votes, it is rejected.
    """
    try:
        if vote.vote not in ("approve", "reject"):
            raise HTTPException(status_code=400, detail="vote must be 'approve' or 'reject'")
        service = _get_service()
        return await service.vote_on_entry(entry_id, vote)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Vote failed: {str(e)}")


@router.post("/entries/{entry_id}/verify", response_model=RegistryEntry)
async def verify_entry_on_chain(entry_id: str):
    """
    Store a verified entry's hash on-chain for tamper-proof audit.
    
    Only entries with 'verified' status can be committed on-chain.
    """
    try:
        service = _get_service()
        return await service.verify_entry_on_chain(entry_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"On-chain verification failed: {str(e)}")


@router.get("/benchmarks", response_model=List[RegistryEntry])
async def get_benchmarks():
    """Get all verified model carbon benchmarks (CO2 per 1K tokens)."""
    try:
        service = _get_service()
        return await service.get_benchmarks()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get benchmarks: {str(e)}")


@router.get("/regions", response_model=List[RegistryEntry])
async def get_region_metrics():
    """Get all verified region carbon intensity metrics."""
    try:
        service = _get_service()
        return await service.get_region_metrics()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get regions: {str(e)}")


@router.get("/stats", response_model=RegistryStats)
async def get_stats():
    """Get registry statistics: total entries, verified count, votes, etc."""
    try:
        service = _get_service()
        return await service.get_stats()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
