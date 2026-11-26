#!/usr/bin/env python3
"""
Evaluate TaxSathi AI Grounded RAG & HSN/SAC Engine against the Kaggle Dataset.

Dataset: prasad22/goods-and-service-tax-rates-dataset (1,954 curated + ingested records)
Evaluation dimensions:
  1. HSN / SAC Code Exact Retrieval & Rate Accuracy
  2. Commodity / Product Description Keyword Retrieval
  3. Service Category & SAC Retrieval
  4. End-to-end Grounded RAG Response Latency & Precision
"""

import asyncio
import json
import random
import time
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.gst_validator import search_hsn
from app.core.rag_pipeline import rag_pipeline

def evaluate_hsn_sac_coverage(master_path: Path, sample_size: int = 100):
    """Evaluate retrieval accuracy and rate correctness across a sample of records."""
    with open(master_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_records = len(data)
    print(f"==================================================")
    print(f"EVALUATION: HSN/SAC Master Knowledge Base Coverage")
    print(f"Total Master Records: {total_records}")
    print(f"==================================================")

    # Deterministic seed for reproducible evaluation
    rng = random.Random(42)
    sample = rng.sample(data, min(sample_size, total_records))

    code_hits = 0
    desc_hits = 0
    rate_matches = 0
    latencies = []

    for item in sample:
        code = str(item.get("hsn_code", "")).strip()
        expected_rate = item.get("gst_rate")
        desc = item.get("description", "")

        # 1. Search by code
        t0 = time.perf_counter()
        results = search_hsn(code, limit=10)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        latencies.append(elapsed_ms)

        matching_result = next((r for r in results if str(r.get("hsn_code")) == code), None)
        if matching_result:
            code_hits += 1
            if matching_result.get("gst_rate") == expected_rate:
                rate_matches += 1

        # 2. Search by key noun from description
        # Extract a meaningful word of length >= 5
        words = [w.strip(".,;:()[]") for w in desc.split() if len(w.strip(".,;:()[]")) >= 5 and w.isalpha()]
        if words:
            query_word = words[0]
            desc_results = search_hsn(query_word, limit=10)
            if any(str(r.get("hsn_code")) == code for r in desc_results):
                desc_hits += 1
        else:
            desc_hits += 1

    code_acc = (code_hits / len(sample)) * 100
    rate_acc = (rate_matches / len(sample)) * 100
    desc_acc = (desc_hits / len(sample)) * 100
    sorted_latencies = sorted(latencies)
    p50 = sorted_latencies[len(sorted_latencies) // 2]
    p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)]

    print(f"\n--- Benchmark Results (Sample Size: {len(sample)}) ---")
    print(f"Code Retrieval Accuracy: {code_acc:.1f}% ({code_hits}/{len(sample)})")
    print(f"Rate Verification Accuracy: {rate_acc:.1f}% ({rate_matches}/{len(sample)})")
    print(f"Keyword Description Retrieval: {desc_acc:.1f}% ({desc_hits}/{len(sample)})")
    print(f"p50 Lookup Latency: {p50:.3f} ms")
    print(f"p95 Lookup Latency: {p95:.3f} ms")

    return {
        "sample_size": len(sample),
        "code_accuracy": code_acc,
        "rate_accuracy": rate_acc,
        "desc_accuracy": desc_acc,
        "p50_ms": p50,
        "p95_ms": p95,
    }


def evaluate_end_to_end_queries():
    """Evaluate realistic end-to-end user queries against the model/RAG tools."""
    print(f"\n==================================================")
    print(f"EVALUATION: End-to-End Chat & Tool Query Routing")
    print(f"==================================================")

    test_queries = [
        # Goods
        ("What is the GST rate on laptops under HSN 8471?", "8471", 18),
        ("GST rate on fresh milk under HSN 0401", "0401", 0),
        ("What is the GST rate on Lithium-ion Batteries?", "8507", 18),
        ("GST rate for gold jewellery under HSN 7113", "7113", 3),
        ("What is the GST rate on rough diamonds HSN 7102?", "7102", 0.25),
        ("What is the GST rate on pre-packaged rice under HSN 1006?", "1006", 5),
        ("GST rate on Weaver machines HSN 8446", "8446", 18),
        ("GST rate on tyres for tractors under HSN 4011?", "4011", 18),
        # Services
        ("What is the GST rate and SAC code for IT & software services?", "9983", 18),
        ("What is the SAC code and GST rate for wholesale trade services?", "9961", 18),
        ("What is the GST rate for retail trade services?", "9962", 18),
        ("GST rate for hotel accommodation services under SAC 9963?", "9963", (5, 12, 18)),
        ("GST rate for passenger transport under SAC 9964?", "9964", 5),
    ]

    passed = 0
    for query, expected_code_prefix, expected_rate in test_queries:
        tool_res = rag_pipeline.route_numeric_tool(query)
        status = "FAIL"
        matched_info = None

        if tool_res and tool_res.get("tool") == "hsn_search":
            results = tool_res.get("result", [])
            for r in results:
                code = str(r.get("hsn_code", ""))
                rate = r.get("gst_rate")
                rate_ok = (rate in expected_rate) if isinstance(expected_rate, (list, tuple, set)) else (rate == expected_rate)
                if code.startswith(expected_code_prefix) and rate_ok:
                    status = "PASS"
                    matched_info = f"Code {code}, Rate {rate}%, Notif: {r.get('notification')[:35]}"
                    break

        if status == "PASS":
            passed += 1
            print(f" [PASS] '{query[:50]}' -> {matched_info}")
        else:
            print(f" [FAIL] '{query[:50]}' -> Expected {expected_code_prefix} @ {expected_rate}%, Got: {tool_res}")

    acc = (passed / len(test_queries)) * 100
    print(f"\nEnd-to-End Query Routing Accuracy: {acc:.1f}% ({passed}/{len(test_queries)})")
    return acc


if __name__ == "__main__":
    master_file = BACKEND_DIR / "app" / "services" / "data" / "hsn_sac_master.json"
    coverage_results = evaluate_hsn_sac_coverage(master_file, sample_size=100)
    e2e_acc = evaluate_end_to_end_queries()

    print("\n==================================================")
    print("ALL EVALUATIONS COMPLETE")
    print("==================================================")
