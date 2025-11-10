from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
import signal
import sys
import os
from contextlib import asynccontextmanager
import atexit

# Import structured modules
from server.utils.logger import setup_logger
from server.routes import health, workflow, deployment, execution, schedule
from server.services.schedule_service import schedule_service

# Setup logger
logger = setup_logger()

app = FastAPI()

# 안전한 종료를 위한 시그널 핸들러
def signal_handler(signum, frame):
    print("\n" + "="*50)
    print("Shutting down server safely...")
    print("="*50)
    schedule_service.shutdown()
    os._exit(0)

# 스케줄러 종료 핸들러 등록
atexit.register(schedule_service.shutdown)

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
app.include_router(schedule.router, prefix="/api", tags=["schedule"])

# 서버 시작 시 저장된 스케줄 로드
schedule_service.load_schedules_on_startup()


