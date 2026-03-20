from fastapi import FastAPI

from routers import documents

app = FastAPI(title="InsurAI Document Service", version="1.0.0")
app.include_router(documents.router, prefix="/api/ai/documents")


@app.get("/health")
async def root_health():
    return {"status": "ok", "service": "ai-document-service"}
