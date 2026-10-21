"""
Vector Store — ChromaDB (dev) / Pinecone (production).
Provides a unified interface for storing and searching embeddings.
"""

import asyncio
import os
from typing import Optional
from app.config import settings
from app.core.embeddings import embeddings_manager


class VectorStore:
    """Unified vector store abstraction over ChromaDB and Pinecone."""

    def __init__(self):
        self.store_type = settings.VECTOR_STORE_TYPE
        self.chroma_client = None
        self.chroma_collection = None
        self.pinecone_index = None
        self._initialized = False

    def _init_store(self):
        """Initialize the vector store (lazy)."""
        if self._initialized:
            return

        if self.store_type == "chromadb":
            self._init_chromadb()
        elif self.store_type == "pinecone":
            self._init_pinecone()

        self._initialized = True

    def _init_chromadb(self):
        """Initialize ChromaDB with persistent storage."""
        try:
            import chromadb
            persist_dir = settings.CHROMADB_PERSIST_DIR
            os.makedirs(persist_dir, exist_ok=True)
            self.chroma_client = chromadb.PersistentClient(path=persist_dir)
            self.chroma_collection = self.chroma_client.get_or_create_collection(
                name="taxsathi_knowledge",
                metadata={"hnsw:space": "cosine"},
            )
            print(f"[VectorStore] ChromaDB initialized at {persist_dir}")
            print(f"[VectorStore] Collection has {self.chroma_collection.count()} documents")
        except ImportError:
            print("[VectorStore] ChromaDB not installed. Using in-memory store.")
            self._init_memory_store()

    def _init_pinecone(self):
        """Initialize Pinecone for production."""
        try:
            from pinecone import Pinecone
            pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            self.pinecone_index = pc.Index(settings.PINECONE_INDEX_NAME)
            print(f"[VectorStore] Pinecone initialized: {settings.PINECONE_INDEX_NAME}")
        except Exception as e:
            print(f"[VectorStore] Pinecone init failed: {e}. Falling back to ChromaDB.")
            self.store_type = "chromadb"
            self._init_chromadb()

    def _init_memory_store(self):
        """Simple in-memory store for demo/testing."""
        self._memory_docs = []  # [(id, embedding, metadata, text)]

    async def add_documents(
        self,
        texts: list[str],
        metadatas: list[dict] = None,
        ids: list[str] = None,
    ):
        """Add documents to the vector store."""
        self._init_store()

        embeddings = await embeddings_manager.embed_batch(texts)

        if not ids:
            import uuid
            ids = [str(uuid.uuid4()) for _ in texts]

        if not metadatas:
            metadatas = [{"text": t[:500]} for t in texts]

        if self.store_type == "chromadb" and self.chroma_collection:
            await asyncio.to_thread(
                self.chroma_collection.add,
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )
        elif self.store_type == "pinecone" and self.pinecone_index:
            vectors = [
                {"id": id_, "values": emb, "metadata": {**meta, "text": text[:1000]}}
                for id_, emb, meta, text in zip(ids, embeddings, metadatas, texts)
            ]
            await asyncio.to_thread(self.pinecone_index.upsert, vectors=vectors)
        else:
            # Memory store
            for id_, emb, meta, text in zip(ids, embeddings, metadatas, texts):
                self._memory_docs.append((id_, emb, {**meta, "text": text}, text))

    def _is_accessible(self, meta: dict, user_id: Optional[str]) -> bool:
        """Check if a document is accessible to the current user."""
        if not user_id:
            return True
        doc_user = meta.get("user_id")
        if doc_user in (None, "", "system", "global"):
            return True
        return str(doc_user) == str(user_id)

    async def search(
        self,
        query: str,
        top_k: int = 10,
        filter_dict: dict = None,
        user_id: Optional[str] = None,
    ) -> list[dict]:
        """Search for similar documents with per-user document isolation."""
        self._init_store()

        query_embedding = await embeddings_manager.embed_text(query)

        # Retrieve a slightly larger candidate set to allow post-filtering
        retrieve_limit = top_k * 3 if user_id else top_k

        if self.store_type == "chromadb" and self.chroma_collection:
            results = await asyncio.to_thread(
                self.chroma_collection.query,
                query_embeddings=[query_embedding],
                n_results=retrieve_limit,
                where=filter_dict,
            )
            docs = []
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    meta = results["metadatas"][0][i] if results["metadatas"] else {}
                    if not self._is_accessible(meta, user_id):
                        continue
                    distance = results["distances"][0][i] if results["distances"] else 0
                    docs.append({
                        "id": results["ids"][0][i],
                        "text": doc,
                        "metadata": meta,
                        "score": 1 - distance,  # Convert distance to similarity
                    })
            return docs[:top_k]

        elif self.store_type == "pinecone" and self.pinecone_index:
            results = await asyncio.to_thread(
                self.pinecone_index.query,
                vector=query_embedding,
                top_k=retrieve_limit,
                include_metadata=True,
                filter=filter_dict,
            )
            accessible = [
                {
                    "id": match.id,
                    "text": match.metadata.get("text", ""),
                    "metadata": match.metadata,
                    "score": match.score,
                }
                for match in results.matches
                if self._is_accessible(match.metadata, user_id)
            ]
            return accessible[:top_k]

        else:
            # Memory store
            import numpy as np
            if not hasattr(self, '_memory_docs') or not self._memory_docs:
                return []
            query_vec = np.array(query_embedding)
            scored = []
            for id_, emb, meta, text in self._memory_docs:
                if not self._is_accessible(meta, user_id):
                    continue
                doc_vec = np.array(emb)
                score = float(np.dot(query_vec, doc_vec) / (np.linalg.norm(query_vec) * np.linalg.norm(doc_vec) + 1e-8))
                scored.append({"id": id_, "text": text, "metadata": meta, "score": score})
            scored.sort(key=lambda x: x["score"], reverse=True)
            return scored[:top_k]

    async def delete(self, ids: list[str]):
        """Delete documents by ID."""
        self._init_store()
        if self.store_type == "chromadb" and self.chroma_collection:
            await asyncio.to_thread(self.chroma_collection.delete, ids=ids)
        elif self.store_type == "pinecone" and self.pinecone_index:
            await asyncio.to_thread(self.pinecone_index.delete, ids=ids)

    async def get_count(self) -> int:
        """Get total document count."""
        self._init_store()
        if self.store_type == "chromadb" and self.chroma_collection:
            return await asyncio.to_thread(self.chroma_collection.count)
        return 0


# Singleton
vector_store = VectorStore()
