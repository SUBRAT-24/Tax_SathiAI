"""
Hybrid Search — combines BM25 keyword search with vector semantic search.
Uses Reciprocal Rank Fusion (RRF) with recency and non-superseded priority weighting.
Supports on-disk persistence and reloading at application startup.
"""

from __future__ import annotations

import asyncio
import json
import math
import os
import re
from collections import Counter
from pathlib import Path
from typing import Optional

from app.config import settings


class BM25Index:
    """In-memory and disk-persistent BM25 index for keyword search."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: list[tuple[str, str, dict]] = []  # [(doc_id, text, metadata)]
        self.doc_freqs: Counter = Counter()
        self.doc_lengths: list[int] = []
        self.avg_dl: float = 0.0
        self.n_docs: int = 0
        self._tokenized_docs: list[list[str]] = []

    def _tokenize(self, text: str) -> list[str]:
        """Normalize and tokenize text into keywords (preserving section numbers and codes)."""
        text = text.lower()
        # Keep alphanumeric, hyphen, and underscore for section numbers / codes
        text = re.sub(r'[^a-z0-9\-_]', ' ', text)
        return [t for t in text.split() if len(t) > 1]

    def add_documents(self, documents: list[tuple[str, str, dict]]):
        """Add documents: [(doc_id, text, metadata), ...]."""
        for doc_id, text, metadata in documents:
            # Check for existing doc_id and replace if present
            existing_idx = next((i for i, d in enumerate(self.documents) if d[0] == doc_id), None)
            tokens = self._tokenize(text)

            if existing_idx is not None:
                # Remove old token frequencies
                old_tokens = set(self._tokenized_docs[existing_idx])
                for token in old_tokens:
                    self.doc_freqs[token] = max(0, self.doc_freqs[token] - 1)
                self.documents[existing_idx] = (doc_id, text, metadata)
                self._tokenized_docs[existing_idx] = tokens
                self.doc_lengths[existing_idx] = len(tokens)
            else:
                self.documents.append((doc_id, text, metadata))
                self._tokenized_docs.append(tokens)
                self.doc_lengths.append(len(tokens))

            unique_tokens = set(tokens)
            for token in unique_tokens:
                self.doc_freqs[token] += 1

        self.n_docs = len(self.documents)
        self.avg_dl = sum(self.doc_lengths) / max(self.n_docs, 1)

    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """Search using Okapi BM25 scoring."""
        query_tokens = self._tokenize(query)
        if not query_tokens or self.n_docs == 0:
            return []

        scores: list[dict] = []

        for i, tokens in enumerate(self._tokenized_docs):
            score = 0.0
            dl = self.doc_lengths[i]
            token_counts = Counter(tokens)

            for qt in query_tokens:
                if qt not in self.doc_freqs:
                    continue
                df = self.doc_freqs[qt]
                tf = token_counts.get(qt, 0)
                idf = math.log((self.n_docs - df + 0.5) / (df + 0.5) + 1.0)
                tf_norm = (tf * (self.k1 + 1.0)) / (
                    tf + self.k1 * (1.0 - self.b + self.b * dl / max(self.avg_dl, 1.0))
                )
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

    def save(self, file_path: str):
        """Serialize index to JSON disk storage."""
        os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
        data = {
            "k1": self.k1,
            "b": self.b,
            "documents": self.documents,
            "doc_freqs": dict(self.doc_freqs),
            "doc_lengths": self.doc_lengths,
            "avg_dl": self.avg_dl,
            "n_docs": self.n_docs,
            "_tokenized_docs": self._tokenized_docs,
        }
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f)

    def load(self, file_path: str) -> bool:
        """Load index from JSON disk storage."""
        if not os.path.isfile(file_path):
            return False
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            self.k1 = data.get("k1", 1.5)
            self.b = data.get("b", 0.75)
            self.documents = [tuple(d) for d in data.get("documents", [])]
            self.doc_freqs = Counter(data.get("doc_freqs", {}))
            self.doc_lengths = data.get("doc_lengths", [])
            self.avg_dl = data.get("avg_dl", 0.0)
            self.n_docs = data.get("n_docs", 0)
            self._tokenized_docs = data.get("_tokenized_docs", [])
            return True
        except Exception as e:
            print(f"[HybridSearch] Error loading BM25 index from {file_path}: {e}")
            return False


class HybridSearch:
    """Combines BM25 keyword search with vector semantic search using RRF.

    Applies statutory recency boosting and downweights superseded documents.
    """

    def __init__(self, index_path: str | None = None, auto_load: bool = True):
        if index_path is None:
            self.index_path = getattr(settings, "BM25_INDEX_PATH", "./data/bm25_index.json")
        else:
            self.index_path = index_path
        self.bm25_index = BM25Index()
        self._indexed = False
        if auto_load and self.index_path:
            self._load_persisted()

    def _load_persisted(self):
        """Reload index from disk on startup if available."""
        if self.index_path and self.bm25_index.load(self.index_path):
            self._indexed = self.bm25_index.n_docs > 0
            if self._indexed:
                print(f"[HybridSearch] Loaded BM25 index with {self.bm25_index.n_docs} documents from {self.index_path}")

    def index_documents(self, documents: list[tuple[str, str, dict]], persist: bool = True):
        """Index documents for BM25. docs: [(id, text, metadata), ...]."""
        self.bm25_index.add_documents(documents)
        self._indexed = True
        if persist and self.index_path:
            self.bm25_index.save(self.index_path)

    def _is_accessible(self, meta: dict, user_id: Optional[str]) -> bool:
        """Check if document is accessible to current user."""
        if not user_id:
            return True
        doc_user = meta.get("user_id")
        if doc_user in (None, "", "system", "global"):
            return True
        return str(doc_user) == str(user_id)

    async def search(
        self,
        query: str,
        vector_results: list[dict],
        top_k: int = 20,
        bm25_weight: float = 0.4,
        vector_weight: float = 0.6,
        user_id: Optional[str] = None,
    ) -> list[dict]:
        """Hybrid search combining BM25 and vector results via Reciprocal Rank Fusion.

        Prefers newer and non-superseded sources:
          - Superseded sources receive a 0.35x penalty
          - Post-2024 amendments receive a 1.25x recency boost
          - Restricts results to global statutory documents and current user's documents
        """
        bm25_results: list[dict] = []
        if self._indexed:
            raw_bm25 = await asyncio.to_thread(
                self.bm25_index.search, query, top_k * 3
            )
            bm25_results = [doc for doc in raw_bm25 if self._is_accessible(doc.get("metadata", {}), user_id)]

        filtered_vector = [doc for doc in vector_results if self._is_accessible(doc.get("metadata", {}), user_id)]

        k = 60  # RRF constant
        fused: dict[str, dict] = {}

        # 1. RRF scoring for BM25 results
        for rank, doc in enumerate(bm25_results):
            doc_id = str(doc["id"])
            rrf_score = bm25_weight * (1.0 / (k + rank + 1.0))
            if doc_id not in fused:
                fused[doc_id] = {
                    "id": doc_id,
                    "text": doc.get("text", ""),
                    "metadata": doc.get("metadata", {}),
                    "score": rrf_score,
                    "bm25_rank": rank + 1,
                    "vector_rank": None,
                }
            else:
                fused[doc_id]["score"] += rrf_score
                fused[doc_id]["bm25_rank"] = rank + 1

        # 2. RRF scoring for Vector results
        for rank, doc in enumerate(filtered_vector):
            doc_id = str(doc["id"])
            rrf_score = vector_weight * (1.0 / (k + rank + 1.0))
            if doc_id not in fused:
                fused[doc_id] = {
                    "id": doc_id,
                    "text": doc.get("text", ""),
                    "metadata": doc.get("metadata", {}),
                    "score": rrf_score,
                    "bm25_rank": None,
                    "vector_rank": rank + 1,
                }
            else:
                fused[doc_id]["score"] += rrf_score
                fused[doc_id]["vector_rank"] = rank + 1
                # If metadata wasn't rich in BM25, supplement from vector
                if not fused[doc_id]["metadata"] and doc.get("metadata"):
                    fused[doc_id]["metadata"] = doc["metadata"]

        # 3. Apply statutory metadata adjustments (superseded & recency)
        for doc_id, entry in fused.items():
            meta = entry.get("metadata") or {}
            score = entry["score"]

            # Downweight superseded statutory documents
            if meta.get("superseded") is True or str(meta.get("superseded", "")).lower() == "true":
                score *= 0.35

            # Boost recent notifications and amendments
            eff_date = str(meta.get("effective_date", ""))
            if eff_date >= "2025-01-01":
                score *= 1.25
            elif eff_date >= "2023-01-01":
                score *= 1.10

            entry["score"] = score

        # 4. Sort descending by final fused score
        sorted_results = sorted(fused.values(), key=lambda x: x["score"], reverse=True)
        return sorted_results[:top_k]


# Singleton
hybrid_search = HybridSearch()
