"""
Tools API — GST Calculator, ITC Checker, HSN Search, Due Dates, Late Fee Calculator.
"""

from fastapi import APIRouter, Depends, Request, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.middleware import get_current_user
from app.middleware.activity_tracker import log_tool_use
from app.services.gst_validator import (
    calculate_gst,
    validate_gstin,
    search_hsn,
    calculate_late_fee,
    get_gst_due_dates,
    calculate_itc,
)

router = APIRouter(prefix="/tools", tags=["Tools"])


def success_response(data=None, message="Success"):
    return {"success": True, "data": data, "message": message}


# ─── Schemas ────────────────────────────────────────

class GSTCalculatorRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Base amount in INR")
    rate: float = Field(..., ge=0, le=28, description="GST rate (%)")
    is_igst: bool = Field(default=False, description="True for inter-state (IGST)")

class LateFeeRequest(BaseModel):
    return_type: str = Field(..., description="e.g., GSTR-3B, GSTR-1, GSTR-9")
    due_date: str = Field(..., description="Due date (YYYY-MM-DD)")
    filing_date: str = Field(..., description="Actual filing date (YYYY-MM-DD)")
    tax_liability: float = Field(default=0, ge=0, description="Tax liability in INR")

class ITCCheckerRequest(BaseModel):
    total_itc: float = Field(..., ge=0)
    ineligible_itc: float = Field(default=0, ge=0)
    reverse_charge_itc: float = Field(default=0, ge=0)
    exempt_supply_ratio: float = Field(default=0, ge=0, le=1)

class GSTINValidateRequest(BaseModel):
    gstin: str = Field(..., min_length=15, max_length=15)


# ─── Endpoints ──────────────────────────────────────

@router.post("/gst-calculator")
async def gst_calculator(
    body: GSTCalculatorRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate GST breakdown (CGST+SGST or IGST)."""
    result = calculate_gst(body.amount, body.rate, body.is_igst)
    await log_tool_use(db, current_user.id, "gst_calculator", request)
    return success_response(result, "GST calculated")


@router.post("/itc-checker")
async def itc_checker(
    body: ITCCheckerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate eligible Input Tax Credit."""
    result = calculate_itc(
        body.total_itc,
        body.ineligible_itc,
        body.reverse_charge_itc,
        body.exempt_supply_ratio,
    )
    await log_tool_use(db, current_user.id, "itc_checker", request)
    return success_response(result, "ITC calculated")


@router.get("/hsn-search")
async def hsn_search(
    q: str = Query(..., min_length=2, description="Search query (code or description)"),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search HSN/SAC codes."""
    results = search_hsn(q)
    await log_tool_use(db, current_user.id, "hsn_search", request)
    return success_response(results, f"Found {len(results)} results")


@router.get("/due-dates")
async def due_dates(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None, ge=2017, le=2030),
    current_user: User = Depends(get_current_user),
):
    """Get GST filing due dates."""
    dates = get_gst_due_dates(month, year)
    return success_response(dates)


@router.post("/late-fee-calculator")
async def late_fee_calculator(
    body: LateFeeRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate late fee for delayed GST return filing."""
    result = calculate_late_fee(
        body.return_type,
        body.due_date,
        body.filing_date,
        body.tax_liability,
    )
    if "error" in result:
        return {"success": False, "data": None, "message": result["error"]}
    await log_tool_use(db, current_user.id, "late_fee_calculator", request)
    return success_response(result, "Late fee calculated")


@router.post("/validate-gstin")
async def validate_gstin_endpoint(
    body: GSTINValidateRequest,
    current_user: User = Depends(get_current_user),
):
    """Validate a GSTIN number."""
    result = validate_gstin(body.gstin)
    return success_response(result)
