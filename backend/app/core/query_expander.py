"""
Query Expander — rewrites user query into multiple variants for better recall.
Skips query expansion for short or exact queries (section numbers, HSN codes, return types, GSTIN).
"""

import json
import re
from typing import Optional
from app.core.llm_handler import llm_handler


class QueryExpander:
    """Expands user queries into search variants while preserving exact statutory identifiers."""

    EXACT_PATTERNS = [
        re.compile(r'\b(sec|section)\s+\d+([a-z])?(\(\d+\))?(\([a-z]\))?', re.IGNORECASE),
        re.compile(r'\b(rule)\s+\d+([a-z])?(\(\d+\))?(\([a-z]\))?', re.IGNORECASE),
        re.compile(r'\b(hsn|sac)\s*\b\d{2,8}\b', re.IGNORECASE),
        re.compile(r'\b\d{4,8}\b'),  # 4-to-8 digit standalone HSN code
        re.compile(r'\bnotif\w*\s*\.?\s*\d+/\d+', re.IGNORECASE),
        re.compile(r'\bgstr[- ]?[0-9][a-z]?', re.IGNORECASE),
        re.compile(r'\b[0-9]{2}[a-z]{5}[0-9]{4}[a-z]{1}[1-9a-z]{1}z[0-9a-z]{1}\b', re.IGNORECASE),  # GSTIN
    ]

    def should_skip_expansion(self, query: str) -> bool:
        """Return True if query is short or contains exact statutory / tariff references."""
        q = query.strip()
        words = q.split()

        # 1. Short queries (3 or fewer words, or under 18 characters)
        if len(words) <= 3 or len(q) <= 18:
            return True

        # 2. Exact statutory or code references
        for pattern in self.EXACT_PATTERNS:
            if pattern.search(q):
                return True

        return False

    async def expand(self, query: str, num_variants: int = 2) -> list[str]:
        """Generate query variants for improved retrieval recall.

        Skips expansion for short or exact queries to prevent keyword drift.
        """
        variants = [query]

        if self.should_skip_expansion(query):
            return variants

        expand_prompt = (
            "You are a query expansion assistant for Indian GST and tax compliance. "
            "Given the user question below, generate {n} alternative search queries that "
            "capture the exact same statutory intent using formal Indian tax legal terminology. "
            "Include technical legal terms and Act/Rule references where relevant.\n\n"
            "Return ONLY a valid JSON array of strings without markdown or explanation.\n\n"
            f"Original query: {query}\n\n"
            f"Generate {num_variants} alternative queries:"
        )

        try:
            result = await llm_handler.generate(
                expand_prompt.format(n=num_variants),
                temperature=0.3,
                max_tokens=200,
            )
            # Strip code block wrappers if any
            clean_result = result.strip()
            if clean_result.startswith("```"):
                clean_result = re.sub(r"^```(?:json)?\s*|\s*```$", "", clean_result, flags=re.MULTILINE).strip()

            parsed = json.loads(clean_result)
            if isinstance(parsed, list):
                variants.extend([str(v).strip() for v in parsed[:num_variants] if str(v).strip()])
        except Exception:
            # Fallback: rule-based expansion
            variants.extend(self._keyword_expand(query))

        return variants[:num_variants + 1]

    def _keyword_expand(self, query: str) -> list[str]:
        """Simple keyword-based query expansion fallback."""
        expansions = []
        q = query.lower()

        abbreviations = {
            "itc": "input tax credit section 16 17",
            "rcm": "reverse charge mechanism section 9",
            "eway": "e-way bill rule 138",
            "tds": "tax deduction at source section 51",
            "tcs": "tax collection at source section 52",
        }

        for abbr, full in abbreviations.items():
            if re.search(r'\b' + re.escape(abbr) + r'\b', q):
                expansions.append(re.sub(r'\b' + re.escape(abbr) + r'\b', full, q, flags=re.IGNORECASE))
                break

        return expansions[:1]


# Singleton
query_expander = QueryExpander()
