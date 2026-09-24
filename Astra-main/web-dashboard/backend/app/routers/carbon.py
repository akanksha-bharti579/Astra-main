"""Carbon accountability API router."""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.carbon_report import (
    CarbonReportRequest, CarbonReportResponse,
    CommitRequest, CarbonReportOnChain,
    VerifyRequest, VerifyResponse
)
from app.services.carbon_service import CarbonService

router = APIRouter(prefix="/carbon", tags=["carbon"])

# Singleton service
_carbon_service: Optional[CarbonService] = None


def _get_service() -> CarbonService:
    global _carbon_service
    if _carbon_service is None:
        _carbon_service = CarbonService()
    return _carbon_service


@router.post("/report", response_model=CarbonReportResponse)
async def generate_carbon_report(request: CarbonReportRequest):
    """
    Generate a carbon report for an architecture.

    Estimates energy consumption (kWh), carbon emissions (kgCO2),
    and cost ($) per component based on scope and region.
    """
    try:
        service = _get_service()
        report = service.generate_report(
            architecture_json=request.architecture_json,
            region=request.region,
            user_id=request.user_id,
        )

        # Save to MongoDB
        await service.save_report(report)
        print(f"📊 Carbon report generated: {report.report_id} | "
              f"{report.metrics.carbon_kg:.2f} kgCO2 | {report.metrics.energy_kwh:.2f} kWh")

        return CarbonReportResponse(report=report, verified=False)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/report/{report_id}", response_model=CarbonReportResponse)
async def get_carbon_report(report_id: str):
    """Get a stored carbon report by ID, including on-chain status."""
    try:
        service = _get_service()
        result = await service.get_report(report_id)
        if not result:
            raise HTTPException(status_code=404, detail="Report not found")
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get report: {str(e)}")


@router.post("/report/{report_id}/commit", response_model=CarbonReportOnChain)
async def commit_report_on_chain(report_id: str):
    """
    Commit a carbon report hash on-chain.

    Flow:
    1. Load report from MongoDB
    2. SHA-256 hash the canonical report JSON
    3. Pin full report to IPFS (if configured)
    4. Store hash on-chain (if configured)
    5. Update MongoDB with on-chain proof
    """
    try:
        service = _get_service()
        on_chain = await service.commit_on_chain(report_id)
        print(f"🔗 Report {report_id} committed | hash: {on_chain.report_hash[:16]}... | "
              f"tx: {on_chain.tx_hash or 'pending'}")
        return on_chain

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to commit on-chain: {str(e)}")


@router.get("/verify/{report_hash}", response_model=VerifyResponse)
async def verify_report(report_hash: str):
    """Verify a carbon report hash against on-chain records."""
    try:
        service = _get_service()
        result = await service.verify_report(report_hash)
        return VerifyResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@router.get("/reports")
async def list_reports(
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
):
    """List all carbon reports (paginated)."""
    try:
        service = _get_service()
        return await service.list_reports(limit=limit, skip=skip)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list reports: {str(e)}")


@router.get("/regions")
async def get_region_data():
    """Get carbon intensity data for all supported cloud regions."""
    service = _get_service()
    return service.get_region_carbon_data()
