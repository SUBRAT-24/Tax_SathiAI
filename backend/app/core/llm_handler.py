"""
LLM Handler — Google Gemini (primary) + OpenAI GPT-4o (fallback).
Supports both regular and streaming responses.
"""

import asyncio
import json
from typing import AsyncGenerator, Optional
from app.config import settings


class LLMHandler:
    """Unified LLM interface with Gemini primary and OpenAI fallback."""

    def __init__(self):
        self.gemini_client = None
        self.openai_client = None
        self._init_clients()

    def _init_clients(self):
        """Initialize available LLM clients, ignoring placeholder keys."""
        gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
        if gemini_key and not gemini_key.startswith("your-") and not gemini_key.startswith("placeholder"):
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model_name = getattr(settings, 'GEMINI_MODEL', 'gemini-2.0-flash') or 'gemini-2.0-flash'
                self.gemini_client = genai.GenerativeModel(model_name)
                print(f"[LLM] Gemini initialized with model: {model_name}")
            except Exception as e:
                print(f"[LLM] Gemini init failed: {e}")

        openai_key = getattr(settings, "OPENAI_API_KEY", "") or ""
        if openai_key and not openai_key.startswith("your-") and not openai_key.startswith("placeholder"):
            try:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=openai_key)
            except Exception as e:
                print(f"[LLM] OpenAI init failed: {e}")

    async def generate(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> str:
        """Generate a response with timeouts and exponential backoff retry."""
        timeout_sec = getattr(settings, "LLM_TIMEOUT_SECONDS", 30)
        max_retries = getattr(settings, "LLM_MAX_RETRIES", 3)

        # Try Gemini with retry and timeout
        if self.gemini_client:
            for attempt in range(max_retries):
                try:
                    return await asyncio.wait_for(
                        self._gemini_generate(prompt, system_prompt, temperature, max_tokens),
                        timeout=timeout_sec,
                    )
                except asyncio.TimeoutError:
                    print(f"[LLM] Gemini timeout after {timeout_sec}s (attempt {attempt+1}/{max_retries})")
                except Exception as e:
                    err_msg = str(e).lower()
                    if ("429" in err_msg or "quota" in err_msg or "rate limit" in err_msg) and attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    print(f"[LLM] Gemini failed (attempt {attempt+1}/{max_retries}): {e}")
                    break

        # Try OpenAI with retry and timeout
        if self.openai_client:
            for attempt in range(max_retries):
                try:
                    return await asyncio.wait_for(
                        self._openai_generate(prompt, system_prompt, temperature, max_tokens),
                        timeout=timeout_sec,
                    )
                except asyncio.TimeoutError:
                    print(f"[LLM] OpenAI timeout after {timeout_sec}s (attempt {attempt+1}/{max_retries})")
                except Exception as e:
                    err_msg = str(e).lower()
                    if ("429" in err_msg or "rate limit" in err_msg) and attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
                        continue
                    print(f"[LLM] OpenAI fallback failed (attempt {attempt+1}/{max_retries}): {e}")
                    break

        # Demo mode — return helpful response without API keys
        return self._demo_response(prompt)

    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = "",
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """Generate a streaming response. Tries Gemini first, falls back to OpenAI."""
        # Try Gemini
        if self.gemini_client:
            try:
                async for chunk in self._gemini_stream(prompt, system_prompt, temperature, max_tokens):
                    yield chunk
                return
            except Exception as e:
                print(f"[LLM] Gemini stream failed: {e}")

        # Try OpenAI
        if self.openai_client:
            try:
                async for chunk in self._openai_stream(prompt, system_prompt, temperature, max_tokens):
                    yield chunk
                return
            except Exception as e:
                print(f"[LLM] OpenAI stream failed: {e}")

        # Demo mode
        demo = self._demo_response(prompt)
        for word in demo.split(" "):
            yield word + " "
            await asyncio.sleep(0.05)

    async def _gemini_generate(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> str:
        """Generate with Google Gemini."""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = await asyncio.to_thread(
            self.gemini_client.generate_content,
            full_prompt,
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
        )
        return response.text

    async def _gemini_stream(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream with Google Gemini."""
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
        response = await asyncio.to_thread(
            self.gemini_client.generate_content,
            full_prompt,
            generation_config={"temperature": temperature, "max_output_tokens": max_tokens},
            stream=True,
        )
        for chunk in response:
            if chunk.text:
                yield chunk.text

    async def _openai_generate(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> str:
        """Generate with OpenAI."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

    async def _openai_stream(self, prompt: str, system_prompt: str, temperature: float, max_tokens: int) -> AsyncGenerator[str, None]:
        """Stream with OpenAI."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def _demo_response(self, prompt: str) -> str:
        """Generate a helpful demo response when no API keys are configured."""
        prompt_lower = prompt.lower()

        if "gst" in prompt_lower and "register" in prompt_lower:
            return (
                "## GST Registration Process\n\n"
                "To register for GST in India, follow these steps:\n\n"
                "1. **Visit** the GST Portal: [www.gst.gov.in](https://www.gst.gov.in)\n"
                "2. **Fill Part A** of Form GST REG-01 with your PAN, mobile, and email\n"
                "3. **Verify OTP** sent to your mobile and email\n"
                "4. **Fill Part B** with business details, bank account, and upload documents\n"
                "5. **Submit** and note the Application Reference Number (ARN)\n"
                "6. **Receive GSTIN** within 7 working days (usually 3 days)\n\n"
                "### Required Documents:\n"
                "- PAN Card of the business/proprietor\n"
                "- Aadhaar Card\n"
                "- Business address proof\n"
                "- Bank account statement/cancelled cheque\n"
                "- Photograph of the proprietor\n\n"
                "**Threshold Limit**: ₹40 lakhs for goods, ₹20 lakhs for services (₹10 lakhs for special category states)\n\n"
                "📋 *Source: CBIC Circular No. 128/47/2019-GST, Section 22 of CGST Act 2017*\n\n"
                "⚠️ *This is AI-generated guidance, not legal advice. Please verify with a qualified CA.*"
            )
        elif "itc" in prompt_lower or "input tax credit" in prompt_lower:
            return (
                "## Input Tax Credit (ITC) Rules\n\n"
                "ITC can be claimed under Section 16 of CGST Act, 2017:\n\n"
                "### Conditions for claiming ITC:\n"
                "1. Must have a **tax invoice** or debit note from the supplier\n"
                "2. Must have **received** the goods or services\n"
                "3. **Tax must be paid** to the government by the supplier\n"
                "4. Must have filed **GSTR-3B** return\n"
                "5. Must claim within the **due date of September return** of the following year\n\n"
                "### ITC NOT available on (Section 17(5)):\n"
                "- Motor vehicles (except specific cases)\n"
                "- Food, beverages, outdoor catering\n"
                "- Beauty treatment, health services\n"
                "- Club memberships\n"
                "- Personal consumption goods\n\n"
                "### ITC Reversal:\n"
                "- **Rule 42**: Common credit for taxable + exempt supplies\n"
                "- **Rule 43**: Capital goods used partly for business\n\n"
                "📋 *Source: Section 16-21 of CGST Act, 2017; Rules 36-45 of CGST Rules*\n\n"
                "⚠️ *This is AI-generated guidance, not legal advice. Please verify with a qualified CA.*"
            )
        else:
            return (
                "## GST Query Response\n\n"
                "Thank you for your question about GST compliance. Here's what I can help with:\n\n"
                "### Key GST Information:\n"
                "- **GST Rates**: 0%, 5%, 12%, 18%, 28% (plus cess on some items)\n"
                "- **Return Filing**: GSTR-1 (outward supplies), GSTR-3B (summary return)\n"
                "- **Due Dates**: GSTR-1 by 11th, GSTR-3B by 20th of following month\n"
                "- **Composition Scheme**: Available for businesses with turnover up to ₹1.5 Cr\n\n"
                "### Common Topics I Can Help With:\n"
                "- GST Registration process\n"
                "- Input Tax Credit (ITC) rules\n"
                "- Return filing procedures\n"
                "- HSN/SAC code lookup\n"
                "- Penalty calculations\n"
                "- E-way bill requirements\n\n"
                "Please ask a specific question and I'll provide detailed, cited guidance.\n\n"
                "📋 *Source: CGST Act 2017, CBIC official notifications*\n\n"
                "⚠️ *This is AI-generated guidance, not legal advice. Please verify with a qualified CA.*"
            )

    async def classify_intent(self, query: str) -> str:
        """Classify the intent of a user query."""
        intent_prompt = (
            "Classify the following GST/tax query into exactly one category. "
            "Respond with ONLY the category name, nothing else.\n"
            "Categories: ITC Query, Filing Deadline, Penalty Calculation, HSN Code, "
            "Registration, Return Filing, E-Way Bill, Composition Scheme, "
            "Tax Rate, Refund, General GST\n\n"
            f"Query: {query}"
        )

        if self.gemini_client or self.openai_client:
            try:
                result = await self.generate(intent_prompt, temperature=0.1, max_tokens=20)
                return result.strip()
            except Exception:
                pass

        # Keyword-based fallback
        q = query.lower()
        if "itc" in q or "input tax credit" in q:
            return "ITC Query"
        elif "due date" in q or "deadline" in q or "filing date" in q:
            return "Filing Deadline"
        elif "penalty" in q or "late fee" in q or "fine" in q:
            return "Penalty Calculation"
        elif "hsn" in q or "sac" in q or "code" in q:
            return "HSN Code"
        elif "register" in q or "registration" in q:
            return "Registration"
        elif "return" in q or "gstr" in q or "filing" in q:
            return "Return Filing"
        elif "e-way" in q or "eway" in q:
            return "E-Way Bill"
        elif "composition" in q:
            return "Composition Scheme"
        elif "rate" in q or "%" in q or "percent" in q:
            return "Tax Rate"
        elif "refund" in q:
            return "Refund"
        return "General GST"

    async def generate_suggestions(self, query: str, answer: str) -> list[str]:
        """Generate 3 follow-up question suggestions based on context."""
        suggestion_prompt = (
            "Based on the following GST query and answer, generate exactly 3 "
            "natural follow-up questions the user might ask. "
            "Return as a JSON array of strings.\n\n"
            f"Query: {query}\n"
            f"Answer: {answer[:500]}\n\n"
            "Respond with ONLY a JSON array, e.g.: [\"question1\", \"question2\", \"question3\"]"
        )

        if self.gemini_client or self.openai_client:
            try:
                result = await self.generate(suggestion_prompt, temperature=0.7, max_tokens=200)
                suggestions = json.loads(result.strip())
                if isinstance(suggestions, list) and len(suggestions) >= 3:
                    return suggestions[:3]
            except Exception:
                pass

        # Fallback suggestions
        return [
            "What are the penalties for late GST filing?",
            "How do I claim Input Tax Credit?",
            "What is the GST rate for my product?",
        ]


# Singleton instance
llm_handler = LLMHandler()
