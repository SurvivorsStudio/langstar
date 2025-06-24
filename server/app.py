from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import signal
import sys
import os
from contextlib import asynccontextmanager

# Import structured modules
from server.utils.logger import setup_logger
from server.routes import health, workflow

# Setup logger
logger = setup_logger()

app = FastAPI()

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


