from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from services.assistant_service import chat, summarize

router = APIRouter()


class ChatRequest(BaseModel):
    userId: str
    message: str
    conversationId: Optional[str] = None


class SummarizeRequest(BaseModel):
    policy_id: Optional[str] = None
    content: Optional[str] = None


@router.post("/chat")
async def post_chat(req: ChatRequest):
    result = await chat(req.userId, req.message, req.conversationId)
    return result


@router.post("/summarize")
async def post_summarize(req: SummarizeRequest):
    result = await summarize(req.policy_id, req.content)
    return result


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ai-assistant-service"}
