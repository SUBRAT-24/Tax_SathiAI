"""
RAG Pipeline — Main orchestrator.
Multi-stage: Query Expansion → Hybrid Search → Rerank → LLM Generation with Citations.
"""

import time
import asyncio
from typing import AsyncGenerator, Optional

from app.core.query_expander import query_expander
from app.core.vector_store import vector_store
from app.core.hybrid_search import hybrid_search
from app.core.reranker import reranker
from app.core.llm_handler import llm_handler


# System prompt for the RAG chatbot
SYSTEM_PROMPT = """You are TaxSathi AI, an expert GST and Tax compliance assistant for Indian businesses.

RULES:
1. Answer ONLY based on the provided context/sources. If the context doesn't contain relevant information, say so honestly.
2. Always cite your sources using the format: [Source: document_name, Page X]
3. Use structured formatting: bullet points, numbered steps, tables where appropriate.
4. Highlight key numbers (tax rates, amounts, dates) in bold.
5. If you're unsure or the question is outside your knowledge, recommend consulting a qualified Chartered Accountant.
6. Always end with the disclaimer: "⚠️ This is AI-generated guidance, not legal advice. Please verify with a qualified CA."
7. For calculations, show the step-by-step working.
8. If the question is in Hindi, respond in Hindi.
9. Be concise but comprehensive. Use GST-specific terminology correctly.
10. Reference specific sections of CGST Act, IGST Act, or SGST Act when applicable.

CONTEXT FROM KNOWLEDGE BASE:
{context}

CONVERSATION HISTORY:
{history}
"""


