"""
Cohere Reranker — re-ranks retrieved chunks for higher accuracy.
Gracefully degrades to score-based ranking when API key is missing or calls fail.
"""

from __future__ import annotations

import asyncio
from typing import Optional
from app.config import settings


class Reranker:
    """Cohere Rerank integration with robust fallback."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Cohere client if API key is available."""
        if getattr(settings, "COHERE_API_KEY", None):
            try:
                import cohere
                self.client = cohere.Client(settings.COHERE_API_KEY)
                print("[Reranker] Cohere reranker client initialized")
            except Exception as e:
                print(f"[Reranker] Cohere initialization error: {e}")

    async def rerank(
        self,
        query: str,
        documents: list[dict],
        top_k: int = 5,
    ) -> list[dict]:
        """Re-rank documents using Cohere Rerank API.

        Falls back gracefully to existing score ordering if the API is unavailable or fails.
        Guarantees that every returned document has 'rerank_score'.
        """
        if not documents:
            return []

        if self.client:
            try:
                doc_texts = [d.get("text", "") for d in documents]
                results = await asyncio.to_thread(
                    self.client.rerank,
                    query=query,
                    documents=doc_texts,
                    top_n=min(top_k, len(documents)),
                    model="rerank-english-v3.0",
                )
                reranked = []
                for r in results.results:
                    doc = documents[r.index].copy()
                    doc["rerank_score"] = float(r.relevance_score)
                    reranked.append(doc)
                return reranked
            except Exception as e:
                print(f"[Reranker] Cohere rerank call failed: {e}. Falling back to hybrid score.")

        # Graceful fallback: sort by existing score
        sorted_docs = sorted(
            documents,
            key=lambda x: float(x.get("score", 0.0) or 0.0),
            reverse=True,
        )
        fallback_results = []
        for doc in sorted_docs[:top_k]:
            d = doc.copy()
            # If no rerank_score, adopt normalized existing score
            if "rerank_score" not in d:
                d["rerank_score"] = float(d.get("score", 0.0) or 0.0)
            fallback_results.append(d)

        return fallback_results


# Singleton
reranker = Reranker()
