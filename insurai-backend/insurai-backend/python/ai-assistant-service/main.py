from fastapi import FastAPI

from routers import assistant

app = FastAPI(title="InsurAI Assistant Service", version="1.0.0")
app.include_router(assistant.router, prefix="/api/ai/assistant")


@app.get("/health")
async def root_health():
    return {"status": "ok", "service": "ai-assistant-service"}
