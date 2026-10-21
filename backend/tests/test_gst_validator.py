"""
Unit tests for TaxSathi AI GST Validator & Tools.
Phase 1: Verification of tax calculator, HSN/SAC master, late fees, due dates, ITC checker, and GSTIN validator.

Every test names its official statutory source:
  - CGST Act, 2017 (Sections 9, 10, 16, 17, 44, 47, 50)
  - CGST Rules, 2017 (Rules 32, 42, 43, 59, 61, 62, 65, 66, 67)
  - CBIC Notifications:
      Notif. 1/2017-CT(Rate), Notif. 2/2017-CT(Rate), Notif. 11/2017-CT(Rate),
      Notif. 12/2017-CT(Rate), Notif. 19/2021-CT, Notif. 20/2021-CT,
      Notif. 07/2023-CT, Notif. 83/2020-CT
  - 56th GST Council Meeting Recommendations (22 Sep 2025)
  - GSTIN Mod-36 checksum specification per GSTN / ISO 7064 adaptation
"""

import os
from datetime import date
from decimal import Decimal
import pytest

from app.services.gst_validator import (
    calculate_gst,
    get_valid_rates,
    search_hsn,
    reload_hsn_data,
    calculate_late_fee,
    get_gst_due_dates,
    calculate_itc,
    validate_gstin,
    _compute_gstin_check_digit,
    GST_STATE_CODES,
    _RATE_CHANGE_DATE,
)


# ═══════════════════════════════════════════════════════════════════════
# 1. GST CALCULATOR & RATE VALIDATION TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_gst_rate_slabs_post_sept_2025():
    """Source: 56th GST Council Meeting (effective 22 Sep 2025)."""
    rates = get_valid_rates(date(2025, 9, 22))
    expected = {Decimal("0"), Decimal("0.25"), Decimal("3"), Decimal("5"), Decimal("18"), Decimal("40")}
    assert rates == expected


def test_gst_rate_slabs_legacy_pre_sept_2025():
    """Source: Notification No. 1/2017-Central Tax (Rate), 28 Jun 2017."""
    rates = get_valid_rates(date(2025, 9, 21))
    expected = {Decimal("0"), Decimal("0.25"), Decimal("3"), Decimal("5"), Decimal("12"), Decimal("18"), Decimal("28")}
    assert rates == expected


def test_gst_calculator_intra_state_split():
    """Source: CGST Act Section 9(1) & SGST Act Section 9(1) — equal 50:50 split."""
    res = calculate_gst(amount=10000.0, rate=18.0, is_igst=False, supply_date="2025-10-01")
    assert "error" not in res
    assert res["base_amount"] == 10000.0
    assert res["cgst"] == 900.0
    assert res["sgst"] == 900.0
    assert res["igst"] == 0.0
    assert res["total_amount"] == 11800.0
    assert res["tax_type"] == "CGST + SGST (Intra-state)"


def test_gst_calculator_inter_state_igst():
    """Source: IGST Act Section 5(1) — IGST levied on inter-state supply."""
    res = calculate_gst(amount=50000.0, rate=18.0, is_igst=True, supply_date="2025-10-01")
    assert "error" not in res
    assert res["base_amount"] == 50000.0
    assert res["igst"] == 9000.0
    assert res["cgst"] == 0.0
    assert res["sgst"] == 0.0
    assert res["total_amount"] == 59000.0
    assert res["tax_type"] == "IGST (Inter-state)"


def test_gst_calculator_tax_inclusive():
    """Source: CGST Rules, Rule 35 — extraction of tax amount when value is inclusive."""
    # ₹11,800 inclusive of 18% GST -> base = ₹10,000, CGST = ₹900, SGST = ₹900
    res = calculate_gst(amount=11800.0, rate=18.0, is_igst=False, tax_inclusive=True, supply_date="2025-10-01")
    assert "error" not in res
    assert res["base_amount"] == 10000.0
    assert res["cgst"] == 900.0
    assert res["sgst"] == 900.0
    assert res["total_amount"] == 11800.0


def test_gst_calculator_with_compensation_cess():
    """Source: Goods and Services Tax (Compensation to States) Act, 2017."""
    res = calculate_gst(
        amount=100000.0, rate=28.0, is_igst=True,
        cess_rate=15.0, supply_date="2024-05-01"
    )
    assert "error" not in res
    assert res["base_amount"] == 100000.0
    assert res["igst"] == 28000.0
    assert res["cess_amount"] == 15000.0
    assert res["total_amount"] == 143000.0


