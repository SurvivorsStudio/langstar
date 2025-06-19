#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐍 Setting up Python virtual environment...${NC}"

# Python 버전 확인 함수
check_python_version() {
    local python_cmd=$1
    local version_output
    local major_version
    local minor_version
    
    if command -v "$python_cmd" &> /dev/null; then
        version_output=$("$python_cmd" --version 2>&1)
        if [[ $version_output =~ Python[[:space:]]+([0-9]+)\.([0-9]+) ]]; then
            major_version=${BASH_REMATCH[1]}
            minor_version=${BASH_REMATCH[2]}
            
            if [ "$major_version" -eq 3 ] && [ "$minor_version" -ge 11 ]; then
                echo "$python_cmd"
                return 0
            fi
        fi
    fi
    return 1
}

# 사용 가능한 Python 버전 찾기
PYTHON_CMD=""
for cmd in python3.12 python3.11 python3 python; do
    if check_python_version "$cmd"; then
        PYTHON_CMD="$cmd"
        break
    fi
done

if [ -z "$PYTHON_CMD" ]; then
    echo -e "${RED}❌ No compatible Python version found (3.11+ required).${NC}"
    echo -e "${YELLOW}💡 Please install Python 3.11 or higher:${NC}"
    echo -e "   macOS: ${GREEN}brew install python@3.12${NC}"
    echo -e "   Ubuntu/Debian: ${GREEN}sudo apt install python3.11 python3.11-venv python3.11-pip${NC}"
    exit 1
fi

PYTHON_VERSION=$($PYTHON_CMD --version)
echo -e "${GREEN}✅ Found compatible Python: $PYTHON_VERSION${NC}"

# 기존 가상환경이 있다면 제거
if [ -d "server/venv" ]; then
    echo -e "${YELLOW}⚠️  Removing existing virtual environment...${NC}"
    rm -rf server/venv
fi

# 가상환경 생성
echo -e "${BLUE}📦 Creating virtual environment with $PYTHON_CMD...${NC}"
$PYTHON_CMD -m venv server/venv

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to create virtual environment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Virtual environment created successfully.${NC}"

# 가상환경 활성화
echo -e "${BLUE}🔧 Activating virtual environment...${NC}"
source server/venv/bin/activate

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to activate virtual environment.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Virtual environment activated.${NC}"

# pip 업그레이드
echo -e "${BLUE}⬆️  Upgrading pip...${NC}"
python -m ensurepip --upgrade
python -m pip install --upgrade pip

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to upgrade pip.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pip upgraded successfully.${NC}"

# requirements.txt 확인
if [ ! -f "server/requirements.txt" ]; then
    echo -e "${RED}❌ server/requirements.txt not found.${NC}"
    exit 1
fi

# 패키지 설치
echo -e "${BLUE}📚 Installing Python packages...${NC}"
pip install -r server/requirements.txt

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install packages.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All packages installed successfully.${NC}"
echo -e "${GREEN}🎉 Python environment setup completed!${NC}" 