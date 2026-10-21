#!/usr/bin/env python3
"""
TaxSathi AI — Statutory Knowledge Base Ingestion Script.
Parses official PDFs by legal structure (section, rule, notification clause)
into 300-500 token chunks with statutory metadata:
  doc_name, section, effective_date, superseded.

Indexes into ChromaDB vector store and persists BM25 keyword index.
"""

import argparse
import asyncio
import os
import re
import sys
from datetime import date
from pathlib import Path
from typing import Optional

# Ensure backend directory is in python path
ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.core.vector_store import vector_store
from app.core.hybrid_search import hybrid_search


# ═══════════════════════════════════════════════════════════════════════
# LEGAL STRUCTURE PARSER & CHUNKER
# ═══════════════════════════════════════════════════════════════════════

SECTION_PATTERN = re.compile(
    r'(?:\n|^)(?:Section|SEC\.)\s+(\d+[A-Z]?)\s*[:\.\-—]?\s*(.*?)(?=(?:\n(?:Section|SEC\.)\s+\d+[A-Z]?)|$)',
    re.IGNORECASE | re.DOTALL,
)

RULE_PATTERN = re.compile(
    r'(?:\n|^)(?:Rule)\s+(\d+[A-Z]?)\s*[:\.\-—]?\s*(.*?)(?=(?:\n(?:Rule)\s+\d+[A-Z]?)|$)',
    re.IGNORECASE | re.DOTALL,
)

NOTIF_PATTERN = re.compile(
    r'(?:\n|^)(?:Notification\s+No\.\s*(\d+/\d+[-A-Za-z\(\)]*))\s*[:\.\-—]?\s*(.*?)(?=(?:\nNotification\s+No\.)|$)',
    re.IGNORECASE | re.DOTALL,
)


def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF (fitz) or pdfplumber."""
    text = ""
    try:
        import fitz
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text() + "\n\n"
        doc.close()
        if text.strip():
            return text
    except Exception as e:
        print(f"PyMuPDF failed on {pdf_path}: {e}")

    try:
        import pdfplumber
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                text += (page.extract_text() or "") + "\n\n"
    except Exception as e:
        print(f"pdfplumber failed on {pdf_path}: {e}")

    return text


def split_into_tokens(text: str, target_min: int = 300, target_max: int = 500) -> list[str]:
    """Split text into chunks of target token length (~300-500 words)."""
    words = text.split()
    if len(words) <= target_max:
        return [text.strip()] if text.strip() else []

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + target_max, len(words))
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        if end >= len(words):
            break
        # 50 words overlap for coherence
        start += target_max - 50

    return chunks


def is_superseded(text: str) -> bool:
    """Detect whether statutory provision is superseded, omitted, or repealed."""
    lower = text.lower()
    indicators = [
        "omitted w.e.f.",
        "omitted by",
        "superseded by",
        "repealed by",
        "substituted by",
        "shall stand omitted",
    ]
    return any(ind in lower for ind in indicators)


def extract_effective_date(text: str, default: str = "2017-07-01") -> str:
    """Extract effective date from text headers if available."""
    match = re.search(r'(?:w\.e\.f\.|effective\s+from|dated|with\s+effect\s+from)\s*([0-9]{1,2}[a-z]{0,2}\s+[A-Za-z]+,?\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})', text, re.IGNORECASE)
    if match:
        date_str = match.group(1).strip()
        try:
            from datetime import datetime
            for fmt in ("%d %B %Y", "%d %b %Y", "%B %d, %Y", "%Y-%m-%d"):
                try:
                    dt = datetime.strptime(re.sub(r'(\d+)(st|nd|rd|th)', r'\1', date_str), fmt)
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    continue
        except Exception:
            pass
    return default


def parse_legal_structure(doc_name: str, full_text: str) -> list[dict]:
    """Parse text by Section, Rule, or Notification clause into structural chunks."""
    chunks_meta = []
    lower_doc = doc_name.lower()

    # Determine primary structure pattern
    if "rule" in lower_doc:
        matches = list(RULE_PATTERN.finditer(full_text))
        prefix = "Rule"
    elif "notif" in lower_doc:
        matches = list(NOTIF_PATTERN.finditer(full_text))
        prefix = "Notification"
    else:
        matches = list(SECTION_PATTERN.finditer(full_text))
        prefix = "Section"

    if matches:
        for m in matches:
            sec_num = m.group(1)
            body = m.group(2).strip()
            sec_label = f"{prefix} {sec_num}"
            eff_date = extract_effective_date(body)
            superseded = is_superseded(body)

            sub_chunks = split_into_tokens(body, 300, 500)
            for idx, chunk_text in enumerate(sub_chunks):
                labeled_text = f"[{doc_name} — {sec_label}]\n{chunk_text}"
                chunks_meta.append({
                    "text": labeled_text,
                    "metadata": {
                        "doc_name": doc_name,
                        "section": sec_label,
                        "effective_date": eff_date,
                        "superseded": superseded,
                        "chunk_index": idx,
                    }
                })
    else:
        # Fallback to paragraph-aware token chunking
        eff_date = extract_effective_date(full_text)
        superseded = is_superseded(full_text)
        sub_chunks = split_into_tokens(full_text, 300, 500)
        for idx, chunk_text in enumerate(sub_chunks):
            chunks_meta.append({
                "text": f"[{doc_name}]\n{chunk_text}",
                "metadata": {
                    "doc_name": doc_name,
                    "section": f"General Clause {idx+1}",
                    "effective_date": eff_date,
                    "superseded": superseded,
                    "chunk_index": idx,
                }
            })

    return chunks_meta


# ═══════════════════════════════════════════════════════════════════════
# BUILT-IN STATUTORY SEED CORPUS
# ═══════════════════════════════════════════════════════════════════════

STATUTORY_SEED_DOCUMENTS = [
    {
        "doc_name": "CGST_Act_2017.txt",
        "text": """
