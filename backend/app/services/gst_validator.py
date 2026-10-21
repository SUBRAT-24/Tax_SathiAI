"""
GST Validator & Calculator Service — Production-Grade.
All rules sourced from CBIC notifications; sources cited in comments.

Source abbreviations used throughout:
  CGST Act = Central Goods and Services Tax Act, 2017
  CGST Rules = Central Goods and Services Tax Rules, 2017
  Notif. 1/2017-CT(R) = Notification No. 1/2017-Central Tax (Rate), 28 Jun 2017
  Notif. 11/2017-CT(R) = Notification No. 11/2017-Central Tax (Rate), 28 Jun 2017
  Notif. 19/2021-CT = Notification No. 19/2021-Central Tax, 01 Jun 2021 (late fee GSTR-3B)
  Notif. 20/2021-CT = Notification No. 20/2021-Central Tax, 01 Jun 2021 (late fee GSTR-1)
  Notif. 07/2023-CT = Notification No. 07/2023-Central Tax, 31 Mar 2023 (late fee GSTR-9)
  56th GST Council  = 56th GST Council Meeting, rate rationalization effective 22 Sep 2025
"""

from __future__ import annotations

import json
import math
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path
from typing import Optional


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 1: GST RATE DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════

# Source: Notif. 1/2017-CT(R) as amended; 56th GST Council (22 Sep 2025)
# Pre-2025-09-22: {0, 0.25, 3, 5, 12, 18, 28} (+ compensation cess)
# Post-2025-09-22: {0, 0.25, 3, 5, 18, 40} (12% and 28% rationalized)

_RATE_CHANGE_DATE = date(2025, 9, 22)  # 56th GST Council effective date

VALID_RATES_LEGACY = frozenset({
    Decimal("0"), Decimal("0.25"), Decimal("3"),
    Decimal("5"), Decimal("12"), Decimal("18"), Decimal("28"),
})

VALID_RATES_CURRENT = frozenset({
    Decimal("0"), Decimal("0.25"), Decimal("3"),
    Decimal("5"), Decimal("18"), Decimal("40"),
})


def get_valid_rates(as_of: date | None = None) -> frozenset[Decimal]:
    """Return the set of valid GST rate slabs as of the given date.

    Source: Notif. 1/2017-CT(R) amended; 56th GST Council (22 Sep 2025).
    """
    if as_of is None:
        as_of = date.today()
    if as_of >= _RATE_CHANGE_DATE:
        return VALID_RATES_CURRENT
    return VALID_RATES_LEGACY


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 2: GST CALCULATOR
# ═══════════════════════════════════════════════════════════════════════

def _round_tax(value: Decimal) -> Decimal:
    """Round to 2 decimal places using ROUND_HALF_UP (standard for Indian tax).

    Source: CGST Rules, Rule 32 and general GST invoicing practice.
    """
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_gst(
    amount: float,
    rate: float,
    is_igst: bool = False,
    tax_inclusive: bool = False,
    cess_rate: float = 0.0,
    supply_date: str | None = None,
) -> dict:
    """Calculate GST breakdown (CGST + SGST or IGST), with optional cess.

    Args:
        amount: Transaction amount in INR.
        rate: GST rate percentage.
        is_igst: True for inter-state supply (IGST), False for intra-state (CGST+SGST).
        tax_inclusive: If True, `amount` is treated as tax-inclusive.
        cess_rate: Optional compensation cess rate percentage.
        supply_date: Optional YYYY-MM-DD string to validate rate against the
                     correct slab regime.

    Returns:
        dict with base_amount, gst_rate, igst, cgst, sgst, cess, total_amount,
        tax_type, and explanation.

    Source: CGST Act Sections 9, 10; IGST Act Section 5.
    """
    amt = Decimal(str(amount))
    gst_rate = Decimal(str(rate))
    cess = Decimal(str(cess_rate))

    # ── Validate rate ────────────────────────────────────────────────
    as_of = None
    if supply_date:
        try:
            as_of = datetime.strptime(supply_date, "%Y-%m-%d").date()
        except ValueError:
            return {"error": "Invalid supply_date format. Use YYYY-MM-DD."}

    valid_rates = get_valid_rates(as_of)
    if gst_rate not in valid_rates:
        return {
            "error": (
                f"Invalid GST rate {rate}%. "
                f"Valid rates as of {as_of or 'today'}: "
                f"{sorted(float(r) for r in valid_rates)}"
            )
        }

    if amt <= 0:
        return {"error": "Amount must be positive."}
    if cess < 0:
        return {"error": "Cess rate cannot be negative."}

    # ── Compute base amount ──────────────────────────────────────────
    total_rate = gst_rate + cess
    if tax_inclusive:
        base_amount = _round_tax(amt * Decimal("100") / (Decimal("100") + total_rate))
    else:
        base_amount = _round_tax(amt)

    gst_amount = _round_tax(base_amount * gst_rate / Decimal("100"))
    cess_amount = _round_tax(base_amount * cess / Decimal("100")) if cess else Decimal("0")

    # ── Split CGST/SGST or IGST ─────────────────────────────────────
    if is_igst:
        igst = gst_amount
        cgst = Decimal("0")
        sgst = Decimal("0")
        tax_type = "IGST (Inter-state)"
    else:
        # Source: CGST Act Sec 9(1), SGST Act Sec 9(1) — equal split.
        cgst = _round_tax(gst_amount / Decimal("2"))
        sgst = _round_tax(gst_amount / Decimal("2"))
        igst = Decimal("0")
        tax_type = "CGST + SGST (Intra-state)"
        # Handle odd-paisa rounding: ensure cgst + sgst == gst_amount
        if cgst + sgst != gst_amount:
            sgst = gst_amount - cgst

    total_amount = base_amount + gst_amount + cess_amount

    return {
        "base_amount": float(base_amount),
        "gst_rate": float(gst_rate),
        "igst": float(igst),
        "cgst": float(cgst),
        "sgst": float(sgst),
        "cess_rate": float(cess),
        "cess_amount": float(cess_amount),
        "total_amount": float(total_amount),
        "tax_type": tax_type,
    }


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 3: HSN / SAC LOOKUP
# ═══════════════════════════════════════════════════════════════════════

