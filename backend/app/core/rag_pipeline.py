"""
RAG Pipeline — Production-Grade Statutory Tax Compliance Orchestrator.

Flow:
1. Deterministic Tool Routing for Numeric/Formula Questions (Rates, Late Fees, Due Dates, ITC, GSTIN)
2. Exact/Short Query Expansion Bypass
3. Hybrid Retrieval (Vector + BM25) with Recency & Non-superseded Prioritization (Top ~20)
4. Cross-Encoder Reranking (Top 5) with Graceful Fallback
5. Refusal on Low Confidence / Out-of-Domain Below Threshold
6. Generation with Post-Generation Citation Verification
"""

from __future__ import annotations

import json
import re
import time
from typing import AsyncGenerator, Optional

from app.config import settings
from app.core.query_expander import query_expander
from app.core.vector_store import vector_store
from app.core.hybrid_search import hybrid_search
from app.core.reranker import reranker
from app.core.llm_handler import llm_handler
from app.services.gst_validator import (
    calculate_gst,
    calculate_late_fee,
    get_gst_due_dates,
    calculate_itc,
    validate_gstin,
    search_hsn,
)


SYSTEM_PROMPT = """You are TaxSathi AI, an authoritative Indian GST & tax compliance assistant.

RULES:
1. Base your answer strictly on the PROVIDED CONTEXT and DETERMINISTIC TOOL RESULTS below.
2. Never invent tax rates, late fees, due dates, section numbers, or notifications.
3. If deterministic tool results are provided, explain those exact numbers step-by-step. Do NOT change or recalculate them.
4. When citing, cite ONLY sources present in the context. Format: [Source: doc_name, section].
5. If the context does not contain the answer, state clearly that official guidance was not found.
6. Always append the statutory disclaimer: "⚠️ This is AI-generated tax guidance based on CBIC notifications, not legal advice. Please verify with a qualified CA."
7. Highlight key statutory sections, monetary figures, and deadlines in bold.

CONTEXT:
{context}

CONVERSATION HISTORY:
{history}
"""

REFUSAL_MESSAGE = (
    "I cannot find sufficiently authoritative information in the official GST knowledge base to answer this question with certainty.\n\n"
    "To ensure legal and financial accuracy, please consult official CBIC resources:\n"
    "• CBIC GST Portal: https://cbic-gst.gov.in\n"
    "• GST Services Portal: https://services.gst.gov.in\n"
    "• Or consult a qualified Chartered Accountant (CA)."
)