Section 9. Levy and Collection.
(1) Subject to the provisions of sub-section (2), there shall be levied a tax called the central goods and services tax on all intra-State supplies of goods or services or both, except on the supply of alcoholic liquor for human consumption, on the value determined under section 15 and at such rates, not exceeding twenty per cent., as may be notified by the Government on the recommendations of the Council and collected in such manner as may be prescribed and shall be paid by the taxable person.
(3) The Government may specify categories of supply of goods or services on which tax shall be paid on reverse charge basis by the recipient.

Section 10. Composition Levy.
(1) Notwithstanding anything to the contrary contained in this Act but subject to the provisions of sub-sections (3) and (4) of section 9, a registered person, whose aggregate turnover in the preceding financial year did not exceed fifty lakh rupees (extended to one crore fifty lakh rupees), may opt to pay, in lieu of the tax payable by him under sub-section (1) of section 9, an amount of tax calculated at prescribed rate.

Section 16. Eligibility and conditions for taking input tax credit.
(1) Every registered person shall, subject to such conditions and restrictions as may be prescribed and in the manner specified in section 49, be entitled to take credit of input tax charged on any supply of goods or services or both to him which are used or intended to be used in the course or furtherance of his business and the said amount shall be credited to the electronic credit ledger of such person.
(2) Notwithstanding anything contained in this section, no registered person shall be entitled to the credit of any input tax in respect of any supply of goods or services or both to him unless—
(a) he is in possession of a tax invoice or debit note issued by a supplier registered under this Act;
(aa) the details of the invoice or debit note referred to in clause (a) has been furnished by the supplier in the statement of outward supplies and communicated to the recipient in Form GSTR-2B;
(b) he has received the goods or services or both;
(c) subject to the provisions of section 41, the tax charged in respect of such supply has been actually paid to the Government; and
(d) he has furnished the return under section 39.

Section 17. Apportionment of credit and blocked credits.
(1) Where the goods or services or both are used by the registered person partly for the purpose of any business and partly for other purposes, the amount of credit shall be restricted to so much of the input tax as is attributable to the purposes of his business.
(2) Where the goods or services or both are used by the registered person partly for effecting taxable supplies including zero-rated supplies and partly for effecting exempt supplies, the amount of credit shall be restricted to so much of the input tax as is attributable to the said taxable supplies including zero-rated supplies.
(5) Notwithstanding anything contained in sub-section (1) of section 16 and sub-section (1) of section 18, input tax credit shall not be available in respect of the following, namely:—
(a) motor vehicles for transportation of persons having approved seating capacity of not more than thirteen persons (including the driver), except when they are used for making taxable supplies of further supply of such motor vehicles, transportation of passengers, or imparting training on driving such motor vehicles;
(b) the following supply of goods or services or both—
(i) food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery, leasing, renting or hiring of motor vehicles, vessels or aircraft;
(ii) membership of a club, health and fitness centre;
(iii) travel benefits extended to employees on vacation such as leave or home travel concession;
(c) works contract services when supplied for construction of an immovable property (other than plant and machinery) except where it is an input service for further supply of works contract service;
(d) goods or services or both received by a taxable person for construction of an immovable property (other than plant or machinery) on his own account including when such goods or services or both are used in the course or furtherance of business;
(h) goods lost, stolen, destroyed, written off or disposed of by way of gift or free samples; and
(i) any tax paid in accordance with the provisions of sections 74, 129 and 130.

Section 44. Annual return.
Every registered person, other than an Input Service Distributor, a person paying tax under section 51 or section 52, a casual taxable person and a non-resident taxable person, shall furnish an annual return which may include a self-certified reconciliation statement, reconciling the value of supplies declared in the return furnished for the financial year, with the audited annual financial statement for every financial year on or before the thirty-first day of December following the end of such financial year.

