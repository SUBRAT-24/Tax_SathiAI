"""
GST Validator & Calculator Service.
GSTIN validation, HSN lookup, tax calculations, due dates.
"""

import re
from datetime import date, datetime
from typing import Optional


# Common HSN codes database (subset)
HSN_DATABASE = {
    "0101": {"description": "Live horses, asses, mules and hinnies", "rate": 0},
    "0201": {"description": "Meat of bovine animals, fresh or chilled", "rate": 0},
    "0401": {"description": "Milk and cream, not concentrated", "rate": 0},
    "0901": {"description": "Coffee (not roasted)", "rate": 5},
    "1006": {"description": "Rice", "rate": 5},
    "1905": {"description": "Bread, pastry, cakes, biscuits", "rate": 18},
    "2201": {"description": "Mineral waters, aerated water", "rate": 18},
    "2202": {"description": "Sweetened/flavoured aerated beverages", "rate": 28},
    "3004": {"description": "Medicaments, put up for retail sale", "rate": 12},
    "3304": {"description": "Beauty preparations, cosmetics", "rate": 28},
    "3401": {"description": "Soap and organic surface-active products", "rate": 18},
    "3926": {"description": "Other articles of plastics", "rate": 18},
    "4202": {"description": "Trunks, suitcases, bags", "rate": 18},
    "6109": {"description": "T-shirts, singlets, tank tops (knitted)", "rate": 5},
    "6203": {"description": "Men's suits, jackets, trousers (not knitted)", "rate": 12},
    "6403": {"description": "Footwear with outer soles of rubber/plastic", "rate": 18},
    "7113": {"description": "Articles of jewellery of precious metal", "rate": 3},
    "8415": {"description": "Air conditioning machines", "rate": 28},
    "8418": {"description": "Refrigerators, freezers", "rate": 18},
    "8443": {"description": "Printers, copiers, fax machines", "rate": 18},
    "8471": {"description": "Laptops and computers", "rate": 18},
    "8517": {"description": "Telephones, smartphones", "rate": 18},
    "8528": {"description": "Monitors, projectors, television receivers", "rate": 28},
    "8703": {"description": "Motor cars for transport of persons", "rate": 28},
    "8711": {"description": "Motorcycles and cycles with auxiliary motor", "rate": 28},
    "9401": {"description": "Seats and chairs", "rate": 18},
    "9403": {"description": "Other furniture", "rate": 18},
    "9503": {"description": "Toys, games, sports equipment", "rate": 12},
    "9954": {"description": "Construction services", "rate": 18},
    "9971": {"description": "Financial and related services", "rate": 18},
    "9973": {"description": "Leasing or rental services", "rate": 18},
    "9983": {"description": "Other professional, technical services", "rate": 18},
    "9988": {"description": "Manufacturing services on physical inputs", "rate": 18},
    "9992": {"description": "Education services", "rate": 0},
    "9993": {"description": "Health and social care services", "rate": 0},
    "9995": {"description": "Recreational, cultural, sporting services", "rate": 18},
    "9996": {"description": "Hotel accommodation services", "rate": 12},
    "9997": {"description": "IT and IT-enabled services", "rate": 18},
}


def validate_gstin(gstin: str) -> dict:
    """Validate GSTIN format and extract components."""
    gstin = gstin.strip().upper()

    if len(gstin) != 15:
        return {"valid": False, "error": "GSTIN must be exactly 15 characters"}

    pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
    if not re.match(pattern, gstin):
        return {"valid": False, "error": "Invalid GSTIN format"}

    state_code = gstin[:2]
    pan = gstin[2:12]

    # Valid state codes
    valid_states = {
        "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
        "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
        "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
        "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
        "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
        "16": "Tripura", "17": "Meghalaya", "18": "Assam",
        "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
        "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
        "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
        "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
        "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
        "36": "Telangana", "37": "Andhra Pradesh",
    }

    state_name = valid_states.get(state_code)
    if not state_name:
        return {"valid": False, "error": f"Invalid state code: {state_code}"}

    return {
        "valid": True,
        "gstin": gstin,
        "state_code": state_code,
        "state_name": state_name,
        "pan": pan,
        "entity_type": _get_entity_type(gstin[12]),
    }


def _get_entity_type(code: str) -> str:
    """Get entity type from 13th character of GSTIN."""
    types = {
        "1": "Proprietorship", "2": "Partnership", "3": "Company",
        "4": "Society/Trust/Club", "5": "NRI", "6": "Casual Taxable Person",
        "7": "Government", "8": "TDS", "9": "TCS",
    }
    return types.get(code, "Unknown")


def calculate_gst(amount: float, rate: float, is_igst: bool = False) -> dict:
    """Calculate GST breakdown (CGST + SGST or IGST)."""
    gst_amount = amount * (rate / 100)
    total = amount + gst_amount

    if is_igst:
        return {
            "base_amount": round(amount, 2),
            "gst_rate": rate,
            "igst": round(gst_amount, 2),
            "cgst": 0,
            "sgst": 0,
            "total_amount": round(total, 2),
            "tax_type": "IGST (Inter-state)",
        }
    else:
        half_gst = gst_amount / 2
        return {
            "base_amount": round(amount, 2),
            "gst_rate": rate,
            "igst": 0,
            "cgst": round(half_gst, 2),
            "sgst": round(half_gst, 2),
            "total_amount": round(total, 2),
            "tax_type": "CGST + SGST (Intra-state)",
        }


def search_hsn(query: str) -> list[dict]:
    """Search HSN codes by code or description."""
    query = query.lower().strip()
    results = []

    for code, info in HSN_DATABASE.items():
        if query in code or query in info["description"].lower():
            results.append({
                "hsn_code": code,
                "description": info["description"],
                "gst_rate": info["rate"],
            })

    return results[:20]


