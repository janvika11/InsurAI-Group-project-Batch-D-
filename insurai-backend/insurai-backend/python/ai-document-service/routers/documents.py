from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

from services.document_service import extract_from_pdf, compare_documents

router = APIRouter()


@router.post("/extract")
async def post_extract(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "PDF file required")
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(400, "Empty file")
    return extract_from_pdf(content)


class CompareRequest(BaseModel):
    doc1_fields: dict
    doc2_fields: dict


@router.post("/compare")
async def post_compare(req: CompareRequest):
    return compare_documents(req.doc1_fields, req.doc2_fields)


@router.get("/health")
async def health():
    return {"status": "ok", "service": "ai-document-service"}
