#!/usr/bin/env python3
"""
Ingest Kaggle Goods and Services Tax Rates Dataset into TaxSathi AI HSN/SAC Master.

Dataset: prasad22/goods-and-service-tax-rates-dataset
Source files:
  - Goods.csv (1,850 rows)
  - Services.csv (232 rows)

Enriches backend/app/services/data/hsn_sac_master.json while preserving
curated statutory rates and 56th GST Council rationalization records.
"""

import csv
import json
import os
import re
from pathlib import Path

GOODS_PATH = os.path.expanduser(
    r"~/.cache/kagglehub/datasets/prasad22/goods-and-service-tax-rates-dataset/versions/1/Goods.csv"
)
SERVICES_PATH = os.path.expanduser(
    r"~/.cache/kagglehub/datasets/prasad22/goods-and-service-tax-rates-dataset/versions/1/Services.csv"
)
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
MASTER_JSON_PATH = BACKEND_DIR / "app" / "services" / "data" / "hsn_sac_master.json"


def extract_hsn_codes(code_text: str) -> list[str]:
    """Extract 4-digit, 6-digit, 8-digit HSN codes from text."""
    if not code_text:
        return []
    text = re.sub(r"\s+", " ", code_text).strip()
    extracted = set()

    # 8-digit tariff items: "1109 00 00" -> 11090000, 1109
    for m in re.finditer(r"\b(\d{4})\s+(\d{2})\s+(\d{2})\b", text):
        full_8 = f"{m.group(1)}{m.group(2)}{m.group(3)}"
        extracted.add(full_8)
        extracted.add(m.group(1))

    # 6-digit items: "0101 29" -> 010129, 0101
    for m in re.finditer(r"\b(\d{4})\s+(\d{2})\b", text):
        full_6 = f"{m.group(1)}{m.group(2)}"
        extracted.add(full_6)
        extracted.add(m.group(1))

    # Standalone 4-digit headings: "0202", "8471"
    for m in re.finditer(r"\b(\d{4})\b", text):
        extracted.add(m.group(1))

    # 2-digit chapter if no 4+ digit codes exist: "Chapter 30", "63"
    if not extracted:
        for m in re.finditer(r"\b(\d{2})\b", text):
            if m.group(1) != "00":
                extracted.add(m.group(1))

    return sorted(list(extracted))


def parse_rate(rate_str: str) -> float | int | None:
    """Parse percentage or decimal rate string into float/int percent."""
    if not rate_str:
        return None
    cleaned = rate_str.strip().lower()
    if cleaned in ("nil", "0", "0.0", "exempt", "exempted"):
        return 0

    m = re.search(r"^(\d+(?:\.\d+)?)", cleaned)
    if not m:
        return None
    val = float(m.group(1))
    if 0 < val <= 1.0:
        val = val * 100
    val = round(val, 2)
    return int(val) if val.is_integer() else val