class RAGPipeline:
    """Production-grade RAG pipeline orchestrator with grounded citations and deterministic routing."""

    def __init__(self):
        self.refusal_threshold = getattr(settings, "RAG_REFUSAL_THRESHOLD", 0.25)
        self.retrieve_top_k = getattr(settings, "RAG_RETRIEVE_TOP_K", 20)
        self.rerank_top_k = getattr(settings, "RAG_RERANK_TOP_K", 5)

    def route_numeric_tool(self, query: str) -> Optional[dict]:
        """Detect and execute deterministic tools for numeric / computational queries."""
        q = query.strip().lower()

        # 1. GST Calculation: e.g. "calculate gst on 10000 at 18%", "gst on 50000 18% igst"
        calc_match = re.search(r'(?:gst|tax)\s+on\s+(?:₹|rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]+)?).*?([0-9]+(?:\.[0-9]+)?)\s*%', q)
        if calc_match:
            try:
                amt = float(calc_match.group(1).replace(",", ""))
                rate = float(calc_match.group(2))
                is_igst = "igst" in q or "inter" in q
                inclusive = "inclusive" in q or "including" in q
                res = calculate_gst(amount=amt, rate=rate, is_igst=is_igst, tax_inclusive=inclusive)
                if "error" not in res:
                    return {"tool": "gst_calculator", "result": res}
            except Exception:
                pass

        # 2. GSTIN Validation: e.g. "validate gstin 29AAACI4798L1ZU"
        gstin_match = re.search(r'\b([0-9]{2}[a-z]{5}[0-9]{4}[a-z]{1}[1-9a-z]{1}z[0-9a-z]{1})\b', q, re.IGNORECASE)
        if "gstin" in q and gstin_match:
            gstin = gstin_match.group(1).upper()
            res = validate_gstin(gstin)
            return {"tool": "validate_gstin", "result": res}

        # 3. Late fee query: e.g. "late fee for GSTR-3B filed 10 days late"
        late_match = re.search(r'late\s*fee.*?gstr[- ]?(3b|1|9)', q, re.IGNORECASE)
        if late_match:
            days_match = re.search(r'(\d+)\s*days?\s*late', q, re.IGNORECASE)
            days = int(days_match.group(1)) if days_match else 10
            rt = f"GSTR-{late_match.group(1).upper()}"
            is_nil = "nil" in q or "zero" in q
            res = calculate_late_fee(
                return_type=rt,
                due_date="2024-10-20",
                filing_date=f"2024-10-{20 + min(days, 10):02d}",
                tax_liability=0 if is_nil else 50000,
            )
            return {"tool": "late_fee_calculator", "result": res}

        # 4. Due dates: e.g. "due date for gstr-1", "when is gstr-3b due"
        if ("due date" in q or "last date" in q or "deadline" in q) and ("gstr" in q or "return" in q):
            dates = get_gst_due_dates()
            return {"tool": "due_dates", "result": dates}

        # 5. HSN code direct search: e.g. "hsn code for rice", "hsn 8471"
        hsn_match = re.search(r'hsn(?:\s*code)?\s*(?:for)?\s*([a-z0-9\s]+)', q)
        if hsn_match:
            keyword = hsn_match.group(1).strip()
            if keyword and len(keyword) >= 2:
                results = search_hsn(keyword, limit=5)
                if results:
                    return {"tool": "hsn_search", "result": results}

        return None

    async def query(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        top_k: int = 5,
    ) -> dict:
        """Process user query through the grounded RAG pipeline."""
        start_time = time.time()

        # 1. Check for deterministic tool routing
        tool_result = self.route_numeric_tool(user_query)

        # 2. Query expansion (skipping exact/short queries)
        query_variants = await query_expander.expand(user_query, num_variants=2)

        # 3. Retrieve ~20 candidates via vector search
        all_vector_results = []
        for variant in query_variants:
            v_results = await vector_store.search(variant, top_k=self.retrieve_top_k)
            all_vector_results.extend(v_results)

        # Deduplicate vector candidates by id
        seen_ids = set()
        unique_vector = []
        for r in all_vector_results:
            rid = str(r.get("id"))
            if rid not in seen_ids:
                seen_ids.add(rid)
                unique_vector.append(r)

        # 4. Hybrid Search Fusion with BM25 (RRF + recency & superseded weights)
        hybrid_candidates = await hybrid_search.search(
            user_query,
            unique_vector,
            top_k=self.retrieve_top_k,
        )

        if not hybrid_candidates:
            hybrid_candidates = unique_vector

        # 5. Rerank down to top 5
        reranked = await reranker.rerank(
            user_query,
            hybrid_candidates,
            top_k=self.rerank_top_k,
        )

        # 6. Check Refusal Threshold
        top_score = reranked[0].get("rerank_score", 0.0) if reranked else 0.0
        is_refusal = (top_score < self.refusal_threshold) and (tool_result is None)

        if is_refusal:
            response_time = int((time.time() - start_time) * 1000)
            return {
                "answer": REFUSAL_MESSAGE,
                "sources": [],
                "confidence": 0.0,
                "intent": "refusal_out_of_domain",
                "response_time_ms": response_time,
                "query_variants": query_variants,
                "refusal": True,
            }

        # 7. Build Context
        context_blocks = []
        if tool_result:
            context_blocks.append(
                f"[Deterministic Statutory Tool Result — {tool_result['tool']}]\n"
                f"{json.dumps(tool_result['result'], indent=2)}"
            )

        context_blocks.append(self._build_context(reranked))
        context_str = "\n\n---\n\n".join(context_blocks)
        sources = self._extract_sources(reranked)
        history_str = self._format_history(chat_history)

        # 8. LLM Generation
        prompt = SYSTEM_PROMPT.format(context=context_str, history=history_str)
        full_prompt = f"{prompt}\n\nUser Question: {user_query}"
        raw_answer = await llm_handler.generate(full_prompt)

        # 9. Citation Verification (strip or flag unverified invented citations)
        verified_answer = self._verify_citations(raw_answer, reranked, tool_result)

        confidence = self._calculate_confidence(reranked, verified_answer, tool_result)
        response_time = int((time.time() - start_time) * 1000)

        return {
            "answer": verified_answer,
            "sources": sources,
            "confidence": round(confidence, 2),
            "intent": tool_result["tool"] if tool_result else "statutory_rag",
            "response_time_ms": response_time,
            "query_variants": query_variants,
            "top_rerank_score": round(top_score, 3),
            "refusal": False,
        }

    async def query_stream(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        top_k: int = 5,
    ) -> AsyncGenerator[dict, None]:
        """Streaming execution of RAG pipeline."""
        start_time = time.time()
        tool_result = self.route_numeric_tool(user_query)
        query_variants = await query_expander.expand(user_query, num_variants=2)

        all_vector_results = []
        for variant in query_variants:
            v_results = await vector_store.search(variant, top_k=self.retrieve_top_k)
            all_vector_results.extend(v_results)

        seen_ids = set()
        unique_vector = []
        for r in all_vector_results:
            rid = str(r.get("id"))
            if rid not in seen_ids:
                seen_ids.add(rid)
                unique_vector.append(r)

        hybrid_candidates = await hybrid_search.search(user_query, unique_vector, top_k=self.retrieve_top_k)
        if not hybrid_candidates:
            hybrid_candidates = unique_vector

        reranked = await reranker.rerank(user_query, hybrid_candidates, top_k=self.rerank_top_k)
        top_score = reranked[0].get("rerank_score", 0.0) if reranked else 0.0

        if top_score < self.refusal_threshold and tool_result is None:
            yield {"type": "sources", "data": []}
            yield {"type": "token", "data": REFUSAL_MESSAGE}
            yield {
                "type": "done",
                "data": {"confidence": 0.0, "refusal": True, "response_time_ms": int((time.time() - start_time) * 1000)},
            }
            return

        context_blocks = []
        if tool_result:
            context_blocks.append(
                f"[Deterministic Statutory Tool Result — {tool_result['tool']}]\n"
                f"{json.dumps(tool_result['result'], indent=2)}"
            )
        context_blocks.append(self._build_context(reranked))
        context_str = "\n\n---\n\n".join(context_blocks)
        sources = self._extract_sources(reranked)

        yield {"type": "sources", "data": sources}

        prompt = SYSTEM_PROMPT.format(context=context_str, history=self._format_history(chat_history))
        full_prompt = f"{prompt}\n\nUser Question: {user_query}"

        full_answer = ""
        async for token in llm_handler.generate_stream(full_prompt):
            full_answer += token
            yield {"type": "token", "data": token}

        verified_answer = self._verify_citations(full_answer, reranked, tool_result)
        confidence = self._calculate_confidence(reranked, verified_answer, tool_result)

        yield {
            "type": "done",
            "data": {
                "confidence": round(confidence, 2),
                "full_answer": verified_answer,
                "response_time_ms": int((time.time() - start_time) * 1000),
            }
        }

    def _verify_citations(
        self,
        answer: str,
        retrieved_docs: list[dict],
        tool_result: Optional[dict] = None,
    ) -> str:
        """Verify that every cited source exists in the retrieved set.

        Flags or cleans invented citations.
        """
        valid_sections = set()
        valid_docs = set()

        for doc in retrieved_docs:
            meta = doc.get("metadata", {})
            doc_name = str(meta.get("doc_name", "")).lower()
            sec = str(meta.get("section", "")).lower()
            if doc_name:
                valid_docs.add(doc_name)
            if sec:
                valid_sections.add(sec)
                # Add base number e.g. "section 16"
                base_match = re.search(r'(section|rule)\s+\d+', sec)
                if base_match:
                    valid_sections.add(base_match.group(0))

        if tool_result:
            valid_docs.add("statutory tool")
            valid_docs.add("gst_validator")

        # Find citation tags like [Source: X] or [Section Y]
        citation_pattern = re.compile(r'\[Source:\s*([^\]]+)\]', re.IGNORECASE)

        def replace_citation(match):
            cited = match.group(1).strip()
            cited_lower = cited.lower()
            # Check if any valid doc or section is matched in the citation
            is_valid = any(vd in cited_lower for vd in valid_docs) or any(vs in cited_lower for vs in valid_sections)
            if is_valid or not valid_docs:  # If no docs available, do not flag
                return match.group(0)
            return f"[Citation unverified against retrieved set: {cited}]"

        return citation_pattern.sub(replace_citation, answer)

    def _build_context(self, documents: list[dict]) -> str:
        """Build context string from retrieved documents."""
        if not documents:
            return "No statutory documents found."

        context_parts = []
        for i, doc in enumerate(documents):
            meta = doc.get("metadata", {})
            doc_name = meta.get("doc_name", "Official Provision")
            sec = meta.get("section", "Provision")
            eff = meta.get("effective_date", "2017-07-01")
            superseded = meta.get("superseded", False)
            sup_tag = " [SUPERSEDED/AMENDED]" if superseded else ""
            score = doc.get("rerank_score", doc.get("score", 0.0))

            context_parts.append(
                f"[Source {i+1}: {doc_name} — {sec}{sup_tag} (eff: {eff}, score: {score:.2f})]\n"
                f"{doc.get('text', '')}"
            )

        return "\n\n---\n\n".join(context_parts)

    def _extract_sources(self, documents: list[dict]) -> list[dict]:
        """Extract authoritative source metadata from retrieved documents."""
        sources = []
        for doc in documents:
            meta = doc.get("metadata", {})
            sources.append({
                "doc_name": meta.get("doc_name", "Statute"),
                "section": meta.get("section", "General"),
                "effective_date": meta.get("effective_date", "2017-07-01"),
                "superseded": meta.get("superseded", False),
                "relevance_score": round(float(doc.get("rerank_score", doc.get("score", 0.0))), 3),
                "text_preview": doc.get("text", "")[:250],
            })
        return sources

    def _format_history(self, chat_history: list[dict] = None) -> str:
        """Format chat history."""
        if not chat_history:
            return "No previous messages."
        lines = []
        for msg in chat_history[-6:]:
            role = msg.get("role", "user").title()
            content = msg.get("content", "")[:200]
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def _calculate_confidence(
        self,
        documents: list[dict],
        answer: str,
        tool_result: Optional[dict] = None,
    ) -> float:
        """Calculate confidence score."""
        if tool_result:
            return 0.98

        if not documents:
            return 0.2

        top_score = documents[0].get("rerank_score", documents[0].get("score", 0.0))
        # High confidence for strong rerank score
        confidence = min(0.3 + float(top_score) * 0.7, 0.95)
        return max(confidence, 0.1)


# Singleton
rag_pipeline = RAGPipeline()
