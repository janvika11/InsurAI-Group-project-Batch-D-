from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI

from kafka.consumer import start_consumer
from routers import risk


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(start_consumer())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="InsurAI Risk Service", version="1.0.0", lifespan=lifespan)
app.include_router(risk.router, prefix="/api/ai/risk")


@app.get("/health")
async def root_health():
    return {"status": "ok", "service": "ai-risk-service"}