def main():
    if not os.path.exists(GOODS_PATH) or not os.path.exists(SERVICES_PATH):
        raise FileNotFoundError(f"Kaggle dataset not found at {GOODS_PATH} or {SERVICES_PATH}")

    # 1. Load curated master records
    with open(MASTER_JSON_PATH, "r", encoding="utf-8") as f:
        curated_records = json.load(f)

    print(f"Loaded {len(curated_records)} existing curated records from {MASTER_JSON_PATH.name}")

    # Track codes and keys to preserve existing curated entries
    curated_codes = {str(r.get("hsn_code")).strip() for r in curated_records}

    new_records = []

    # 2. Ingest Goods.csv
    goods_count = 0
    with open(GOODS_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.reader(f)
        hdr = next(reader)
        col_map = {name.replace("\n", " ").strip(): idx for idx, name in enumerate(hdr)}
        igst_col = [idx for name, idx in col_map.items() if "IGST Rate" in name][0]
        desc_col = [idx for name, idx in col_map.items() if "Description" in name][0]
        code_col = [idx for name, idx in col_map.items() if "Chapter" in name or "Heading" in name][0]
        sched_col = [idx for name, idx in col_map.items() if "Schedule" in name][0]
        cess_col = [idx for name, idx in col_map.items() if "Cess" in name][0]

        for row in reader:
            raw_code = row[code_col] if len(row) > code_col else ""
            desc = row[desc_col] if len(row) > desc_col else ""
            igst_str = row[igst_col] if len(row) > igst_col else ""
            sched = row[sched_col] if len(row) > sched_col else ""
            cess_str = row[cess_col] if len(row) > cess_col else ""

            desc_clean = re.sub(r"\s+", " ", desc).strip()
            if not desc_clean or desc_clean.lower() in ("[omitted]", "[omitted", "omitted"):
                continue

            rate = parse_rate(igst_str)
            if rate is None:
                continue

            cess_rate = 0
            m_cess = re.search(r"(\d+(?:\.\d+)?)%", cess_str)
            if m_cess:
                cess_rate = float(m_cess.group(1))

            codes = extract_hsn_codes(raw_code)
            if not codes:
                continue

            sched_clean = sched.strip()
            notif = (
                f"Notification No. 1/2017-Central Tax (Rate), Schedule {sched_clean}"
                if sched_clean
                else "Notification No. 1/2017-Central Tax (Rate)"
            )

            for code in codes:
                if code in curated_codes:
                    continue
                chapter = code[:2]
                new_records.append({
                    "hsn_code": code,
                    "description": desc_clean,
                    "chapter": chapter,
                    "gst_rate": rate,
                    "cess_rate": cess_rate,
                    "effective_from": "2017-07-01",
                    "effective_to": None,
                    "notification": notif,
                })
                goods_count += 1

    print(f"Parsed {goods_count} valid goods entries from Goods.csv")

    # 3. Ingest Services.csv
    services_count = 0
    with open(SERVICES_PATH, "r", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            heading = row.get("Chapter, Section  or Heading", "").strip()
            desc = row.get("Description of Service", "").strip()
            igst_str = row.get("IGST Rate(%)", "").strip()

            desc_clean = re.sub(r"\s+", " ", desc).strip()
            if not desc_clean or desc_clean in ("(3)", "All Services", "Construction Services"):
                continue

            rate = parse_rate(igst_str)
            if rate is None:
                continue

            # Find SAC codes in heading or description
            sac_codes = re.findall(r"\b(99\d{2,4})\b", heading)
            if not sac_codes:
                sac_codes = re.findall(r"\b(99\d{2,4})\b", desc_clean)

            if not sac_codes:
                continue

            for sac in set(sac_codes):
                if sac in curated_codes:
                    continue
                new_records.append({
                    "hsn_code": sac,
                    "description": desc_clean[:250],
                    "chapter": "99",
                    "gst_rate": rate,
                    "cess_rate": 0,
                    "effective_from": "2017-07-01",
                    "effective_to": None,
                    "notification": "Notification No. 11/2017-Central Tax (Rate)",
                })
                services_count += 1

    print(f"Parsed {services_count} valid service entries from Services.csv")

    # Deduplicate new_records
    seen = set()
    unique_new = []
    for r in new_records:
        k = (r["hsn_code"], r["gst_rate"], r["description"][:50])
        if k not in seen:
            seen.add(k)
            unique_new.append(r)

    print(f"Deduplicated to {len(unique_new)} unique new records.")

    # Merge: curated records first (so rationalized rates take precedence), then new
    final_master = list(curated_records) + unique_new
    print(f"Total merged records: {len(final_master)}")

    # Write to master JSON
    with open(MASTER_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_master, f, indent=2, ensure_ascii=False)

    print(f"Successfully saved {len(final_master)} records to {MASTER_JSON_PATH}")


if __name__ == "__main__":
    main()
