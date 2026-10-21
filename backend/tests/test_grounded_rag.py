"""
Unit tests for Grounded RAG Pipeline (Phase 2).
Tests hybrid search, BM25 indexing and persistence, recency and non-superseded ranking,
query expansion bypass for exact statutory citations, reranker fallback, refusal threshold,
citation verification, and deterministic numeric tool routing.
"""

import json
import os
import sys
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest

# Ensure root directory is in sys.path for scripts import
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.core.hybrid_search import BM25Index, HybridSearch
from app.core.query_expander import QueryExpander
from app.core.reranker import Reranker
from app.core.rag_pipeline import RAGPipeline, REFUSAL_MESSAGE
from scripts.ingest import parse_legal_structure, is_superseded, extract_effective_date


# ═══════════════════════════════════════════════════════════════════════
# 1. BM25 INDEXING, SCORING, AND PERSISTENCE
# ═══════════════════════════════════════════════════════════════════════

def test_bm25_index_add_and_search():
    """Verify BM25 keyword matching returns relevant documents with positive scores."""
    idx = BM25Index()
    docs = [
        ("doc1", "Section 16 of CGST Act provides eligibility for input tax credit on business purchases.", {"doc": "cgst"}),
        ("doc2", "Section 17(5) lists blocked credits including motor vehicles and food and beverages.", {"doc": "cgst"}),
        ("doc3", "Rule 42 describes the formula for apportionment of credit on common inputs.", {"doc": "rules"}),
    ]
    idx.add_documents(docs)
    assert idx.n_docs == 3

    results = idx.search("motor vehicles blocked credit", top_k=2)
    assert len(results) > 0
    assert results[0]["id"] == "doc2"
    assert "Section 17(5)" in results[0]["text"]


def test_bm25_persistence_and_reload():
    """Verify BM25 index can be serialized to disk and reloaded identically."""
    idx = BM25Index()
    docs = [
        ("sec16", "Input tax credit eligibility conditions under Section 16", {"section": "Section 16"}),
        ("sec17", "Blocked credits under Section 17(5)", {"section": "Section 17"}),
    ]
    idx.add_documents(docs)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        tmp_path = f.name

    try:
        idx.save(tmp_path)
        assert os.path.isfile(tmp_path)

        # Reload into fresh index
        new_idx = BM25Index()
        loaded = new_idx.load(tmp_path)
        assert loaded is True
        assert new_idx.n_docs == 2
        assert "sec16" in [d[0] for d in new_idx.documents]

        search_res = new_idx.search("eligibility Section 16")
        assert len(search_res) > 0
        assert search_res[0]["id"] == "sec16"
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# ═══════════════════════════════════════════════════════════════════════
# 2. PROVING BM25 CONTRIBUTES TO HYBRID SEARCH RESULTS
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_bm25_contributes_to_hybrid_results():
    """Prove that BM25 contributes to final ranking by boosting a keyword-exact document

    that had lower or zero rank in pure vector search.
    """
    hs = HybridSearch(auto_load=False)
    # Document A has the exact keyword 'HSN 8471'
    # Document B is general text
    hs.index_documents([
        ("doc_keyword", "HSN 8471 covers automatic data processing machines and laptops.", {"doc_name": "HSN_Master"}),
        ("doc_other", "General electronic goods and electrical appliances under GST.", {"doc_name": "Tariff"}),
    ], persist=False)

    # Simulate vector search where doc_other was ranked #1 and doc_keyword was ranked #2
    vector_results = [
        {"id": "doc_other", "text": "General electronic goods...", "score": 0.85, "metadata": {}},
        {"id": "doc_keyword", "text": "HSN 8471 covers...", "score": 0.40, "metadata": {}},
    ]

    # Query with exact keyword "HSN 8471"
    fused = await hs.search("HSN 8471", vector_results, top_k=2, bm25_weight=0.5, vector_weight=0.5)

    # BM25 found doc_keyword as rank 1, lifting its fused RRF score above doc_other
    assert fused[0]["id"] == "doc_keyword"
    assert fused[0]["bm25_rank"] == 1