def test_gst_calculator_odd_paisa_rounding():
    """Source: CGST Rule 32 — odd paise rounding preserving total CGST+SGST = GST amount."""
    # ₹105 at 5% GST = ₹5.25. CGST = ₹2.63, SGST = ₹2.62, total = ₹5.25
    res = calculate_gst(amount=105.0, rate=5.0, is_igst=False, supply_date="2025-10-01")
    assert "error" not in res
    assert res["cgst"] + res["sgst"] == 5.25
    assert abs(res["cgst"] - res["sgst"]) == pytest.approx(0.01)


def test_gst_calculator_rejects_invalid_rate_for_date():
    """Source: 56th GST Council Meeting — 12% is invalid for supplies on or after 22 Sep 2025."""
    res = calculate_gst(amount=1000.0, rate=12.0, supply_date="2025-10-01")
    assert "error" in res
    assert "Invalid GST rate 12.0%" in res["error"]


def test_gst_calculator_accepts_12_percent_for_legacy_date():
    """Source: Notification No. 1/2017-CT(Rate) — 12% was valid before 22 Sep 2025."""
    res = calculate_gst(amount=1000.0, rate=12.0, supply_date="2024-01-15")
    assert "error" not in res
    assert res["total_amount"] == 1120.0


def test_gst_calculator_boundary_negative_amount_rejected():
    """Source: Basic validation — transaction amount must be positive."""
    res = calculate_gst(amount=-500.0, rate=18.0)
    assert "error" in res
    assert "Amount must be positive" in res["error"]


def test_gst_calculator_negative_cess_rejected():
    """Source: Basic validation — cess rate cannot be negative."""
    res = calculate_gst(amount=1000.0, rate=18.0, cess_rate=-5.0)
    assert "error" in res
    assert "Cess rate cannot be negative" in res["error"]


# ═══════════════════════════════════════════════════════════════════════
# 2. HSN / SAC SEARCH AND MASTER DATA TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_hsn_master_data_loader():
    """Source: CBIC HSN Rate Master JSON loader."""
    count = reload_hsn_data()
    assert count >= 20, f"Expected at least 20 HSN/SAC records in master, got {count}"


def test_hsn_search_by_exact_code():
    """Source: Notif. 1/2017-Central Tax (Rate), Heading 8471 (Computers & Laptops)."""
    results = search_hsn("8471")
    assert len(results) > 0
    match = results[0]
    assert match["hsn_code"] == "8471"
    assert "data processing machines" in match["description"].lower() or "computers" in match["description"].lower()
    assert match["gst_rate"] == 18


def test_hsn_search_by_prefix():
    """Source: Notif. 1/2017-Central Tax (Rate), Chapter 04 (Dairy produce)."""
    results = search_hsn("04")
    assert len(results) >= 2
    codes = [r["hsn_code"] for r in results]
    assert any(c.startswith("04") for c in codes)


def test_hsn_search_by_description_keyword():
    """Source: Notif. 1/2017-Central Tax (Rate) & Notif. 2/2017-CT(Rate), Rice (1006)."""
    results = search_hsn("rice")
    assert len(results) > 0
    assert any(r["hsn_code"] == "1006" for r in results)


def test_sac_search_services():
    """Source: Notif. 11/2017-Central Tax (Rate), Heading 9983 (Professional/Technical services)."""
    results = search_hsn("9983")
    assert len(results) > 0
    assert results[0]["hsn_code"] == "9983"
    assert results[0]["gst_rate"] == 18


def test_hsn_effective_date_filter_before_rationalization():
    """Source: Notif. 1/2017-CT(Rate) — Medicaments (3004) were 12% before 22 Sep 2025."""
    results = search_hsn("3004", as_of="2024-06-01")
    assert len(results) > 0
    assert any(r["gst_rate"] == 12 for r in results)


def test_hsn_effective_date_filter_after_rationalization():
    """Source: 56th GST Council Meeting — Medicaments (3004) rationalized to 5% from 22 Sep 2025."""
    results = search_hsn("3004", as_of="2025-10-01")
    assert len(results) > 0
    assert any(r["gst_rate"] == 5 for r in results)


def test_hsn_search_empty_query():
    """Source: Input safety — empty query returns empty list."""
    assert search_hsn("") == []
    assert search_hsn("   ") == []


# ═══════════════════════════════════════════════════════════════════════
# 3. LATE FEE & INTEREST CALCULATOR TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_late_fee_timely_filing():
    """Source: CGST Act Section 47 — no late fee if filed on or before due date."""
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2024-10-20",
        tax_liability=50000,
    )
    assert res["days_late"] == 0
    assert res["late_fee"] == 0
    assert res["interest_on_tax"] == 0
    assert res["total_penalty"] == 0