class RAGPipeline:
    """Main RAG pipeline orchestrator."""

    async def query(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        top_k: int = 5,
    ) -> dict:
        """
        Process a user query through the full RAG pipeline.
        Returns: {answer, sources, confidence, intent, response_time_ms}
        """
        start_time = time.time()

        # 1. Classify intent
        intent = await llm_handler.classify_intent(user_query)

        # 2. Expand query
        query_variants = await query_expander.expand(user_query, num_variants=2)

        # 3. Multi-query vector search
        all_results = []
        for variant in query_variants:
            results = await vector_store.search(variant, top_k=top_k * 2)
            all_results.extend(results)

        # Deduplicate by ID
        seen_ids = set()
        unique_results = []
        for r in all_results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                unique_results.append(r)

        # 4. Hybrid search (BM25 fusion)
        hybrid_results = await hybrid_search.search(
            user_query, unique_results, top_k=top_k * 2
        )

        # If hybrid didn't produce results, use vector results directly
        if not hybrid_results:
            hybrid_results = unique_results

        # 5. Rerank
        reranked = await reranker.rerank(user_query, hybrid_results, top_k=top_k)

        # 6. Build context
        context = self._build_context(reranked)
        sources = self._extract_sources(reranked)

        # 7. Build history string
        history_str = self._format_history(chat_history)

        # 8. Generate answer
        prompt = SYSTEM_PROMPT.format(context=context, history=history_str)
        full_prompt = f"{prompt}\n\nUser Question: {user_query}"
        answer = await llm_handler.generate(full_prompt)

        # 9. Calculate confidence
        confidence = self._calculate_confidence(reranked, answer)

        # 10. Add disclaimer if confidence is low
        if confidence < 0.6:
            answer += (
                "\n\n⚠️ **Note**: I'm not fully certain about this answer. "
                "The information in my knowledge base may not fully cover this topic. "
                "Please verify with a qualified Chartered Accountant."
            )

        response_time = int((time.time() - start_time) * 1000)

        return {
            "answer": answer,
            "sources": sources,
            "confidence": round(confidence, 2),
            "intent": intent,
            "response_time_ms": response_time,
            "query_variants": query_variants,
        }

    async def query_stream(
        self,
        user_query: str,
        chat_history: list[dict] = None,
        top_k: int = 5,
    ) -> AsyncGenerator[dict, None]:
        """
        Streaming version of the RAG pipeline.
        Yields: {type: "token"|"sources"|"metadata", data: ...}
        """
        start_time = time.time()

        # 1. Intent
        intent = await llm_handler.classify_intent(user_query)
        yield {"type": "metadata", "data": {"intent": intent}}

        # 2-5. Retrieval pipeline (same as non-streaming)
        query_variants = await query_expander.expand(user_query, num_variants=2)

        all_results = []
        for variant in query_variants:
            results = await vector_store.search(variant, top_k=top_k * 2)
            all_results.extend(results)

        seen_ids = set()
        unique_results = []
        for r in all_results:
            if r["id"] not in seen_ids:
                seen_ids.add(r["id"])
                unique_results.append(r)

        hybrid_results = await hybrid_search.search(user_query, unique_results, top_k=top_k * 2)
        if not hybrid_results:
            hybrid_results = unique_results

        reranked = await reranker.rerank(user_query, hybrid_results, top_k=top_k)
        context = self._build_context(reranked)
        sources = self._extract_sources(reranked)
        history_str = self._format_history(chat_history)

        # Send sources early
        yield {"type": "sources", "data": sources}

        # 6. Stream answer tokens
        prompt = SYSTEM_PROMPT.format(context=context, history=history_str)
        full_prompt = f"{prompt}\n\nUser Question: {user_query}"

        full_answer = ""
        async for token in llm_handler.generate_stream(full_prompt):
            full_answer += token
            yield {"type": "token", "data": token}

        # 7. Final metadata
        confidence = self._calculate_confidence(reranked, full_answer)
        response_time = int((time.time() - start_time) * 1000)

        yield {
            "type": "done",
            "data": {
                "confidence": round(confidence, 2),
                "response_time_ms": response_time,
                "intent": intent,
                "full_answer": full_answer,
            }
        }

    def _build_context(self, documents: list[dict]) -> str:
        """Build context string from retrieved documents."""
        if not documents:
            return "No relevant documents found in the knowledge base."

        context_parts = []
        for i, doc in enumerate(documents):
            meta = doc.get("metadata", {})
            doc_name = meta.get("doc_name", "Unknown Document")
            page = meta.get("page_estimate", "?")
            score = doc.get("score", 0)

            context_parts.append(
                f"[Source {i+1}: {doc_name}, Page {page}] "
                f"(relevance: {score:.2f})\n{doc.get('text', '')}"
            )

        return "\n\n---\n\n".join(context_parts)

    def _extract_sources(self, documents: list[dict]) -> list[dict]:
        """Extract source citations from retrieved documents."""
        sources = []
        for doc in documents:
            meta = doc.get("metadata", {})
            sources.append({
                "doc_name": meta.get("doc_name", "Unknown"),
                "category": meta.get("category", "general"),
                "page": meta.get("page_estimate", 1),
                "chunk_index": meta.get("chunk_index", 0),
                "relevance_score": round(doc.get("score", 0), 3),
                "text_preview": doc.get("text", "")[:200],
            })
        return sources

    def _format_history(self, chat_history: list[dict] = None) -> str:
        """Format chat history for context."""
        if not chat_history:
            return "No previous conversation."

        parts = []
        for msg in chat_history[-10:]:  # Last 10 messages
            role = msg.get("role", "user").title()
            content = msg.get("content", "")[:300]
            parts.append(f"{role}: {content}")

        return "\n".join(parts)

    def _calculate_confidence(self, documents: list[dict], answer: str) -> float:
        """Calculate confidence score based on retrieval quality."""
        if not documents:
            return 0.3

        # Factors:
        # 1. Average relevance score of top docs
        scores = [d.get("score", 0) or d.get("rerank_score", 0) for d in documents]
        avg_score = sum(scores) / max(len(scores), 1)

        # 2. Number of relevant documents
        relevant_count = sum(1 for s in scores if s > 0.3)
        doc_factor = min(relevant_count / 3, 1.0)

        # 3. Answer contains specific numbers/sections (good sign)
        import re
        has_specifics = bool(re.search(r'(Section \d+|₹[\d,.]+|\d+%|GSTR-\d)', answer))
        specifics_bonus = 0.1 if has_specifics else 0

        confidence = min((avg_score * 0.5 + doc_factor * 0.3 + 0.2) + specifics_bonus, 1.0)
        return max(confidence, 0.2)


# Singleton
rag_pipeline = RAGPipeline()
