"""
Document Processor — PDF parsing, chunking, OCR, and ingestion.
Handles PyMuPDF, pdfplumber, and Tesseract OCR for scanned documents.
"""

import asyncio
import os
import re
import uuid
from typing import Optional
from app.config import settings
from app.core.vector_store import vector_store


class DocumentProcessor:
    """Processes PDF documents into searchable chunks."""

    def __init__(self):
        self.chunk_size = 512
        self.chunk_overlap = 64

    async def process_pdf(
        self,
        file_path: str,
        doc_name: str,
        category: str = "general",
        doc_id: str = None,
    ) -> dict:
        """
        Process a PDF file: extract text → chunk → embed → store.
        Returns processing stats.
        """
        # Extract text
        text, used_ocr = await self._extract_text(file_path)

        if not text.strip():
            return {
                "success": False,
                "chunks_count": 0,
                "ocr_used": used_ocr,
                "error": "No text could be extracted from the document",
            }

        # Chunk text
        chunks = self._chunk_text(text)

        # Prepare metadata for each chunk
        metadatas = []
        ids = []
        for i, chunk in enumerate(chunks):
            chunk_id = f"{doc_id or uuid.uuid4().hex}_{i}"
            ids.append(chunk_id)
            metadatas.append({
                "doc_name": doc_name,
                "category": category,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "page_estimate": self._estimate_page(i, len(chunks)),
                "text": chunk[:500],
            })

        # Add to vector store
        await vector_store.add_documents(texts=chunks, metadatas=metadatas, ids=ids)

        return {
            "success": True,
            "chunks_count": len(chunks),
            "ocr_used": used_ocr,
            "total_chars": len(text),
        }

    async def _extract_text(self, file_path: str) -> tuple[str, bool]:
        """Extract text from PDF. Falls back to OCR if needed."""
        text = ""
        used_ocr = False

        # Try PyMuPDF first (fastest)
        try:
            text = await asyncio.to_thread(self._extract_with_pymupdf, file_path)
        except Exception as e:
            print(f"[DocProcessor] PyMuPDF failed: {e}")

        # If too little text, try pdfplumber
        if len(text.strip()) < 100:
            try:
                text = await asyncio.to_thread(self._extract_with_pdfplumber, file_path)
            except Exception as e:
                print(f"[DocProcessor] pdfplumber failed: {e}")

        # If still no text, try OCR
        if len(text.strip()) < 100:
            try:
                text = await asyncio.to_thread(self._extract_with_ocr, file_path)
                used_ocr = True
            except Exception as e:
                print(f"[DocProcessor] OCR failed: {e}")

        return text, used_ocr

    def _extract_with_pymupdf(self, file_path: str) -> str:
        """Extract text using PyMuPDF (fitz)."""
        try:
            import fitz
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text() + "\n\n"
            doc.close()
            return text
        except ImportError:
            return ""

    def _extract_with_pdfplumber(self, file_path: str) -> str:
        """Extract text using pdfplumber."""
        try:
            import pdfplumber
            text = ""
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text += page_text + "\n\n"
            return text
        except ImportError:
            return ""

    def _extract_with_ocr(self, file_path: str) -> str:
        """Extract text using Tesseract OCR."""
        try:
            import fitz
            from PIL import Image
            import pytesseract
            import io

            doc = fitz.open(file_path)
            text = ""
            for page_num in range(len(doc)):
                page = doc[page_num]
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                page_text = pytesseract.image_to_string(img, lang="eng")
                text += page_text + "\n\n"
            doc.close()
            return text
        except Exception:
            return ""

    def _chunk_text(self, text: str) -> list[str]:
        """Split text into overlapping chunks."""
        # Clean text
        text = re.sub(r'\n{3,}', '\n\n', text)
        text = re.sub(r' {2,}', ' ', text)

        words = text.split()
        chunks = []
        start = 0

        while start < len(words):
            end = start + self.chunk_size
            chunk = " ".join(words[start:end])
            if chunk.strip():
                chunks.append(chunk.strip())
            start = end - self.chunk_overlap

        return chunks if chunks else [text[:2000]]

    def _estimate_page(self, chunk_index: int, total_chunks: int) -> int:
        """Estimate page number from chunk index (rough)."""
        # Assume ~2 chunks per page
        return max(1, (chunk_index // 2) + 1)


# Singleton
document_processor = DocumentProcessor()
