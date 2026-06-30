"""
Query Expander — rewrites user query into multiple variants for better recall.
Uses LLM to generate semantically diverse reformulations.
"""

import json
from typing import Optional
from app.core.llm_handler import llm_handler


class QueryExpander:
    """Expands a single user query into multiple search variants."""

    async def expand(self, query: str, num_variants: int = 3) -> list[str]:
        """
        Generate query variants for improved retrieval recall.
        Returns the original query + generated variants.
        """
        variants = [query]

        expand_prompt = (
            "You are a query expansion assistant for Indian GST/tax queries. "
            "Given the user query below, generate {n} alternative phrasings that "
            "capture the same intent but use different keywords and phrasing. "
            "Include technical terms, section numbers, and common abbreviations where relevant.\n\n"
            "Return ONLY a JSON array of strings.\n\n"
            f"Original query: {query}\n\n"
            f"Generate {num_variants} variants:"
        )

        try:
            result = await llm_handler.generate(
                expand_prompt.format(n=num_variants),
                temperature=0.7,
                max_tokens=300,
            )
            parsed = json.loads(result.strip())
            if isinstance(parsed, list):
                variants.extend([str(v) for v in parsed[:num_variants]])
        except Exception:
            # Fallback: simple keyword expansion
            variants.extend(self._keyword_expand(query))

        return variants[:num_variants + 1]

    def _keyword_expand(self, query: str) -> list[str]:
        """Simple keyword-based query expansion fallback."""
        expansions = []
        q = query.lower()

        # GST-specific expansions
        abbreviations = {
            "gst": "Goods and Services Tax",
            "itc": "Input Tax Credit Section 16",
            "hsn": "Harmonized System of Nomenclature",
            "gstr": "GST Return form",
            "cgst": "Central Goods and Services Tax",
            "sgst": "State Goods and Services Tax",
            "igst": "Integrated Goods and Services Tax",
            "eway": "E-Way Bill",
            "rcm": "Reverse Charge Mechanism",
            "tds": "Tax Deducted at Source",
            "tcs": "Tax Collected at Source",
        }

        for abbr, full in abbreviations.items():
            if abbr in q:
                expansions.append(query.lower().replace(abbr, full.lower()))
                break

        if not expansions:
            expansions.append(f"CBIC notification regarding {query}")
            expansions.append(f"GST Act section for {query}")

        return expansions[:2]


# Singleton
query_expander = QueryExpander()