def test_late_fee_gstr3b_nil_return():
    """Source: Notif. 19/2021-Central Tax, 01 Jun 2021 — Nil return ₹20/day, max ₹500."""
    # 10 days late: 10 * ₹20 = ₹200 (below ₹500 cap)
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2024-10-30",
        tax_liability=0,
    )
    assert res["days_late"] == 10
    assert res["daily_fee"] == 20
    assert res["late_fee"] == 200.0
    assert res["is_nil_return"] is True


def test_late_fee_gstr3b_nil_return_cap():
    """Source: Notif. 19/2021-Central Tax — Nil return cap is ₹500."""
    # 40 days late: 40 * ₹20 = ₹800, capped at ₹500
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2024-11-29",
        tax_liability=0,
    )
    assert res["days_late"] == 40
    assert res["late_fee"] == 500.0


def test_late_fee_gstr3b_turnover_under_1_5cr():
    """Source: Notif. 19/2021-CT — Non-nil return, AATO <= ₹1.5 Cr: ₹50/day, capped at ₹2,000."""
    # 60 days late: 60 * ₹50 = ₹3000, capped at ₹2000
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2024-12-19",
        tax_liability=10000,
        annual_turnover=10000000,  # ₹1 Cr
    )
    assert res["daily_fee"] == 50
    assert res["late_fee"] == 2000.0


def test_late_fee_gstr3b_turnover_1_5cr_to_5cr():
    """Source: Notif. 19/2021-CT — Non-nil return, AATO ₹1.5 Cr - ₹5 Cr: ₹50/day, capped at ₹5,000."""
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2025-02-17",  # 120 days late: 120 * 50 = 6000, capped at 5000
        tax_liability=25000,
        annual_turnover=30000000,  # ₹3 Cr
    )
    assert res["late_fee"] == 5000.0


def test_late_fee_gstr3b_turnover_above_5cr():
    """Source: Notif. 19/2021-CT — Non-nil return, AATO > ₹5 Cr: ₹50/day, capped at ₹10,000."""
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2025-06-20",  # 243 days late: capped at ₹10,000
        tax_liability=100000,
        annual_turnover=100000000,  # ₹10 Cr
    )
    assert res["late_fee"] == 10000.0


def test_late_fee_gstr1_rules_match_3b():
    """Source: Notif. 20/2021-Central Tax, 01 Jun 2021 — GSTR-1 follows same slabs as GSTR-3B."""
    res = calculate_late_fee(
        return_type="GSTR-1",
        due_date="2024-10-11",
        filing_date="2024-10-21",
        tax_liability=0,
    )
    assert res["days_late"] == 10
    assert res["daily_fee"] == 20
    assert res["late_fee"] == 200.0


def test_late_fee_gstr9_annual_turnover_up_to_5cr():
    """Source: Notif. 07/2023-CT, 31 Mar 2023 — GSTR-9 AATO <= ₹5 Cr: ₹50/day, capped at 0.04% of turnover."""
    # 50 days late: 50 * ₹50 = ₹2500. Turnover in state = ₹2 Cr, cap = 0.04% of 2 Cr = ₹8,000.
    res = calculate_late_fee(
        return_type="GSTR-9",
        due_date="2024-12-31",
        filing_date="2025-02-19",
        annual_turnover=20000000,
        turnover_in_state=20000000,
    )
    assert res["daily_fee"] == 50
    assert res["late_fee"] == 2500.0


def test_late_fee_interest_on_net_tax_liability():
    """Source: CGST Act Section 50(1) — 18% p.a. simple interest on net tax paid late."""
    # ₹100,000 tax, 73 days late (73/365 = 0.2 year)
    # Interest = 100,000 * 0.18 * 0.2 = ₹3,600
    res = calculate_late_fee(
        return_type="GSTR-3B",
        due_date="2024-10-20",
        filing_date="2025-01-01",  # 73 days
        tax_liability=100000.0,
        annual_turnover=10000000.0,
    )
    assert res["days_late"] == 73
    assert res["interest_on_tax"] == pytest.approx(3600.0, abs=1.0)
    assert res["total_penalty"] == round(res["late_fee"] + 3600.0, 2)


def test_late_fee_unsupported_return_type():
    """Source: Input validation — unsupported return types return descriptive error."""
    res = calculate_late_fee("GSTR-4", "2024-10-20", "2024-10-25")
    assert "error" in res
    assert "Unsupported return type" in res["error"]