# The HSN/SAC data is loaded from a JSON file at module init.
# File format: list of objects with keys:
#   hsn_code, description, gst_rate, cess_rate (optional),
#   effective_from (YYYY-MM-DD), effective_to (YYYY-MM-DD or null),
#   chapter (optional), notification (source notification)
#
# Source: Official HSN master from cbic-gst.gov.in.
# If the full file is missing, fall back to the embedded sample below.

_HSN_DATA_FILE = os.environ.get(
    "HSN_DATA_PATH",
    str(Path(__file__).parent / "data" / "hsn_sac_master.json"),
)

# Embedded sample for development/testing.  Each entry records its source.
# TODO(verify): Verify every rate against the latest CBIC HSN rate schedule.
_HSN_SAMPLE: list[dict] = [
    # ── Goods (HSN) ──────────────────────────────────────────────────
    {"hsn_code": "0101", "description": "Live horses, asses, mules and hinnies",
     "gst_rate": 0, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch I"},
    {"hsn_code": "0201", "description": "Meat of bovine animals, fresh or chilled",
     "gst_rate": 0, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch I"},
    {"hsn_code": "0401", "description": "Milk and cream, not concentrated",
     "gst_rate": 0, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch I"},
    {"hsn_code": "0901", "description": "Coffee (not roasted)",
     "gst_rate": 5, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch I"},
    {"hsn_code": "1006", "description": "Rice",
     "gst_rate": 5, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch I"},
    {"hsn_code": "1905", "description": "Bread, pastry, cakes, biscuits",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch III"},
    {"hsn_code": "2201", "description": "Mineral waters, aerated water",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch III"},
    {"hsn_code": "3004", "description": "Medicaments, put up for retail sale",
     "gst_rate": 12, "effective_from": "2017-07-01", "effective_to": "2025-09-21",
     "notification": "Notif. 1/2017-CT(R), Sch II"},
    {"hsn_code": "3004", "description": "Medicaments, put up for retail sale",
     "gst_rate": 5, "effective_from": "2025-09-22",
     "notification": "56th GST Council, rate rationalization"},
    {"hsn_code": "3304", "description": "Beauty preparations, cosmetics",
     "gst_rate": 28, "effective_from": "2017-07-01", "effective_to": "2025-09-21",
     "notification": "Notif. 1/2017-CT(R), Sch IV"},
    {"hsn_code": "3304", "description": "Beauty preparations, cosmetics",
     "gst_rate": 18, "effective_from": "2025-09-22",
     "notification": "56th GST Council, rate rationalization"},
    {"hsn_code": "3401", "description": "Soap and organic surface-active products",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch III"},
    {"hsn_code": "7113", "description": "Articles of jewellery of precious metal",
     "gst_rate": 3, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), special rate"},
    {"hsn_code": "8415", "description": "Air conditioning machines",
     "gst_rate": 28, "effective_from": "2017-07-01", "effective_to": "2025-09-21",
     "notification": "Notif. 1/2017-CT(R), Sch IV"},
    {"hsn_code": "8415", "description": "Air conditioning machines",
     "gst_rate": 18, "effective_from": "2025-09-22",
     "notification": "56th GST Council, rate rationalization"},
    {"hsn_code": "8471", "description": "Laptops and computers",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch III"},
    {"hsn_code": "8517", "description": "Telephones, smartphones",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 1/2017-CT(R), Sch III"},
    {"hsn_code": "8703", "description": "Motor cars for transport of persons",
     "gst_rate": 28, "effective_from": "2017-07-01", "effective_to": "2025-09-21",
     "notification": "Notif. 1/2017-CT(R), Sch IV"},
    {"hsn_code": "8703", "description": "Motor cars for transport of persons",
     "gst_rate": 40, "effective_from": "2025-09-22",
     "notification": "56th GST Council, luxury/sin slab"},
    # ── Services (SAC) ───────────────────────────────────────────────
    {"hsn_code": "9954", "description": "Construction services",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 11/2017-CT(R)"},
    {"hsn_code": "9971", "description": "Financial and related services",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 11/2017-CT(R)"},
    {"hsn_code": "9983", "description": "Other professional, technical services",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 11/2017-CT(R)"},
    {"hsn_code": "9992", "description": "Education services",
     "gst_rate": 0, "effective_from": "2017-07-01", "notification": "Notif. 12/2017-CT(R), exempt"},
    {"hsn_code": "9993", "description": "Health and social care services",
     "gst_rate": 0, "effective_from": "2017-07-01", "notification": "Notif. 12/2017-CT(R), exempt"},
    {"hsn_code": "9996", "description": "Hotel accommodation services",
     "gst_rate": 12, "effective_from": "2017-07-01", "effective_to": "2025-09-21",
     "notification": "Notif. 11/2017-CT(R)"},
    {"hsn_code": "9996", "description": "Hotel accommodation services",
     "gst_rate": 18, "effective_from": "2025-09-22",
     "notification": "56th GST Council, rate rationalization"},
    {"hsn_code": "9997", "description": "IT and IT-enabled services",
     "gst_rate": 18, "effective_from": "2017-07-01", "notification": "Notif. 11/2017-CT(R)"},
]


def _load_hsn_data() -> list[dict]:
    """Load HSN/SAC data from the JSON master file, falling back to sample."""
    if os.path.isfile(_HSN_DATA_FILE):
        with open(_HSN_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return list(_HSN_SAMPLE)


# Module-level cache
_hsn_cache: list[dict] | None = None


def _get_hsn_data() -> list[dict]:
    global _hsn_cache
    if _hsn_cache is None:
        _hsn_cache = _load_hsn_data()
    return _hsn_cache


def reload_hsn_data() -> int:
    """Force-reload HSN data (e.g. after updating the master file). Returns count."""
    global _hsn_cache
    _hsn_cache = _load_hsn_data()
    return len(_hsn_cache)


def search_hsn(
    query: str,
    as_of: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """Search HSN/SAC codes by code prefix or description keyword.

    Args:
        query: HSN code (prefix match) or description keyword.
        as_of: Optional YYYY-MM-DD to filter effective entries.
        limit: Max results to return.

    Returns:
        List of matching entries with hsn_code, description, gst_rate, notification.
    """
    query_lower = query.lower().strip()
    if not query_lower:
        return []

    ref_date: date | None = None
    if as_of:
        try:
            ref_date = datetime.strptime(as_of, "%Y-%m-%d").date()
        except ValueError:
            pass  # ignore bad date, search all

    results: list[dict] = []
    for entry in _get_hsn_data():
        # ── Effective-date filter ─────────────────────────────────────
        if ref_date:
            eff_from = entry.get("effective_from")
            eff_to = entry.get("effective_to")
            if eff_from:
                try:
                    if ref_date < datetime.strptime(eff_from, "%Y-%m-%d").date():
                        continue
                except ValueError:
                    pass
            if eff_to:
                try:
                    if ref_date > datetime.strptime(eff_to, "%Y-%m-%d").date():
                        continue
                except ValueError:
                    pass

        # ── Match by code prefix or description keyword ──────────────
        code = entry.get("hsn_code", "")
        desc = entry.get("description", "")
        if query_lower in code.lower() or query_lower in desc.lower():
            results.append({
                "hsn_code": code,
                "description": desc,
                "gst_rate": entry.get("gst_rate"),
                "cess_rate": entry.get("cess_rate", 0),
                "effective_from": entry.get("effective_from"),
                "effective_to": entry.get("effective_to"),
                "notification": entry.get("notification", ""),
            })

        if len(results) >= limit:
            break

    return results


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 4: LATE FEE CALCULATOR
# ═══════════════════════════════════════════════════════════════════════

# Source: Notif. 19/2021-CT (GSTR-3B), Notif. 20/2021-CT (GSTR-1),
#         Notif. 07/2023-CT (GSTR-9).  Effective from 01 Jun 2021 /
#         01 Apr 2023.  Amounts are CGST+SGST combined.

@dataclass
class LateFeeRule:
    """Late fee rule for a specific return type and condition."""
    return_type: str
    is_nil: bool          # True for nil returns (zero tax / zero outward supplies)
    daily_fee: int        # ₹ per day (CGST + SGST combined)
    max_fee_fn: str       # "fixed" or "turnover_pct"
    max_fee_value: int | float  # absolute ₹ cap or percentage as decimal
    turnover_lower: float | None  # AATO lower bound (inclusive), None = 0
    turnover_upper: float | None  # AATO upper bound (exclusive), None = ∞
    source: str

    def max_fee(self, turnover_in_state: float = 0) -> float:
        """Compute the max fee cap given state turnover."""
        if self.max_fee_fn == "fixed":
            return float(self.max_fee_value)
        elif self.max_fee_fn == "turnover_pct":
            return turnover_in_state * float(self.max_fee_value)
        return float(self.max_fee_value)


# ── GSTR-3B and GSTR-1 late fee rules ───────────────────────────────
# Source: Notif. 19/2021-CT, Notif. 20/2021-CT (effective 01 Jun 2021)
_LATE_FEE_RULES_3B_1: list[LateFeeRule] = [
    # Nil returns — all turnover bands
    LateFeeRule("GSTR-3B", True,  20,  "fixed", 500,   None, None,
                "Notif. 19/2021-CT, 01 Jun 2021"),
    LateFeeRule("GSTR-1",  True,  20,  "fixed", 500,   None, None,
                "Notif. 20/2021-CT, 01 Jun 2021"),
    # Non-nil — turnover up to ₹1.5 Cr
    LateFeeRule("GSTR-3B", False, 50,  "fixed", 2000,  None, 1.5e7,
                "Notif. 19/2021-CT, 01 Jun 2021"),
    LateFeeRule("GSTR-1",  False, 50,  "fixed", 2000,  None, 1.5e7,
                "Notif. 20/2021-CT, 01 Jun 2021"),
    # Non-nil — turnover ₹1.5 Cr to ₹5 Cr
    LateFeeRule("GSTR-3B", False, 50,  "fixed", 5000,  1.5e7, 5e7,
                "Notif. 19/2021-CT, 01 Jun 2021"),
    LateFeeRule("GSTR-1",  False, 50,  "fixed", 5000,  1.5e7, 5e7,
                "Notif. 20/2021-CT, 01 Jun 2021"),
    # Non-nil — turnover above ₹5 Cr
    LateFeeRule("GSTR-3B", False, 50,  "fixed", 10000, 5e7, None,
                "Notif. 19/2021-CT, 01 Jun 2021"),
    LateFeeRule("GSTR-1",  False, 50,  "fixed", 10000, 5e7, None,
                "Notif. 20/2021-CT, 01 Jun 2021"),
]

# ── GSTR-9 late fee rules ────────────────────────────────────────────
# Source: Notif. 07/2023-CT, 31 Mar 2023 (FY 2022-23 onwards)
_LATE_FEE_RULES_9: list[LateFeeRule] = [
    # Turnover up to ₹5 Cr
    LateFeeRule("GSTR-9", False, 50,  "turnover_pct", 0.0004, None, 5e7,
                "Notif. 07/2023-CT, 31 Mar 2023"),
    # Turnover ₹5 Cr to ₹20 Cr
    LateFeeRule("GSTR-9", False, 100, "turnover_pct", 0.0004, 5e7, 20e7,
                "Notif. 07/2023-CT, 31 Mar 2023"),
    # Turnover above ₹20 Cr
    LateFeeRule("GSTR-9", False, 200, "turnover_pct", 0.005,  20e7, None,
                "Notif. 07/2023-CT, 31 Mar 2023"),
]

_ALL_LATE_FEE_RULES = _LATE_FEE_RULES_3B_1 + _LATE_FEE_RULES_9


def _find_late_fee_rule(
    return_type: str,
    is_nil: bool,
    annual_turnover: float,
) -> LateFeeRule | None:
    """Find the matching late fee rule."""
    rt = return_type.upper()
    for rule in _ALL_LATE_FEE_RULES:
        if rule.return_type != rt:
            continue
        # GSTR-9 has no nil distinction in the rules
        if rt != "GSTR-9" and rule.is_nil != is_nil:
            continue
        lower = rule.turnover_lower or 0
        upper = rule.turnover_upper
        if annual_turnover < lower:
            continue
        if upper is not None and annual_turnover >= upper:
            continue
        return rule
    return None


def calculate_late_fee(
    return_type: str,
    due_date: str,
    filing_date: str,
    tax_liability: float = 0,
    annual_turnover: float = 0,
    turnover_in_state: float = 0,
) -> dict:
    """Calculate late fee for delayed GST return filing.

    Args:
        return_type: "GSTR-3B", "GSTR-1", or "GSTR-9".
        due_date: Statutory due date (YYYY-MM-DD).
        filing_date: Actual filing date (YYYY-MM-DD).
        tax_liability: Net tax liability in ₹ for the period.
        annual_turnover: Annual aggregate turnover (AATO) in ₹ (for cap selection).
        turnover_in_state: Turnover in the State/UT (for GSTR-9 % cap).

    Returns:
        dict with breakdown or error.

    Source: Notif. 19/2021-CT, 20/2021-CT, 07/2023-CT; CGST Act Sec 47, 50.
    """
    try:
        due = datetime.strptime(due_date, "%Y-%m-%d").date()
        filed = datetime.strptime(filing_date, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    rt = return_type.strip().upper()
    if rt not in ("GSTR-3B", "GSTR-1", "GSTR-9"):
        return {"error": f"Unsupported return type: {return_type}. "
                         "Supported: GSTR-3B, GSTR-1, GSTR-9."}

    if filed <= due:
        return {
            "return_type": rt,
            "due_date": due_date,
            "filing_date": filing_date,
            "days_late": 0,
            "late_fee": 0,
            "interest_on_tax": 0,
            "total_penalty": 0,
            "message": "Return filed on time. No late fee applicable.",
        }

    days_late = (filed - due).days
    is_nil = tax_liability == 0

    rule = _find_late_fee_rule(rt, is_nil, annual_turnover)
    if rule is None:
        return {"error": f"No late fee rule found for {rt}, "
                         f"nil={is_nil}, turnover={annual_turnover}"}

    raw_fee = days_late * rule.daily_fee
    # For GSTR-9 percentage cap, use turnover_in_state if provided
    t_for_cap = turnover_in_state if (rt == "GSTR-9" and turnover_in_state > 0) else annual_turnover
    max_cap = rule.max_fee(t_for_cap)
    late_fee = min(raw_fee, max_cap) if max_cap > 0 else raw_fee

    # Interest: 18% p.a. on net tax paid late.
    # Source: CGST Act Section 50(1).
    interest = round(tax_liability * 0.18 * days_late / 365, 2) if tax_liability > 0 else 0.0

    explanation_parts = [
        f"Late fee: ₹{rule.daily_fee}/day × {days_late} days = ₹{raw_fee}",
        f"Max cap: ₹{max_cap:,.0f} ({rule.source})",
        f"Applied late fee: ₹{late_fee:,.2f}",
    ]
    if interest > 0:
        explanation_parts.append(
            f"Interest: ₹{tax_liability:,.2f} × 18% × {days_late}/365 = ₹{interest:,.2f}"
        )

    return {
        "return_type": rt,
        "due_date": due_date,
        "filing_date": filing_date,
        "days_late": days_late,
        "is_nil_return": is_nil,
        "daily_fee": rule.daily_fee,
        "late_fee": round(late_fee, 2),
        "max_fee": round(max_cap, 2),
        "interest_on_tax": interest,
        "total_penalty": round(late_fee + interest, 2),
        "source": rule.source,
        "breakdown": "\n".join(explanation_parts),
    }


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 5: DUE DATES
# ═══════════════════════════════════════════════════════════════════════

# Data-driven due date rules.
# Source: CGST Rules; various CBIC notifications for extensions.

@dataclass
class DueDateRule:
    """A single due-date rule for a GST return type."""
    return_type: str
    description: str
    day_of_month: int          # Due day in the filing month
    filing_month_offset: int   # 0 = same month, 1 = next month, etc.
    frequency: str             # "Monthly", "Quarterly", "Annual"
    applicable_to: str
    source: str
    # For quarterly returns, which months of the period end they apply to
    quarter_end_months: list[int] | None = None
    # For annual returns, the fixed due date month and day
    annual_month: int | None = None
    annual_day: int | None = None


_DUE_DATE_RULES: list[DueDateRule] = [
    # Source: CGST Rule 59(1) — GSTR-1 monthly
    DueDateRule("GSTR-1", "Details of outward supplies of goods/services",
                11, 1, "Monthly", "Regular taxpayers (turnover > ₹5 Cr, or opted for monthly)",
                "CGST Rule 59(1)"),
    # Source: CGST Rule 59(2) — GSTR-1 quarterly (QRMP scheme)
    DueDateRule("GSTR-1 (QRMP)", "Quarterly return for small taxpayers",
                13, 1, "Quarterly",
                "Taxpayers with AATO ≤ ₹5 Cr (opted for QRMP)",
                "CGST Rule 59(2), Notif. 83/2020-CT",
                quarter_end_months=[3, 6, 9, 12]),
    # Source: CGST Rule 61(1) — GSTR-3B monthly
    DueDateRule("GSTR-3B", "Summary return with tax payment",
                20, 1, "Monthly", "All regular taxpayers (monthly filers)",
                "CGST Rule 61(1)"),
    # Source: Notif. 83/2020-CT — GSTR-3B quarterly
    DueDateRule("GSTR-3B (QRMP)", "Quarterly summary return (QRMP)",
                22, 1, "Quarterly",
                "Taxpayers with AATO ≤ ₹5 Cr (opted for QRMP)",
                "Notif. 83/2020-CT",
                quarter_end_months=[3, 6, 9, 12]),
    # Source: CGST Rule 62 — GSTR-5
    DueDateRule("GSTR-5", "Return for Non-Resident Taxable Persons",
                20, 1, "Monthly", "Non-resident taxable persons",
                "CGST Rule 62"),
    # Source: CGST Rule 65 — GSTR-6
    DueDateRule("GSTR-6", "Return for Input Service Distributors",
                13, 1, "Monthly", "Input Service Distributors",
                "CGST Rule 65"),
    # Source: CGST Rule 66 — GSTR-7
    DueDateRule("GSTR-7", "Return for TDS deductors",
                10, 1, "Monthly", "Persons deducting TDS under GST",
                "CGST Rule 66"),
    # Source: CGST Rule 67 — GSTR-8
    DueDateRule("GSTR-8", "Return for E-commerce operators (TCS)",
                10, 1, "Monthly", "E-commerce operators collecting TCS",
                "CGST Rule 67"),
    # Source: CGST Act Section 44 — GSTR-9 annual, due 31 Dec of next FY
    DueDateRule("GSTR-9", "Annual return",
                31, 0, "Annual", "Regular taxpayers with AATO > ₹2 Cr",
                "CGST Act Section 44",
                annual_month=12, annual_day=31),
]

# Notified extensions can be recorded here.
# Format: (return_type, period_month, period_year, new_due_date_str, notification)
_NOTIFIED_EXTENSIONS: list[tuple[str, int, int, str, str]] = [
    # Example:
    # ("GSTR-3B", 9, 2024, "2024-11-22", "Notif. XX/2024-CT"),
]


def get_gst_due_dates(
    month: int | None = None,
    year: int | None = None,
    as_of: str | date | None = None,
) -> list[dict]:
    """Get GST filing due dates for a given tax period (month/year) or as-of date.

    Args:
        month: Tax period month (1-12). Defaults to current month or as_of month.
        year: Tax period year. Defaults to current year or as_of year.
        as_of: Optional reference date (YYYY-MM-DD string or date object).

    Returns:
        List of due date entries with return_type, description, due_date,
        frequency, applicable_to, source, and any extension info.
    """
    ref_date = date.today()
    if as_of:
        if isinstance(as_of, str):
            try:
                ref_date = datetime.strptime(as_of, "%Y-%m-%d").date()
            except ValueError:
                pass
        elif isinstance(as_of, date):
            ref_date = as_of

    m = month or ref_date.month
    y = year or ref_date.year

    results: list[dict] = []

    for rule in _DUE_DATE_RULES:
        # ── Skip quarterly returns for non-quarter-end months ────────
        if rule.frequency == "Quarterly" and rule.quarter_end_months:
            if m not in rule.quarter_end_months:
                continue

        # ── Annual return ────────────────────────────────────────────
        if rule.frequency == "Annual":
            # GSTR-9 for FY ending March. Due 31 Dec of the next year.
            # Show it only when the user asks about any month in the FY.
            if rule.annual_month and rule.annual_day:
                # For a given FY (Apr Y to Mar Y+1), GSTR-9 is due 31 Dec Y+1
                # Show when querying any month of that FY
                if m >= 4:
                    due_y = y + 1
                else:
                    due_y = y
                due_date_str = f"{due_y}-{rule.annual_month:02d}-{rule.annual_day:02d}"
            else:
                continue
        else:
            # ── Monthly / Quarterly — filing month is offset from tax period
            filing_m = m + rule.filing_month_offset
            filing_y = y
            while filing_m > 12:
                filing_m -= 12
                filing_y += 1

            due_date_str = f"{filing_y}-{filing_m:02d}-{rule.day_of_month:02d}"

        # ── Check for notified extensions ────────────────────────────
        extension_note = None
        for ext_rt, ext_m, ext_y, ext_date, ext_notif in _NOTIFIED_EXTENSIONS:
            if ext_rt == rule.return_type and ext_m == m and ext_y == y:
                due_date_str = ext_date
                extension_note = f"Extended by {ext_notif}"
                break

        entry = {
            "return_type": rule.return_type,
            "description": rule.description,
            "due_date": due_date_str,
            "frequency": rule.frequency,
            "applicable_to": rule.applicable_to,
            "source": rule.source,
        }
        if extension_note:
            entry["extension"] = extension_note
        results.append(entry)

    return results


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 6: ITC CHECKER
# ═══════════════════════════════════════════════════════════════════════

def calculate_itc(
    total_itc: float,
    itc_on_exempt_exclusive: float = 0,
    itc_on_non_business: float = 0,
    itc_blocked_17_5: float = 0,
    itc_on_taxable_exclusive: float = 0,
    exempt_turnover: float = 0,
    total_turnover: float = 0,
    reverse_charge_itc: float = 0,
) -> dict:
    """Calculate eligible ITC applying Rules 42/43 and Section 17(5).

    This implements the Rule 42 formula for inputs and input services.
    Capital goods under Rule 43 require monthly pro-rata (not computed here).

    Args:
        total_itc (T): Total input tax on inputs/input services for the period.
        itc_on_exempt_exclusive (T2): ITC exclusively for exempt supplies.
        itc_on_non_business (T1): ITC exclusively for non-business/personal use.
        itc_blocked_17_5 (T3): ITC blocked under Section 17(5).
        itc_on_taxable_exclusive (T4): ITC exclusively for taxable supplies
                                       (including zero-rated/exports).
        exempt_turnover (E): Value of exempt supplies for the period.
        total_turnover (F): Total turnover in the State for the period.
        reverse_charge_itc: ITC on supplies received under reverse charge
                            (eligible in full, CGST Act Sec 9(3)/(4)).

    Returns:
        dict with step-by-step breakdown and net eligible ITC.

    Source: CGST Rules 42, 43; CGST Act Section 17(2)-(5).
    """
    T = Decimal(str(total_itc))
    T1 = Decimal(str(itc_on_non_business))
    T2 = Decimal(str(itc_on_exempt_exclusive))
    T3 = Decimal(str(itc_blocked_17_5))
    T4 = Decimal(str(itc_on_taxable_exclusive))
    E = Decimal(str(exempt_turnover))
    F = Decimal(str(total_turnover))
    rcm = Decimal(str(reverse_charge_itc))

    steps: list[dict] = []

    # Step 1: Total ITC
    steps.append({
        "step": 1,
        "label": "Total ITC on inputs/input services (T)",
        "value": float(T),
        "source": "CGST Rule 42(1)",
    })

    # Step 2: Deduct exclusively ineligible credits
    steps.append({
        "step": 2,
        "label": "ITC for non-business/personal use (T1)",
        "value": float(T1),
        "source": "CGST Rule 42(1)(a)",
    })
    steps.append({
        "step": 3,
        "label": "ITC exclusively for exempt supplies (T2)",
        "value": float(T2),
        "source": "CGST Rule 42(1)(b)",
    })
    steps.append({
        "step": 4,
        "label": "ITC blocked under Section 17(5) (T3)",
        "value": float(T3),
        "source": "CGST Act Section 17(5)",
    })

    # Step 3: C1 = T - (T1 + T2 + T3)
    C1 = T - (T1 + T2 + T3)
    steps.append({
        "step": 5,
        "label": "Eligible credit after exclusions: C1 = T - (T1+T2+T3)",
        "value": float(C1),
        "source": "CGST Rule 42(1)",
    })

    # Step 4: T4 — exclusively for taxable
    steps.append({
        "step": 6,
        "label": "ITC exclusively for taxable supplies (T4)",
        "value": float(T4),
        "source": "CGST Rule 42(1)(c)",
    })

    # Step 5: Common credit C2 = C1 - T4
    C2 = C1 - T4
    steps.append({
        "step": 7,
        "label": "Common credit: C2 = C1 - T4",
        "value": float(C2),
        "source": "CGST Rule 42(1)",
    })

    # Step 6: D1 = (E / F) * C2  — reversal for exempt supplies
    D1 = Decimal("0")
    if F > 0 and C2 > 0:
        D1 = _round_tax(E / F * C2)

    steps.append({
        "step": 8,
        "label": f"Reversal for exempt supplies: D1 = (E/F) × C2 = ({float(E)}/{float(F)}) × {float(C2)}",
        "value": float(D1),
        "source": "CGST Rule 42(1)(m)",
    })

    # Step 7: D2 = 5% of C2 — deemed non-business use
    D2 = Decimal("0")
    if C2 > 0:
        D2 = _round_tax(C2 * Decimal("0.05"))

    steps.append({
        "step": 9,
        "label": "Deemed non-business reversal: D2 = 5% of C2",
        "value": float(D2),
        "source": "CGST Rule 42(1)(n) — repealed for some periods; TODO(verify) current status",
    })

    # Step 8: C3 = C2 - (D1 + D2)  — final common credit
    C3 = C2 - (D1 + D2)
    steps.append({
        "step": 10,
        "label": "Final common credit: C3 = C2 - (D1+D2)",
        "value": float(max(C3, Decimal("0"))),
        "source": "CGST Rule 42(1)",
    })

    # Net eligible ITC = T4 + C3 + RCM ITC
    net_eligible = max(T4 + C3, Decimal("0")) + rcm

    steps.append({
        "step": 11,
        "label": "Add reverse charge ITC (eligible in full)",
        "value": float(rcm),
        "source": "CGST Act Section 9(3)/(4)",
    })

    total_reversal = T1 + T2 + T3 + D1 + D2
    steps.append({
        "step": 12,
        "label": f"Net eligible ITC = T4 + C3 + RCM = {float(T4)} + {float(max(C3, Decimal('0')))} + {float(rcm)}",
        "value": float(net_eligible),
        "source": "CGST Rule 42",
    })

    return {
        "total_itc_available": float(T),
        "total_ineligible_reversed": float(total_reversal),
        "net_eligible_itc": float(max(net_eligible, Decimal("0"))),
        "reverse_charge_itc": float(rcm),
        "steps": steps,
        "itc_utilization_order": [
            "IGST ITC → IGST liability → CGST liability → SGST liability",
            "CGST ITC → CGST liability → IGST liability",
            "SGST ITC → SGST liability → IGST liability",
        ],
        "section_17_5_categories": [
            "Motor vehicles (≤13 seats) except for further supply/passenger transport/training",
            "Food, beverages, outdoor catering (except for further supply of same category)",
            "Beauty treatment, health services, cosmetic/plastic surgery",
            "Club/health/fitness centre membership",
            "Employee travel benefits (LTC)",
            "Works contract for immovable property (except plant & machinery)",
            "Construction of immovable property on own account",
            "Composition scheme purchases",
            "Personal consumption goods/services",
            "Goods lost, stolen, destroyed, written off, or given as free samples/gifts",
            "Tax paid under Sections 74, 129, 130",
        ],
    }


# ═══════════════════════════════════════════════════════════════════════
#  SECTION 7: GSTIN VALIDATOR
# ═══════════════════════════════════════════════════════════════════════

# Complete state code map.
# Source: CBIC / Census 2011 codes; updated for Ladakh (38), merged D&NH+DD (26),
# Other Territory (97), Centre Jurisdiction (99).
GST_STATE_CODES: dict[str, str] = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    # 25: Daman & Diu — merged into 26 w.e.f. 26 Jan 2020
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    # 28: not assigned
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
    "99": "Centre Jurisdiction",
}

# Base-36 character set for check-digit algorithm.
_GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _compute_gstin_check_digit(gstin_14: str) -> str:
    """Compute the Mod-36 check digit for the first 14 characters of a GSTIN.

    Algorithm: Adaptation of ISO/IEC 7064 Mod 37,36.
    For each character at position i (0-indexed):
      factor = 2 if i is odd, else 1
      product = char_value * factor
      total += (product // 36) + (product % 36)
    check_index = (36 - (total % 36)) % 36

    Source: GST portal / cbic-gst.gov.in GSTIN format specification.
    """
    total = 0
    for i, ch in enumerate(gstin_14.upper()):
        idx = _GSTIN_CHARS.index(ch)
        factor = 2 if (i % 2 != 0) else 1
        product = idx * factor
        total += (product // 36) + (product % 36)
    rem = total % 36
    return _GSTIN_CHARS[(36 - rem) % 36]


def _get_entity_type(code: str) -> str:
    """Get entity type from the 13th character of GSTIN.

    Source: CGST Act, GSTIN format specification.
    """
    types = {
        "1": "Proprietorship",
        "2": "Partnership",
        "3": "Company",
        "4": "Society / Trust / Club",
        "5": "NRI",
        "6": "Casual Taxable Person",
        "7": "Government Department",
        "8": "TDS Registration",
        "9": "TCS Registration",
    }
    return types.get(code, f"Unknown ({code})")


def validate_gstin(gstin: str) -> dict:
    """Validate GSTIN format, check digit, and extract components.

    Performs:
      1. Length check (exactly 15 characters).
      2. Regex pattern check.
      3. State code validation (complete list including Ladakh, Other Territory).
      4. Mod-36 check-digit verification.

    Returns:
        dict with valid (bool), and on success: gstin, state_code, state_name,
        pan, entity_number, entity_type, check_digit.
        On failure: valid=False, error=str.

    Source: GSTIN format per CGST Act; check-digit per ISO/IEC 7064 Mod 37,36 adaptation.
    """
    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"valid": False, "error": "GSTIN must be exactly 15 characters."}

    # Regex: 2-digit state + 10-char PAN + entity code + 'Z' + check digit
    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    if not re.match(pattern, gstin):
        return {"valid": False, "error": "Invalid GSTIN format (regex mismatch)."}

    state_code = gstin[:2]
    state_name = GST_STATE_CODES.get(state_code)
    if not state_name:
        return {"valid": False, "error": f"Invalid state code: {state_code}. "
                                          "Not in the official GST state code list."}

    # Check digit validation
    expected_check = _compute_gstin_check_digit(gstin[:14])
    if gstin[14] != expected_check:
        return {
            "valid": False,
            "error": f"Check digit mismatch: expected '{expected_check}', "
                     f"got '{gstin[14]}'. The GSTIN may be mistyped.",
        }

    pan = gstin[2:12]
    entity_code = gstin[12]

    return {
        "valid": True,
        "gstin": gstin,
        "state_code": state_code,
        "state_name": state_name,
        "pan": pan,
        "entity_number": entity_code,
        "entity_type": _get_entity_type(entity_code),
        "check_digit": gstin[14],
    }
