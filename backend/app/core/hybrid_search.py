"""
Hybrid Search — combines BM25 keyword search with vector semantic search.
Uses Reciprocal Rank Fusion (RRF) for score fusion.
"""

import asyncio
import math
import re
from typing import Optional
from collections import Counter


class BM25Index:
    """Simple in-memory BM25 index for keyword search."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents = []  # [(doc_id, text, metadata)]
        self.doc_freqs = Counter()
        self.doc_lengths = []
        self.avg_dl = 0
        self.n_docs = 0
        self._tokenized_docs = []

    def _tokenize(self, text: str) -> list[str]:
        """Simple whitespace + punctuation tokenizer."""
        text = text.lower()
        text = re.sub(r'[^\w\s]', ' ', text)
        return [t for t in text.split() if len(t) > 1]

    def add_documents(self, documents: list[tuple]):
        """Add documents: [(doc_id, text, metadata), ...]"""
        for doc_id, text, metadata in documents:
            tokens = self._tokenize(text)
            self._tokenized_docs.append(tokens)
            self.documents.append((doc_id, text, metadata))
            self.doc_lengths.append(len(tokens))
            # Update document frequencies
            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freqs[token] += 1

        self.n_docs = len(self.documents)
        self.avg_dl = sum(self.doc_lengths) / max(self.n_docs, 1)

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """Search using BM25 scoring."""
        query_tokens = self._tokenize(query)
        scores = []

        for i, tokens in enumerate(self._tokenized_docs):
            score = 0.0
            dl = self.doc_lengths[i]
            token_counts = Counter(tokens)

            for qt in query_tokens:
                if qt not in self.doc_freqs:
                    continue
                df = self.doc_freqs[qt]
                tf = token_counts.get(qt, 0)
                idf = math.log((self.n_docs - df + 0.5) / (df + 0.5) + 1)
                tf_norm = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * dl / max(self.avg_dl, 1)))
                score += idf * tf_norm

            if score > 0:
                doc_id, text, metadata = self.documents[i]
                scores.append({
                    "id": doc_id,
                    "text": text,
                    "metadata": metadata,
                    "score": score,
                })

        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[:top_k]


class HybridSearch:
    """Combines BM25 keyword search with vector semantic search using RRF."""

    def __init__(self):
        self.bm25_index = BM25Index()
        self._indexed = False

    def index_documents(self, documents: list[tuple]):
        """Index documents for BM25. docs: [(id, text, metadata), ...]"""
        self.bm25_index.add_documents(documents)
        self._indexed = True

    async def search(
        self,
        query: str,
        vector_results: list[dict],
        top_k: int = 10,
        bm25_weight: float = 0.3,
        vector_weight: float = 0.7,
    ) -> list[dict]:
        """
        Hybrid search using Reciprocal Rank Fusion.
        vector_results: results from vector store search.
        """
        # BM25 search
        bm25_results = []
        if self._indexed:
            bm25_results = await asyncio.to_thread(
                self.bm25_index.search, query, top_k * 2
            )

        # Reciprocal Rank Fusion
        k = 60  # RRF constant
        fused_scores = {}

        # Score BM25 results
        for rank, doc in enumerate(bm25_results):
            doc_id = doc["id"]
            rrf_score = bm25_weight * (1 / (k + rank + 1))
            fused_scores[doc_id] = fused_scores.get(doc_id, 0) + rrf_score
            if doc_id not in fused_scores:
                fused_scores[doc_id] = {"doc": doc, "score": 0}
            if isinstance(fused_scores[doc_id], (int, float)):
                fused_scores[doc_id] = {"doc": doc, "score": fused_scores[doc_id]}

        # Score vector results
        for rank, doc in enumerate(vector_results):
            doc_id = doc["id"]
            rrf_score = vector_weight * (1 / (k + rank + 1))
            if doc_id in fused_scores:
                fused_scores[doc_id]["score"] += rrf_score
            else:
                fused_scores[doc_id] = {"doc": doc, "score": rrf_score}

        # Sort by fused score
        results = sorted(fused_scores.values(), key=lambda x: x["score"], reverse=True)

        return [
            {**item["doc"], "score": item["score"]}
            for item in results[:top_k]
        ]


# Singleton
hybrid_search = HybridSearch()