Section 47. Levy of late fee.
(1) Any registered person who fails to furnish the details of outward or inward supplies required under section 37 or section 38 or returns required under section 39 or section 45 by the due date shall pay a late fee of one hundred rupees for every day during which such failure continues subject to a maximum amount of five thousand rupees (as amended by notifications rationalizing to ₹20/day for nil and ₹50/day for non-nil).

Section 50. Interest on delayed payment of tax.
(1) Every person who is liable to pay tax in accordance with the provisions of this Act or the rules made thereunder, but fails to pay the tax or any part thereof to the Government within the period prescribed, shall for the period for which the tax or any part thereof remains unpaid, pay, on his own, interest at such rate, not exceeding eighteen per cent., as may be notified by the Government on the recommendations of the Council.
Provided that the interest on tax payable in respect of supplies made during a tax period and declared in the return for the said period furnished after the due date in accordance with the provisions of section 39, except where such return is furnished after commencement of any proceedings under section 73 or section 74 in respect of the said period, shall be payable on that portion of the tax which is paid by debiting the electronic cash ledger.
"""
    },
    {
        "doc_name": "CGST_Rules_2017.txt",
        "text": """
Rule 42. Manner of determination of input tax credit in respect of inputs or input services and reversal thereof.
(1) The input tax credit in respect of inputs or input services, which attract the provisions of sub-section (1) or sub-section (2) of section 17, being partly used for the purposes of business and partly for other purposes, or partly used for effecting taxable supplies including zero rated supplies and partly for effecting exempt supplies, shall be attributed to the purposes of business or for effecting taxable supplies in the following manner, namely:—
(a) the total input tax involved on inputs and input services in a tax period, be denoted as ‘T’;
(b) the amount of input tax, out of ‘T’, attributable to inputs and input services intended to be used exclusively for the purposes other than business, be denoted as ‘T1’;
(c) the amount of input tax, out of ‘T’, attributable to inputs and input services intended to be used exclusively for effecting exempt supplies, be denoted as ‘T2’;
(d) the amount of input tax, out of ‘T’, in respect of inputs and input services on which credit is not available under sub-section (5) of section 17, be denoted as ‘T3’;
(e) the amount of input tax credit credited to the electronic credit ledger of registered person, be denoted as ‘C1’ and calculated as— C1 = T - (T1 + T2 + T3);
(f) the amount of input tax credit attributable to inputs and input services intended to be used exclusively for effecting supplies other than exempted supplies but including zero-rated supplies, be denoted as ‘T4’;
(g) ‘T1’, ‘T2’, ‘T3’ and ‘T4’ shall be determined and declared by the registered person at the invoice level in FORM GSTR-3B;
(h) input tax credit common to taxable and exempt supplies, denoted as ‘C2’ and calculated as— C2 = C1 - T4;
(i) the amount of input tax credit attributable towards exempt supplies, be denoted as ‘D1’ and calculated as— D1 = (E÷F) × C2 where ‘E’ is the aggregate value of exempt supplies during the tax period, and ‘F’ is the total turnover in the State of the registered person during the tax period;
(j) the amount of input tax credit attributable towards non-business purposes if common inputs are so used, be denoted as ‘D2’ and calculated as— D2 = 5% of C2;
(k) the remainder, denoted as ‘C3’, is the eligible common credit attributable towards taxable supplies including zero-rated supplies: C3 = C2 - (D1 + D2).

Rule 59. Form and manner of furnishing details of outward supplies.
(1) The details of outward supplies of goods and services shall be furnished in FORM GSTR-1 electronically on or before the eleventh day of the month succeeding the said tax period.
(2) The registered persons opting for QRMP scheme under section 39(1) shall furnish details of outward supplies in FORM GSTR-1 quarterly on or before the thirteenth day of the month succeeding such quarter.

Rule 61. Form and manner of submission of return.
(1) Every registered person of monthly filing shall furnish return in FORM GSTR-3B on or before twentieth day of the month succeeding such tax period.
"""
    },
    {
        "doc_name": "CBIC_Notifications_Consolidated.txt",
        "text": """
Notification No. 19/2021-Central Tax, dated 01 June 2021.
In exercise of the powers conferred by section 128 of the Central Goods and Services Tax Act, 2017, the Government waives late fee under section 47 for registered persons who fail to furnish the returns in FORM GSTR-3B by the due date:
(a) Total amount of late fee payable under section 47 shall be restricted to ₹250 CGST + ₹250 SGST (total ₹500) where the total amount of central tax payable in the said return is nil.
(b) Registered persons having an aggregate turnover of up to ₹1.5 crore in the preceding financial year, late fee capped at ₹1,000 CGST + ₹1,000 SGST (total ₹2,000).
(c) Registered persons having aggregate turnover of more than ₹1.5 crore and up to ₹5 crore, late fee capped at ₹2,500 CGST + ₹2,500 SGST (total ₹5,000).
(d) Registered persons having aggregate turnover of more than ₹5 crore, late fee capped at ₹5,000 CGST + ₹5,000 SGST (total ₹10,000).