# ═══════════════════════════════════════════════════════════════════════
# 3. RECENCY & SUPERSEDED METADATA WEIGHTING
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_superseded_downweighting_in_hybrid_search():
    """Verify that superseded statutory provisions are penalized relative to current ones."""
    hs = HybridSearch(auto_load=False)
    hs.index_documents([
        ("old_rule", "Rate of tax on air conditioning machines is 28 percent.", {
            "superseded": True, "effective_date": "2017-07-01",
        }),
        ("new_rule", "Rate of tax on air conditioning machines rationalized to 18 percent.", {
            "superseded": False, "effective_date": "2025-09-22",
        }),
    ], persist=False)

    # Both documents have identical vector ranking
    vector_results = [
        {"id": "old_rule", "text": "Rate of tax 28%", "score": 0.80, "metadata": {"superseded": True}},
        {"id": "new_rule", "text": "Rate of tax 18%", "score": 0.80, "metadata": {"superseded": False, "effective_date": "2025-09-22"}},
    ]

    results = await hs.search("rate of tax air conditioning", vector_results, top_k=2)
    # The active/new rule must rank first due to superseded penalty (0.35x) and 2025 recency boost (1.25x)
    assert results[0]["id"] == "new_rule"
    assert results[1]["id"] == "old_rule"
    assert results[0]["score"] > results[1]["score"] * 2


# ═══════════════════════════════════════════════════════════════════════
# 4. QUERY EXPANSION BYPASS FOR EXACT / SHORT QUERIES
# ═══════════════════════════════════════════════════════════════════════

def test_skip_query_expansion_for_exact_and_short_queries():
    """Verify query expander skips LLM expansion for exact statutory identifiers and short terms."""
    qe = QueryExpander()

    # Exact statutory citations and codes must be skipped
    assert qe.should_skip_expansion("Section 17(5)") is True
    assert qe.should_skip_expansion("sec 16") is True
    assert qe.should_skip_expansion("Rule 42") is True
    assert qe.should_skip_expansion("HSN 8471") is True
    assert qe.should_skip_expansion("GSTR-3B") is True
    assert qe.should_skip_expansion("29AAACI4798L1ZU") is True
    assert qe.should_skip_expansion("gst rate") is True  # 2 words <= 3 words

    # Complex descriptive questions must NOT be skipped
    assert qe.should_skip_expansion(
        "Can a manufacturing company claim input tax credit on corporate catering services provided to employees during shift hours"
    ) is False


@pytest.mark.asyncio
async def test_expand_returns_single_query_when_skipped():
    """Verify expand() returns only [query] without LLM calls when skipped."""
    qe = QueryExpander()
    res = await qe.expand("Section 17(5)")
    assert res == ["Section 17(5)"]


# ═══════════════════════════════════════════════════════════════════════
# 5. RERANKER FALLBACK & RETRIEVAL RESILIENCE
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_reranker_fallback_graceful_without_api_key():
    """Verify reranker gracefully falls back to score sorting when Cohere API is absent."""
    r = Reranker()
    r.client = None  # Force no client

    docs = [
        {"id": "doc1", "text": "Low score doc", "score": 0.25},
        {"id": "doc2", "text": "High score doc", "score": 0.88},
        {"id": "doc3", "text": "Medium score doc", "score": 0.55},
    ]

    reranked = await r.rerank("input tax credit", docs, top_k=2)
    assert len(reranked) == 2
    assert reranked[0]["id"] == "doc2"
    assert reranked[0]["rerank_score"] == 0.88
    assert reranked[1]["id"] == "doc3"


# ═══════════════════════════════════════════════════════════════════════
# 6. REFUSAL THRESHOLD BEHAVIOR
# ═══════════════════════════════════════════════════════════════════════

@pytest.mark.asyncio
async def test_rag_refusal_when_below_threshold():
    """Verify RAG pipeline returns refusal message pointing to official portals
    when retrieved documents score below the configured refusal threshold.
    """
    rag = RAGPipeline()
    rag.refusal_threshold = 0.50

    with patch("app.core.rag_pipeline.vector_store.search", new_callable=AsyncMock, return_value=[]), \
         patch("app.core.rag_pipeline.query_expander.expand", new_callable=AsyncMock, return_value=["non_tax_query"]):
        res = await rag.query("non_tax_query")
        assert res["refusal"] is True
        assert "https://cbic-gst.gov.in" in res["answer"]
        assert res["confidence"] == 0.0


