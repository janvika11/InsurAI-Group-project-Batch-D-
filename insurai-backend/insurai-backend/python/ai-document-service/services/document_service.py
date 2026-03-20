import re
from io import BytesIO
from typing import Optional

from PyPDF2 import PdfReader


# Regex patterns for fallback extraction
POLICY_NUMBER_PATTERNS = [
    r"(?:policy\s*(?:no|number|#|id)[:\s]*)([A-Z0-9\-/]+)",
    r"(?:POL[-_]?\d{4}[-_]?\d{4})",
    r"([A-Z]{2,4}[-]\d{4}[-]\d{4})",
    r"(\d{4}[-]\d{4})",
]
HOLDER_NAME_PATTERNS = [
    r"(?:policy\s*holder|insured|name)[:\s]*([A-Za-z\s\.]+?)(?:\n|$|,)",
    r"(?:holder\s*name)[:\s]*([A-Za-z\s\.]+)",
]
AMOUNT_PATTERNS = [
    r"(?:coverage|sum\s*insured|amount)[:\s]*[₹$]?\s*([\d,]+(?:\.\d{2})?)",
    r"([\d,]+(?:\.\d{2})?)\s*(?:lakh|lac|Lakh)",
    r"₹\s*([\d,]+(?:\.\d{2})?)",
    r"\$\s*([\d,]+(?:\.\d{2})?)",
]
DATE_PATTERNS = [
    r"(?:start|from|effective)\s*date[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4})",
    r"(?:end|to|expiry)\s*date[:\s]*(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4}|\d{2}-\d{2}-\d{4})",
    r"(\d{4}-\d{2}-\d{2})",
    r"(\d{2}/\d{2}/\d{4})",
]


def _extract_with_patterns(text: str, patterns: list) -> Optional[str]:
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip() if m.lastindex else m.group(0).strip()
            if val and len(val) > 1:
                return val
    return None


def _extract_amounts(text: str) -> list[tuple[str, float]]:
    results = []
    for pat in AMOUNT_PATTERNS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            g = m.group(1) if m.lastindex else m.group(0)
            if g:
                clean = g.replace(",", "")
                try:
                    val = float(clean)
                    if val > 0 and val < 1e12:
                        results.append((g, val))
                except ValueError:
                    pass
    return results


def _extract_dates(text: str) -> list[str]:
    results = []
    for pat in DATE_PATTERNS:
        for m in re.finditer(pat, text, re.IGNORECASE):
            g = m.group(1) if m.lastindex else m.group(0)
            if g and g not in results:
                results.append(g)
    return results


def extract_from_pdf(content: bytes) -> dict:
    """Extract text from PDF and apply regex fallback for key fields."""
    reader = PdfReader(BytesIO(content))
    raw_text = ""
    for page in reader.pages:
        raw_text += page.extract_text() or ""
        raw_text += "\n"

    extracted = {}
    confidence = {}

    policy = _extract_with_patterns(raw_text, POLICY_NUMBER_PATTERNS)
    if policy:
        extracted["policy_number"] = policy
        confidence["policy_number"] = 0.92

    holder = _extract_with_patterns(raw_text, HOLDER_NAME_PATTERNS)
    if holder:
        extracted["holder_name"] = holder.strip()
        confidence["holder_name"] = 0.88

    amounts = _extract_amounts(raw_text)
    if amounts:
        # Use largest amount as coverage_amount
        amounts.sort(key=lambda x: x[1], reverse=True)
        extracted["coverage_amount"] = amounts[0][1]
        confidence["coverage_amount"] = 0.85

    dates = _extract_dates(raw_text)
    if len(dates) >= 1:
        extracted["start_date"] = dates[0]
        confidence["start_date"] = 0.80
    if len(dates) >= 2:
        extracted["end_date"] = dates[1]
        confidence["end_date"] = 0.80

    return {
        "document_type": "POLICY_DOCUMENT",
        "extracted_fields": extracted,
        "confidence_scores": confidence,
        "raw_text": raw_text[:5000] if raw_text else "",
    }


def compare_documents(doc1_fields: dict, doc2_fields: dict) -> dict:
    """Compare two extracted document field sets."""
    all_keys = set(doc1_fields) | set(doc2_fields)
    matches = []
    mismatches = []
    for k in all_keys:
        v1 = doc1_fields.get(k)
        v2 = doc2_fields.get(k)
        if v1 is None and v2 is None:
            continue
        if v1 == v2:
            matches.append({"field": k, "value": v1})
        else:
            mismatches.append({"field": k, "doc1": v1, "doc2": v2})
    return {
        "matches": matches,
        "mismatches": mismatches,
        "match_count": len(matches),
        "mismatch_count": len(mismatches),
    }