# ═══════════════════════════════════════════════════════════════════════
# 4. DUE DATES TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_due_dates_gstr1_monthly():
    """Source: CGST Rule 59(1) — GSTR-1 monthly is due on 11th of succeeding month."""
    dates = get_gst_due_dates(month=9, year=2024)
    gstr1 = next(d for d in dates if d["return_type"] == "GSTR-1")
    assert gstr1["due_date"] == "2024-10-11"
    assert "Rule 59(1)" in gstr1["source"]


def test_due_dates_gstr3b_monthly():
    """Source: CGST Rule 61(1) — GSTR-3B monthly is due on 20th of succeeding month."""
    dates = get_gst_due_dates(month=9, year=2024)
    gstr3b = next(d for d in dates if d["return_type"] == "GSTR-3B")
    assert gstr3b["due_date"] == "2024-10-20"
    assert "Rule 61(1)" in gstr3b["source"]


def test_due_dates_qrmp_returns_included_at_quarter_end():
    """Source: CGST Rule 59(2) & Notif. 83/2020-CT — QRMP quarterly returns in months 3, 6, 9, 12."""
    dates_q3 = get_gst_due_dates(month=9, year=2024)
    qrmp_1 = [d for d in dates_q3 if d["return_type"] == "GSTR-1 (QRMP)"]
    assert len(qrmp_1) == 1
    assert qrmp_1[0]["due_date"] == "2024-10-13"

    dates_non_q = get_gst_due_dates(month=10, year=2024)
    assert not any(d["return_type"] == "GSTR-1 (QRMP)" for d in dates_non_q)


def test_due_dates_gstr9_annual_return():
    """Source: CGST Act Section 44 — GSTR-9 due 31st December following the end of financial year."""
    dates = get_gst_due_dates(month=3, year=2024)
    gstr9 = next(d for d in dates if d["return_type"] == "GSTR-9")
    assert gstr9["due_date"] == "2024-12-31"


def test_due_dates_tds_tcs_isd():
    """Source: CGST Rules 65, 66, 67 — GSTR-6 (13th), GSTR-7 (10th), GSTR-8 (10th)."""
    dates = get_gst_due_dates(month=5, year=2024)
    gstr6 = next(d for d in dates if d["return_type"] == "GSTR-6")
    gstr7 = next(d for d in dates if d["return_type"] == "GSTR-7")
    gstr8 = next(d for d in dates if d["return_type"] == "GSTR-8")
    assert gstr6["due_date"] == "2024-06-13"
    assert gstr7["due_date"] == "2024-06-10"
    assert gstr8["due_date"] == "2024-06-10"


def test_due_dates_with_as_of_date_parameter():
    """Source: Feature verification — as_of parameter determines filing period."""
    dates = get_gst_due_dates(as_of="2024-09-15")
    gstr3b = next(d for d in dates if d["return_type"] == "GSTR-3B")
    assert gstr3b["due_date"] == "2024-10-20"


# ═══════════════════════════════════════════════════════════════════════
# 5. ITC CHECKER (RULES 42, 43 & SECTION 17(5)) TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_itc_fully_eligible_taxable_supplies():
    """Source: CGST Act Section 16(1) & Rule 42 — full ITC when used solely for taxable supplies."""
    res = calculate_itc(
        total_itc=100000.0,
        itc_on_taxable_exclusive=100000.0,
        total_turnover=500000.0,
        exempt_turnover=0.0,
    )
    assert res["net_eligible_itc"] == 100000.0
    assert res["total_ineligible_reversed"] == 0.0


def test_itc_blocked_under_section_17_5():
    """Source: CGST Act Section 17(5) — motor vehicles, food, health club membership blocked."""
    res = calculate_itc(
        total_itc=100000.0,
        itc_blocked_17_5=20000.0,
        itc_on_taxable_exclusive=80000.0,
    )
    assert res["net_eligible_itc"] == 80000.0
    assert res["total_ineligible_reversed"] == 20000.0