Notification No. 07/2023-Central Tax, dated 31 March 2023.
Late fee payable under section 47 of the said Act for delayed filing of annual return in FORM GSTR-9 for the financial year 2022-23 onwards:
(a) Registered persons with aggregate turnover up to ₹5 crore: ₹25 CGST + ₹25 SGST (₹50 per day), subject to a maximum of 0.02% CGST + 0.02% SGST (0.04% of turnover in the State or Union territory).
(b) Registered persons with aggregate turnover of more than ₹5 crore and up to ₹20 crore: ₹50 CGST + ₹50 SGST (₹100 per day), subject to a maximum of 0.02% CGST + 0.02% SGST (0.04% of turnover in State/UT).
(c) Registered persons with aggregate turnover above ₹20 crore: ₹100 CGST + ₹100 SGST (₹200 per day), subject to a maximum of 0.25% CGST + 0.25% SGST (0.5% of turnover in State/UT).
"""
    }
]


# ═══════════════════════════════════════════════════════════════════════
# INGESTION RUNNER
# ═══════════════════════════════════════════════════════════════════════

async def ingest_corpus(docs_dir: Optional[str] = None) -> dict:
    """Ingest documents from folder and statutory seed into VectorStore and BM25Index."""
    all_chunks: list[dict] = []

    # 1. Process files from docs_dir if provided and exists
    if docs_dir and os.path.isdir(docs_dir):
        files = [os.path.join(docs_dir, f) for f in os.listdir(docs_dir)]
        pdf_files = [f for f in files if f.lower().endswith(".pdf")]
        txt_files = [f for f in files if f.lower().endswith((".txt", ".md"))]

        print(f"[Ingest] Found {len(pdf_files)} PDFs and {len(txt_files)} text files in {docs_dir}")

        for pdf_path in pdf_files:
            doc_name = os.path.basename(pdf_path)
            print(f"[Ingest] Processing PDF: {doc_name}...")
            text = extract_text_from_pdf(pdf_path)
            if text.strip():
                chunks = parse_legal_structure(doc_name, text)
                all_chunks.extend(chunks)

        for txt_path in txt_files:
            doc_name = os.path.basename(txt_path)
            with open(txt_path, "r", encoding="utf-8") as f:
                text = f.read()
            if text.strip():
                chunks = parse_legal_structure(doc_name, text)
                all_chunks.extend(chunks)

    # 2. Always include verified statutory seed corpus
    print(f"[Ingest] Ingesting statutory seed corpus ({len(STATUTORY_SEED_DOCUMENTS)} core files)...")
    for seed in STATUTORY_SEED_DOCUMENTS:
        chunks = parse_legal_structure(seed["doc_name"], seed["text"])
        all_chunks.extend(chunks)

    if not all_chunks:
        print("[Ingest] No chunks found to ingest.")
        return {"chunks": 0}

    print(f"[Ingest] Total chunks to index: {len(all_chunks)}")

    # 3. Add to vector store
    texts = [c["text"] for c in all_chunks]
    metadatas = [c["metadata"] for c in all_chunks]
    ids = [f"{c['metadata']['doc_name']}_{c['metadata']['section']}_{i}".replace(" ", "_").replace("/", "-") for i, c in enumerate(all_chunks)]

    print("[Ingest] Adding to VectorStore (embeddings)...")
    await vector_store.add_documents(texts=texts, metadatas=metadatas, ids=ids)

    # 4. Add to BM25 index and persist to disk
    print(f"[Ingest] Indexing into BM25 and saving to {hybrid_search.index_path}...")
    bm25_tuples = [(id_, text, meta) for id_, text, meta in zip(ids, texts, metadatas)]
    hybrid_search.index_documents(bm25_tuples, persist=True)

    print(f"[OK] [Ingest] Successfully ingested {len(all_chunks)} legal chunks into VectorStore & BM25Index.")
    return {
        "total_chunks": len(all_chunks),
        "bm25_path": hybrid_search.index_path,
        "sections_indexed": len(set(c["metadata"]["section"] for c in all_chunks)),
    }


def main():
    parser = argparse.ArgumentParser(description="TaxSathi AI Statutory Knowledge Ingestor")
    parser.add_argument("--docs-dir", type=str, default="./data/official_docs", help="Directory containing official PDFs")
    args = parser.parse_args()

    asyncio.run(ingest_corpus(args.docs_dir))


if __name__ == "__main__":
    main()
