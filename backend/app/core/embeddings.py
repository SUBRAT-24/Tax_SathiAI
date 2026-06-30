"""
Embeddings Manager — sentence-transformers (all-MiniLM-L6-v2).
Handles text embedding for both queries and documents.
"""

import asyncio
from typing import Optional
import numpy as np
from app.config import settings


class EmbeddingsManager:
    """Manages sentence-transformer embeddings."""

    def __init__(self):
        self.model = None
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION

    def _load_model(self):
        """Lazy-load the sentence-transformer model."""
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
                print(f"[Embeddings] Loaded model: {self.model_name}")
            except ImportError:
                print("[Embeddings] sentence-transformers not installed. Using random embeddings for demo.")
                self.model = "demo"

    async def embed_text(self, text: str) -> list[float]:
        """Embed a single text string."""
        self._load_model()
        if self.model == "demo":
            return self._demo_embedding(text)
        embedding = await asyncio.to_thread(self.model.encode, text, normalize_embeddings=True)
        return embedding.tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of text strings."""
        self._load_model()
        if self.model == "demo":
            return [self._demo_embedding(t) for t in texts]
        embeddings = await asyncio.to_thread(
            self.model.encode, texts, normalize_embeddings=True, batch_size=32
        )
        return embeddings.tolist()

    def _demo_embedding(self, text: str) -> list[float]:
        """Generate a deterministic pseudo-embedding for demo mode."""
        np.random.seed(hash(text) % (2**32))
        emb = np.random.randn(self.dimension).astype(np.float32)
        emb = emb / np.linalg.norm(emb)
        return emb.tolist()


# Singleton
embeddings_manager = EmbeddingsManager()