def test_itc_rule_42_apportionment_with_exempt_turnover():
    """Source: CGST Rule 42(1)(m) — D1 = (E/F) * C2."""
    # Total ITC = ₹100,000, C1 = ₹100,000, T4 = ₹40,000, C2 = ₹60,000
    # Exempt turnover (E) = ₹200,000, Total turnover (F) = ₹1,000,000 (ratio 20%)
    # D1 = 20% * 60,000 = ₹12,000
    # D2 = 5% * 60,000 = ₹3,000 (deemed non-business)
    # C3 = 60,000 - 15,000 = ₹45,000
    # Net eligible = T4 + C3 = 40,000 + 45,000 = ₹85,000
    res = calculate_itc(
        total_itc=100000.0,
        itc_on_taxable_exclusive=40000.0,
        exempt_turnover=200000.0,
        total_turnover=1000000.0,
    )
    assert res["net_eligible_itc"] == 85000.0
    assert res["total_ineligible_reversed"] == 15000.0


def test_itc_reverse_charge_is_100_percent_eligible():
    """Source: CGST Act Section 9(3)/(4) & Section 16(1) — RCM ITC is fully eligible."""
    res = calculate_itc(
        total_itc=50000.0,
        itc_on_taxable_exclusive=50000.0,
        reverse_charge_itc=15000.0,
    )
    assert res["reverse_charge_itc"] == 15000.0
    assert res["net_eligible_itc"] == 65000.0


def test_itc_explanation_steps_generated():
    """Source: Usability requirement — return explanation line for each step."""
    res = calculate_itc(
        total_itc=50000.0,
        itc_on_non_business=5000.0,
        itc_on_exempt_exclusive=5000.0,
        itc_blocked_17_5=5000.0,
        itc_on_taxable_exclusive=20000.0,
        exempt_turnover=100000.0,
        total_turnover=500000.0,
    )
    assert len(res["steps"]) >= 10
    step_labels = [s["label"] for s in res["steps"]]
    assert any("Section 17(5)" in l for l in step_labels)
    assert any("Rule 42" in s.get("source", "") for s in res["steps"])


# ═══════════════════════════════════════════════════════════════════════
# 6. GSTIN VALIDATOR & CHECK-DIGIT TESTS
# ═══════════════════════════════════════════════════════════════════════

def test_gstin_check_digit_algorithm():
    """Source: GSTN format specification / ISO 7064 Mod 37,36 adaptation."""
    # Verified real samples
    assert _compute_gstin_check_digit("09AAAUP8175A1Z") == "G"
    assert _compute_gstin_check_digit("29AAACI4798L1Z") == "U"
    assert _compute_gstin_check_digit("29AAACI4798L2Z") == "T"
    assert _compute_gstin_check_digit("29AAACI4798L3Z") == "S"
    assert _compute_gstin_check_digit("29AAACI4798L4Z") == "R"


def test_gstin_validate_real_valid_gstin():
    """Source: CGST Act Section 22/25 — valid Karnataka corporate GSTIN."""
    res = validate_gstin("29AAACI4798L1ZU")
    assert res["valid"] is True
    assert res["state_code"] == "29"
    assert res["state_name"] == "Karnataka"
    assert res["pan"] == "AAACI4798L"
    assert res["entity_type"] == "Proprietorship"  # Code 1
    assert res["check_digit"] == "U"


def test_gstin_validate_rejects_corrupted_check_digit():
    """Source: Check-digit mismatch detection."""
    # Changed last char from U to X
    res = validate_gstin("29AAACI4798L1ZX")
    assert res["valid"] is False
    assert "Check digit mismatch" in res["error"]


def test_gstin_validate_rejects_invalid_length():
    """Source: GSTIN is strictly 15 alphanumeric characters."""
    assert validate_gstin("29AAACI4798L1Z")["valid"] is False
    assert validate_gstin("29AAACI4798L1ZUU")["valid"] is False


def test_gstin_validate_rejects_invalid_state_code():
    """Source: State codes must exist in the official GST state list."""
    # 00 is not a valid state code
    res = validate_gstin("00AAACI4798L1ZU")
    assert res["valid"] is False
    assert "Invalid state code" in res["error"]


def test_gstin_state_codes_completeness():
    """Source: Census 2011 / CBIC State Codes including Ladakh, DNH & DD, Other Territory."""
    assert GST_STATE_CODES["01"] == "Jammu & Kashmir"
    assert GST_STATE_CODES["07"] == "Delhi"
    assert GST_STATE_CODES["26"] == "Dadra & Nagar Haveli and Daman & Diu"
    assert GST_STATE_CODES["27"] == "Maharashtra"
    assert GST_STATE_CODES["29"] == "Karnataka"
    assert GST_STATE_CODES["38"] == "Ladakh"
    assert GST_STATE_CODES["97"] == "Other Territory"
    assert GST_STATE_CODES["99"] == "Centre Jurisdiction"
    assert len(GST_STATE_CODES) >= 37