def calculate_late_fee(
    return_type: str,
    due_date: str,
    filing_date: str,
    tax_liability: float = 0,
) -> dict:
    """Calculate late fee for delayed GST return filing."""
    try:
        due = datetime.strptime(due_date, "%Y-%m-%d").date()
        filed = datetime.strptime(filing_date, "%Y-%m-%d").date()
    except ValueError:
        return {"error": "Invalid date format. Use YYYY-MM-DD."}

    if filed <= due:
        return {
            "late_fee": 0,
            "days_late": 0,
            "message": "Return filed on time. No late fee applicable.",
        }

    days_late = (filed - due).days

    # Late fee rules
    if return_type.upper() in ["GSTR-3B", "GSTR-1"]:
        if tax_liability == 0:
            # Nil return
            daily_fee = 20  # ₹10 CGST + ₹10 SGST
            max_fee = 500
        else:
            daily_fee = 50  # ₹25 CGST + ₹25 SGST
            max_fee = 10000
    elif return_type.upper() == "GSTR-9":
        daily_fee = 200  # ₹100 CGST + ₹100 SGST
        max_fee = min(tax_liability * 0.25, 50000) if tax_liability else 50000
    else:
        daily_fee = 50
        max_fee = 10000

    late_fee = min(days_late * daily_fee, max_fee)

    # Interest on tax liability (18% p.a.)
    interest = round(tax_liability * 0.18 * days_late / 365, 2)

    return {
        "return_type": return_type.upper(),
        "due_date": due_date,
        "filing_date": filing_date,
        "days_late": days_late,
        "daily_fee": daily_fee,
        "late_fee": round(late_fee, 2),
        "max_fee": max_fee,
        "interest_on_tax": interest,
        "total_penalty": round(late_fee + interest, 2),
        "breakdown": f"Late Fee: ₹{daily_fee}/day × {days_late} days = ₹{late_fee} (max ₹{max_fee})",
    }


def get_gst_due_dates(month: int = None, year: int = None) -> list[dict]:
    """Get GST filing due dates for a given month."""
    today = date.today()
    m = month or today.month
    y = year or today.year

    # Next month for return filing
    next_m = m + 1 if m < 12 else 1
    next_y = y if m < 12 else y + 1

    due_dates = [
        {
            "return_type": "GSTR-1",
            "description": "Details of outward supplies of goods/services",
            "due_date": f"{next_y}-{next_m:02d}-11",
            "frequency": "Monthly",
            "applicable_to": "All regular taxpayers with turnover > ₹5 Cr",
        },
        {
            "return_type": "GSTR-1 (QRMP)",
            "description": "Quarterly return for small taxpayers",
            "due_date": f"{next_y}-{next_m:02d}-13",
            "frequency": "Quarterly",
            "applicable_to": "Taxpayers with turnover up to ₹5 Cr (opted for QRMP)",
        },
        {
            "return_type": "GSTR-3B",
            "description": "Summary return with tax payment",
            "due_date": f"{next_y}-{next_m:02d}-20",
            "frequency": "Monthly",
            "applicable_to": "All regular taxpayers",
        },
        {
            "return_type": "GSTR-5",
            "description": "Return for Non-Resident Taxable Persons",
            "due_date": f"{next_y}-{next_m:02d}-20",
            "frequency": "Monthly",
            "applicable_to": "Non-resident taxable persons",
        },
        {
            "return_type": "GSTR-6",
            "description": "Return for Input Service Distributors",
            "due_date": f"{next_y}-{next_m:02d}-13",
            "frequency": "Monthly",
            "applicable_to": "Input Service Distributors",
        },
        {
            "return_type": "GSTR-7",
            "description": "Return for TDS deductors",
            "due_date": f"{next_y}-{next_m:02d}-10",
            "frequency": "Monthly",
            "applicable_to": "Persons deducting TDS under GST",
        },
        {
            "return_type": "GSTR-8",
            "description": "Return for E-commerce operators (TCS)",
            "due_date": f"{next_y}-{next_m:02d}-10",
            "frequency": "Monthly",
            "applicable_to": "E-commerce operators collecting TCS",
        },
    ]

    # Add annual returns if applicable
    if m == 12:  # December → Annual return due
        due_dates.append({
            "return_type": "GSTR-9",
            "description": "Annual return",
            "due_date": f"{y + 1}-12-31",
            "frequency": "Annual",
            "applicable_to": "All regular taxpayers with turnover > ₹2 Cr",
        })

    return due_dates


def calculate_itc(
    total_itc: float,
    ineligible_itc: float = 0,
    reverse_charge_itc: float = 0,
    exempt_supply_ratio: float = 0,
) -> dict:
    """Calculate eligible Input Tax Credit."""
    # Rule 42 proportional reversal
    reversal_for_exempt = total_itc * exempt_supply_ratio

    eligible = total_itc - ineligible_itc - reversal_for_exempt + reverse_charge_itc

    return {
        "total_itc_available": round(total_itc, 2),
        "ineligible_itc_sec17_5": round(ineligible_itc, 2),
        "reversal_for_exempt_rule42": round(reversal_for_exempt, 2),
        "reverse_charge_itc": round(reverse_charge_itc, 2),
        "net_eligible_itc": round(max(eligible, 0), 2),
        "itc_utilization_order": [
            "IGST → IGST liability → CGST liability → SGST liability",
            "CGST → CGST liability → IGST liability",
            "SGST → SGST liability → IGST liability",
        ],
    }
