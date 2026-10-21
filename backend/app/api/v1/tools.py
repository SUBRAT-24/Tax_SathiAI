"""
Tools API — GST Calculator, ITC Checker, HSN Search, Due Dates, Late Fee Calculator,
GSTIN Validator.

All response shapes are documented here; the frontend depends on these exact keys.
"""

from fastapi import APIRouter, Depends, Request, Query
from pydantic import BaseModel, Field
from typing import Optional
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
    amount: float = Field(..., gt=0, description="Amount in INR")
    rate: float = Field(..., ge=0, description="GST rate (%)")
    is_igst: bool = Field(default=False, description="True for inter-state (IGST)")
    tax_inclusive: bool = Field(default=False, description="True if amount includes tax")
    cess_rate: float = Field(default=0, ge=0, description="Compensation cess rate (%)")
    supply_date: Optional[str] = Field(default=None, description="Supply date (YYYY-MM-DD) for rate validation")


class LateFeeRequest(BaseModel):
    return_type: str = Field(..., description="e.g., GSTR-3B, GSTR-1, GSTR-9")
    due_date: str = Field(..., description="Due date (YYYY-MM-DD)")
    filing_date: str = Field(..., description="Actual filing date (YYYY-MM-DD)")
    tax_liability: float = Field(default=0, ge=0, description="Tax liability in INR")
    annual_turnover: float = Field(default=0, ge=0, description="Annual aggregate turnover in INR")
    turnover_in_state: float = Field(default=0, ge=0, description="Turnover in State/UT (for GSTR-9 cap)")


class ITCCheckerRequest(BaseModel):
    total_itc: float = Field(..., ge=0, description="Total ITC on inputs/input services (T)")
    itc_on_exempt_exclusive: float = Field(default=0, ge=0, description="ITC exclusively for exempt supplies (T2)")
    itc_on_non_business: float = Field(default=0, ge=0, description="ITC for non-business/personal use (T1)")
    itc_blocked_17_5: float = Field(default=0, ge=0, description="ITC blocked under Section 17(5) (T3)")
    itc_on_taxable_exclusive: float = Field(default=0, ge=0, description="ITC exclusively for taxable supplies (T4)")
    exempt_turnover: float = Field(default=0, ge=0, description="Exempt turnover for the period (E)")
    total_turnover: float = Field(default=0, ge=0, description="Total turnover in State (F)")
    reverse_charge_itc: float = Field(default=0, ge=0, description="ITC on reverse charge supplies")


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
    """Calculate GST breakdown (CGST+SGST or IGST), with optional cess."""
    result = calculate_gst(
        body.amount,
        body.rate,
        body.is_igst,
        body.tax_inclusive,
        body.cess_rate,
        body.supply_date,
    )
    if "error" in result:
        return {"success": False, "data": None, "message": result["error"]}
    await log_tool_use(db, current_user.id, "gst_calculator", request)
    return success_response(result, "GST calculated")


@router.post("/itc-checker")
async def itc_checker(
    body: ITCCheckerRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calculate eligible Input Tax Credit (Rule 42 breakdown)."""
    result = calculate_itc(
        total_itc=body.total_itc,
        itc_on_exempt_exclusive=body.itc_on_exempt_exclusive,
        itc_on_non_business=body.itc_on_non_business,
        itc_blocked_17_5=body.itc_blocked_17_5,
        itc_on_taxable_exclusive=body.itc_on_taxable_exclusive,
        exempt_turnover=body.exempt_turnover,
        total_turnover=body.total_turnover,
        reverse_charge_itc=body.reverse_charge_itc,
    )
    await log_tool_use(db, current_user.id, "itc_checker", request)
    return success_response(result, "ITC calculated")


@router.get("/hsn-search")
async def hsn_search(
    q: str = Query(..., min_length=2, description="Search query (code or description)"),
    as_of: str = Query(default=None, description="Effective date filter (YYYY-MM-DD)"),
    request: Request = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Search HSN/SAC codes."""
    results = search_hsn(q, as_of=as_of)
    await log_tool_use(db, current_user.id, "hsn_search", request)
    return success_response(results, f"Found {len(results)} results")


@router.get("/due-dates")
async def due_dates(
    month: int = Query(default=None, ge=1, le=12),
    year: int = Query(default=None, ge=2017, le=2035),
    as_of: Optional[str] = Query(default=None, description="As-of reference date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
):
    """Get GST filing due dates."""
    dates = get_gst_due_dates(month, year, as_of=as_of)
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
        body.annual_turnover,
        body.turnover_in_state,
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
    """Validate a GSTIN number (format, state code, check digit)."""
    result = validate_gstin(body.gstin)
    return success_response(result)
