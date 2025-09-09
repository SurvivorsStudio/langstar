from fastapi import FastAPI, Body, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import signal
import sys
import os
from contextlib import asynccontextmanager

# Import structured modules
from server.utils.logger import setup_logger
from server.routes import health, workflow, deployment, execution
from server.utils.response import err

# Setup logger
logger = setup_logger()

app = FastAPI()
# 전역 예외 핸들러 (HTTPException 이외의 예외를 ok=false로 정규화)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", str(exc))
    return JSONResponse(status_code=500, content=err(code="INTERNAL", message=str(exc), status=500))

# 안전한 종료를 위한 시그널 핸들러
def signal_handler(signum, frame):
    print("\n" + "="*50)
    print("Shutting down server safely...")
    print("="*50)
    os._exit(0)

# SIGINT (Ctrl+C)와 SIGTERM 시그널 등록
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 앱 시작 시 즉시 실행되는 메시지
sys.stdout.write("\n" + "="*60 + "\n")
sys.stdout.write("LangStar server has started!\n")
sys.stdout.write("="*60 + "\n\n")
sys.stdout.flush()

# Include routers
app.include_router(health.router, tags=["health"])
app.include_router(workflow.router, tags=["workflow"])
app.include_router(deployment.router, prefix="/api", tags=["deployment"])
app.include_router(execution.router, prefix="/api", tags=["execution"])


