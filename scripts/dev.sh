#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting LangStar development server...${NC}"

# 포트 확인
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. $service service might be running.${NC}"
        return 1
    fi
    return 0
}

# 포트 체크
check_port 5173 "Frontend" || echo -e "${YELLOW}Frontend port (5173) check required${NC}"
check_port 8000 "Backend" || echo -e "${YELLOW}Backend port (8000) check required${NC}"

# 에러 핸들러 함수
cleanup() {
    echo -e "\n${RED}❌ One of the services failed. All services will be terminated.${NC}"
    echo -e "${YELLOW}🧹 Performing cleanup...${NC}"
    
    # 프로세스 종료
    pkill -f "uvicorn server.app:app" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*dev" 2>/dev/null || true
    
    # 포트 정리
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed.${NC}"
    exit 1
}

# 포트 충돌 시 노티만 하고 종료하는 함수
cleanup_port_conflict() {
    echo -e "\n${YELLOW}⚠️  Port conflict detected.${NC}"
    echo -e "${YELLOW}📋 Currently running services:${NC}"
    
    # 현재 실행 중인 프로세스 확인
    echo -e "${BLUE}Frontend (Port 5173):${NC}"
    lsof -ti:5173 2>/dev/null | while read pid; do
        ps -p $pid -o pid,ppid,command --no-headers 2>/dev/null || echo "  Unable to get process information."
    done
    
    echo -e "${BLUE}Backend (Port 8000):${NC}"
    lsof -ti:8000 2>/dev/null | while read pid; do
        ps -p $pid -o pid,ppid,command --no-headers 2>/dev/null || echo "  Unable to get process information."
    done
    
    echo -e "${YELLOW}💡 Solutions:${NC}"
    echo -e "  1. Stop existing services manually: ${GREEN}npm run stop-dev${NC}"
    echo -e "  2. Clean ports manually: ${GREEN}npm run clean-ports${NC}"
    echo -e "  3. Try again: ${GREEN}npm run dev${NC}"
    
    exit 1
}

# 시그널 핸들러 설정
trap cleanup SIGINT SIGTERM

# concurrently로 서비스 실행
concurrently \
    --kill-others-on-fail \
    --handle-input \
    --names "FRONTEND,BACKEND" \
    --prefix-colors "bgBlue.bold,bgGreen.bold" \
    --success "first" \
    "npm run dev --prefix ui" \
    "source server/venv/bin/activate && uvicorn server.app:app --reload --log-level info --timeout-keep-alive 5"

# concurrently가 실패한 경우
if [ $? -ne 0 ]; then
    # 포트 충돌인지 확인
    if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1 || lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        cleanup_port_conflict
    else
        cleanup
    fi
fi 