# ═══════════════════════════════════════════════════════════════════════
# 7. POST-GENERATION CITATION VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

def test_citation_verification_flags_invented_sources():
    """Verify citation verifier detects and flags citations not present in retrieved set."""
    rag = RAGPipeline()

    retrieved_docs = [
        {"metadata": {"doc_name": "CGST_Act_2017.txt", "section": "Section 16"}},
        {"metadata": {"doc_name": "CGST_Rules_2017.txt", "section": "Rule 42"}},
    ]

    # Model generated response with one real citation and one hallucinated citation
    generated = (
        "Under [Source: CGST_Act_2017.txt, Section 16], registered taxpayers are entitled to ITC. "
        "However, per [Source: FakeNotification_99/2099-CT, Section 999], all credits are frozen."
    )

    verified = rag._verify_citations(generated, retrieved_docs)
    # Real citation remains
    assert "[Source: CGST_Act_2017.txt, Section 16]" in verified
    # Hallucinated citation is flagged
    assert "[Citation unverified against retrieved set: FakeNotification_99/2099-CT, Section 999]" in verified


# ═══════════════════════════════════════════════════════════════════════
# 8. DETERMINISTIC NUMERIC TOOL ROUTING
# ═══════════════════════════════════════════════════════════════════════

def test_numeric_tool_routing_gst_calculator():
    """Verify deterministic routing intercepts GST calculation requests."""
    rag = RAGPipeline()
    routed = rag.route_numeric_tool("Calculate gst on 100000 at 18%")
    assert routed is not None
    assert routed["tool"] == "gst_calculator"
    assert routed["result"]["cgst"] == 9000.0
    assert routed["result"]["sgst"] == 9000.0


def test_numeric_tool_routing_gstin_validation():
    """Verify deterministic routing intercepts GSTIN validation requests."""
    rag = RAGPipeline()
    routed = rag.route_numeric_tool("Please validate gstin 29AAACI4798L1ZU")
    assert routed is not None
    assert routed["tool"] == "validate_gstin"
    assert routed["result"]["valid"] is True
    assert routed["result"]["state_name"] == "Karnataka"


def test_numeric_tool_routing_due_dates():
    """Verify deterministic routing intercepts return due date questions."""
    rag = RAGPipeline()
    routed = rag.route_numeric_tool("What is the due date for GSTR-1?")
    assert routed is not None
    assert routed["tool"] == "due_dates"
    assert any(d["return_type"] == "GSTR-1" for d in routed["result"])


# ═══════════════════════════════════════════════════════════════════════
# 9. LEGAL STRUCTURE PARSER & METADATA EXTRACTION
# ═══════════════════════════════════════════════════════════════════════

def test_legal_structure_chunking_and_metadata():
    """Verify statutory text is parsed by legal section into structured chunks with metadata."""
    sample_statute = """
Section 16. Eligibility for input tax credit.
Every registered person shall be entitled to take credit of input tax.
(2) No credit unless tax invoice is held and goods received.

Section 17. Blocked credits.
Motor vehicles for transport of persons having seating capacity up to thirteen are blocked.
"""
    chunks = parse_legal_structure("CGST_Act.txt", sample_statute)
    assert len(chunks) >= 2
    sections = [c["metadata"]["section"] for c in chunks]
    assert "Section 16" in sections
    assert "Section 17" in sections
    assert all(c["metadata"]["doc_name"] == "CGST_Act.txt" for c in chunks)
    assert all("effective_date" in c["metadata"] for c in chunks)


def test_superseded_detection_utility():
    """Verify detection of repeal and omission phrasing in statutory text."""
    text_active = "The tax shall be levied at eighteen percent on supply."
    text_repealed = "Sub-clause (b) shall stand omitted w.e.f. 01 August 2021 by Finance Act."

    assert is_superseded(text_active) is False
    assert is_superseded(text_repealed) is True
