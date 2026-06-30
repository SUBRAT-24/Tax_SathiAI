"""
Cohere Reranker — re-ranks retrieved chunks for higher accuracy.
Gracefully degrades to score-based sorting when API key is missing.
"""

import asyncio
from typing import Optional
from app.config import settings


class Reranker:
    """Cohere Rerank integration with graceful fallback."""

    def __init__(self):
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Cohere client if API key is available."""
        if settings.COHERE_API_KEY:
            try:
                import cohere
                self.client = cohere.Client(settings.COHERE_API_KEY)
                print("[Reranker] Cohere reranker initialized")
            except ImportError:
                print("[Reranker] cohere package not installed")

    async def rerank(
        self,
        query: str,
        documents: list[dict],
        top_k: int = 5,
    ) -> list[dict]:
        """
        Re-rank documents using Cohere Rerank API.
        Falls back to existing score ordering if API unavailable.
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
                    top_n=top_k,
                    model="rerank-english-v3.0",
                )
                reranked = []
                for r in results.results:
                    doc = documents[r.index].copy()
                    doc["rerank_score"] = r.relevance_score
                    reranked.append(doc)
                return reranked
            except Exception as e:
                print(f"[Reranker] Cohere rerank failed: {e}")

        # Fallback: return top-k by existing score
        sorted_docs = sorted(documents, key=lambda x: x.get("score", 0), reverse=True)
        return sorted_docs[:top_k]


# Singleton
reranker = Reranker()
