import re
from typing import Optional

from config import settings


def _extract_policy_ref(text: str) -> Optional[str]:
    """Extract policy number from user message if present."""
    m = re.search(r"POL[-_]?\d{4}[-_]?\d{4}|policy\s+([A-Z0-9\-]+)", text, re.IGNORECASE)
    if m:
        return m.group(1) or m.group(0)
    return None


def _template_chat(message: str, policy_id: Optional[str] = None) -> str:
    """Template-based fallback when no OpenAI key."""
    policy_ref = policy_id or _extract_policy_ref(message) or "POL-xxxx-xxxx"
    msg_lower = message.lower()

    if "coverage" in msg_lower or "limit" in msg_lower:
        return f"Your policy {policy_ref} has coverage as per the terms. For exact limits, please refer to your policy document or contact support."
    if "premium" in msg_lower or "payment" in msg_lower:
        return f"Premium details for policy {policy_ref} can be found in your policy document. You can also check your renewal dashboard."
    if "claim" in msg_lower:
        return f"For policy {policy_ref}, you can file a claim through the claims portal. Ensure you have supporting documents ready."
    if "renew" in msg_lower:
        return f"Policy {policy_ref} can be renewed through the renewal service. You will receive a reminder before expiry."
    if "summar" in msg_lower or "summary" in msg_lower:
        return f"Policy {policy_ref} summary: Please use the /summarize endpoint with your policy document for a detailed summary."

    return f"Your policy {policy_ref} has coverage as per the terms. For specific questions, please refer to your policy document or contact support."


def _template_summarize(policy_id: Optional[str] = None) -> str:
    """Template-based policy summary fallback."""
    policy_ref = policy_id or "POL-xxxx-xxxx"
    return (
        f"Policy {policy_ref} summary (template fallback): "
        "Coverage details, premium, and terms are as per your policy document. "
        "For full AI-powered summary, set OPENAI_API_KEY and add openai package."
    )


async def chat(user_id: str, message: str, conversation_id: Optional[str] = None) -> dict:
    """Chat with template fallback. Uses OpenAI if OPENAI_API_KEY is set and openai package installed."""
    if settings.openai_api_key:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": message}],
            )
            reply = resp.choices[0].message.content if resp.choices else ""
            if reply:
                return {"reply": reply, "sources": []}
        except ImportError:
            pass  # openai not installed
        except Exception:
            pass  # Fall through to template

    reply = _template_chat(message)
    return {"reply": reply, "sources": []}


async def summarize(policy_id: Optional[str] = None, content: Optional[str] = None) -> dict:
    """Summarize policy with template fallback."""
    if settings.openai_api_key and content:
        try:
            import openai
            client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
            resp = await client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Summarize this insurance policy document briefly."},
                    {"role": "user", "content": content[:4000]},
                ],
            )
            summary = resp.choices[0].message.content if resp.choices else ""
            if summary:
                return {"summary": summary, "policy_id": policy_id}
        except ImportError:
            pass
        except Exception:
            pass

    return {"summary": _template_summarize(policy_id), "policy_id": policy_id}
