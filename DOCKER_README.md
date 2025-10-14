# 🐳 LangStar Docker Guide / Docker 가이드

[English](#english) | [한국어](#korean)

---

<a name="english"></a>
## English Version

This guide explains how to run the LangStar project in a Docker environment.

### 📋 Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Minimum 4GB RAM recommended

---

### 🖥️ Windows Support

#### Recommended Methods

**1. WSL (Windows Subsystem for Linux) - Best Option**
```bash
# Install WSL from Microsoft Store or command line
wsl --install

# After installation, restart and open WSL
wsl

# Navigate to your project
cd /mnt/c/path/to/langstar

# Use original Makefile commands
make dev
make prod
```

**2. Git Bash - Simple Alternative**
```bash
# Install Git for Windows (includes Git Bash)
# Download from: https://git-scm.com/download/win

# Open Git Bash and navigate to project
cd /c/path/to/langstar

# Use original Makefile commands
make dev
make prod
```

**3. Docker Desktop Terminal**
```bash
# Open Docker Desktop
# Use the built-in terminal

# Navigate to project directory
cd C:\path\to\langstar

# Use original Makefile commands
make dev
make prod
```

#### Alternative: Batch File (Windows Native)
If you prefer Windows native commands, use the provided batch file:

```cmd
# Command Prompt or PowerShell
docker-commands.bat dev
docker-commands.bat prod
docker-commands.bat help
```

#### Windows Compatibility Notes
- **Original Makefile**: Works perfectly with WSL, Git Bash, Docker Terminal
- **Docker Commands**: Cross-platform compatible
- **Health Check**: Uses PowerShell commands for Windows compatibility
- **Path Separators**: Docker handles path conversion automatically

---

### 🚀 Quick Start

#### 1. Development Environment
```bash
# Start development environment (with hot reload support)
make dev

# Or
docker-compose up --build
```

#### 2. Production Environment
```bash
# Start production environment
make prod

# Or
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

### 📁 Docker File Structure

```
langstar/
├── ui/
│   ├── Dockerfile          # Frontend Docker image
│   ├── nginx.conf          # Nginx configuration
│   └── .dockerignore       # Frontend exclude files
├── server/
│   ├── Dockerfile          # Backend Docker image
│   └── .dockerignore       # Backend exclude files
├── docker-compose.yml      # Base configuration
├── docker-compose.override.yml  # Development environment override
├── docker-compose.prod.yml # Production environment
├── .dockerignore           # Root exclude files
└── Makefile               # Convenience commands
```

---

### 🛠️ Available Commands

#### Makefile Commands
```bash
make help      # Show help
make dev       # Start development environment
make prod      # Start production environment
make build     # Build all images
make up        # Start services
make down      # Stop services
make clean     # Clean up
make logs      # Show logs
make frontend  # Run frontend only
make backend   # Run backend only
make health    # Health check
```

#### Docker Compose Commands
```bash
# Development environment
docker-compose up --build

# Production environment
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Stop services
docker-compose down

# Show logs
docker-compose logs -f

# Run specific service only
docker-compose up frontend
docker-compose up backend
```

---

### 🌐 Access Information

#### Development Environment
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

#### Production Environment
- **Frontend**: http://localhost:80 (or http://localhost)
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

---

### 🔧 Environment Configuration

#### Environment Variables
In development environment, `docker-compose.override.yml` is automatically applied.

#### Volume Mounts
- **Development Environment**: Source code is mounted as volumes for real-time changes
- **Production Environment**: Only built files are included

---

### 🐛 Troubleshooting

#### Port Conflicts
```bash
# Check port usage
lsof -i :5173
lsof -i :8000
lsof -i :80

# Clean up ports
make clean
```

#### Image Build Failures
```bash
# Rebuild without cache
docker-compose build --no-cache

# Clean and rebuild
make clean
make build
```

#### Log Checking
```bash
# All logs
docker-compose logs

# Specific service logs
docker-compose logs frontend
docker-compose logs backend

# Real-time logs
docker-compose logs -f
```

#### Health Check
```bash
# Check service status
make health

# Check container status
docker-compose ps
```

---

### 📦 Image Information

#### Frontend Image
- **Base**: node:18-alpine
- **Production**: nginx:alpine
- **Ports**: 5173 (development), 80 (production)

#### Backend Image
- **Base**: python:3.12-slim
- **Port**: 8000
- **Health Check**: /health endpoint

---

### 🔒 Security Considerations

#### Production Environment
- Non-root user execution
- Security headers configuration
- HTTPS recommended
- Environment variable management

#### Development Environment
- Source code volume mounting
- Hot reload enabled
- Debugging tools included

---

### 📈 Monitoring

#### Log Monitoring
```bash
# Real-time logs
docker-compose logs -f

# Logs since specific time
docker-compose logs --since="2024-01-01T00:00:00"
```

#### Resource Monitoring
```bash
# Container resource usage
docker stats

# Image size check
docker images
```

---

### 🚀 Deployment

#### Local Deployment
```bash
make prod
```

#### Cloud Deployment
1. Set image tags
2. Push to registry
3. Run in cloud environment

```bash
# Image tagging
docker tag langstar-frontend:latest your-registry/langstar-frontend:latest
docker tag langstar-backend:latest your-registry/langstar-backend:latest

# Push to registry
docker push your-registry/langstar-frontend:latest
docker push your-registry/langstar-backend:latest
```

---

### 🔄 Multi-Stage Build

#### Development Stage
- Includes all development dependencies
- Hot reload support
- Source code mounting
- Debugging tools

#### Production Stage
- Optimized for production
- Minimal image size
- Security hardened
- Performance optimized

---

### 📊 Performance Optimization

#### Image Size Optimization
- Multi-stage builds
- Alpine Linux base images
- Layer caching
- .dockerignore files

#### Memory Usage
- Development: ~2-3GB RAM
- Production: ~1-2GB RAM
- Model cache: ~200-500MB

---

### 🛡️ Best Practices

#### Security
- Non-root users
- Minimal base images
- Security scanning
- Regular updates

#### Performance
- Layer caching
- Multi-stage builds
- Resource limits
- Health checks

#### Development
- Hot reload
- Volume mounting
- Debugging support
- Logging

---

### 📝 Environment Variables

#### Development
```bash
NODE_ENV=development
PYTHONPATH=/app
ENVIRONMENT=development
```

#### Production
```bash
NODE_ENV=production
PYTHONPATH=/app
ENVIRONMENT=production
```

---

### 🔧 Customization

#### Custom Ports
```yaml
# docker-compose.override.yml
services:
  frontend:
    ports:
      - "3000:5173"  # Custom frontend port
  backend:
    ports:
      - "9000:8000"  # Custom backend port
```

#### Custom Networks
```yaml
# docker-compose.yml
networks:
  custom-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### Resource Limits
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

---

### 🆘 Support

#### Common Issues
- Port conflicts: Use `make clean`
- Build failures: Check Dockerfile syntax
- Memory issues: Increase Docker memory limit
- Network issues: Check Docker network configuration

#### Getting Help
- Check logs: `make logs`
- Health check: `make health`
- Container status: `docker-compose ps`
- System resources: `docker stats`

---

<a name="korean"></a>
## 한국어 버전

이 가이드는 LangStar 프로젝트를 Docker 환경에서 실행하는 방법을 설명합니다.

### 📋 사전 요구사항

- Docker Desktop 설치
- Docker Compose 설치
- 최소 4GB RAM 권장

---

### 🖥️ Windows 지원

#### 권장 방법

**1. WSL (Windows Subsystem for Linux) - 최선의 옵션**
```bash
# Microsoft Store 또는 명령줄에서 WSL 설치
wsl --install

# 설치 후 재시작하고 WSL 열기
wsl

# 프로젝트 디렉토리로 이동
cd /mnt/c/path/to/langstar

# 원래 Makefile 명령어 사용
make dev
make prod
```

**2. Git Bash - 간단한 대안**
```bash
# Git for Windows 설치 (Git Bash 포함)
# 다운로드: https://git-scm.com/download/win

# Git Bash를 열고 프로젝트로 이동
cd /c/path/to/langstar

# 원래 Makefile 명령어 사용
make dev
make prod
```

**3. Docker Desktop 터미널**
```bash
# Docker Desktop 열기
# 내장 터미널 사용

# 프로젝트 디렉토리로 이동
cd C:\path\to\langstar

# 원래 Makefile 명령어 사용
make dev
make prod
```

#### 대안: 배치 파일 (Windows 네이티브)
Windows 네이티브 명령을 선호하는 경우, 제공된 배치 파일을 사용하세요:

```cmd
# 명령 프롬프트 또는 PowerShell
docker-commands.bat dev
docker-commands.bat prod
docker-commands.bat help
```

#### Windows 호환성 참고사항
- **원래 Makefile**: WSL, Git Bash, Docker Terminal에서 완벽하게 작동
- **Docker 명령어**: 크로스 플랫폼 호환
- **헬스 체크**: Windows 호환성을 위한 PowerShell 명령어 사용
- **경로 구분자**: Docker가 자동으로 경로 변환 처리

---

### 🚀 빠른 시작

#### 1. 개발 환경
```bash
# 개발 환경 시작 (핫 리로드 지원)
make dev

# 또는
docker-compose up --build
```

#### 2. 프로덕션 환경
```bash
# 프로덕션 환경 시작
make prod

# 또는
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

---

### 📁 Docker 파일 구조

```
langstar/
├── ui/
│   ├── Dockerfile          # 프론트엔드 Docker 이미지
│   ├── nginx.conf          # Nginx 설정
│   └── .dockerignore       # 프론트엔드 제외 파일
├── server/
│   ├── Dockerfile          # 백엔드 Docker 이미지
│   └── .dockerignore       # 백엔드 제외 파일
├── docker-compose.yml      # 기본 설정
├── docker-compose.override.yml  # 개발 환경 오버라이드
├── docker-compose.prod.yml # 프로덕션 환경
├── .dockerignore           # 루트 제외 파일
└── Makefile               # 편의 명령어
```

---

### 🛠️ 사용 가능한 명령어

#### Makefile 명령어
```bash
make help      # 도움말 표시
make dev       # 개발 환경 시작
make prod      # 프로덕션 환경 시작
make build     # 모든 이미지 빌드
make up        # 서비스 시작
make down      # 서비스 중지
make clean     # 정리
make logs      # 로그 표시
make frontend  # 프론트엔드만 실행
make backend   # 백엔드만 실행
make health    # 헬스 체크
```

#### Docker Compose 명령어
```bash
# 개발 환경
docker-compose up --build

# 프로덕션 환경
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# 서비스 중지
docker-compose down

# 로그 표시
docker-compose logs -f

# 특정 서비스만 실행
docker-compose up frontend
docker-compose up backend
```

---

### 🌐 접속 정보

#### 개발 환경
- **프론트엔드**: http://localhost:5173
- **백엔드**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

#### 프로덕션 환경
- **프론트엔드**: http://localhost:80 (또는 http://localhost)
- **백엔드**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs

---

### 🔧 환경 설정

#### 환경 변수
개발 환경에서는 `docker-compose.override.yml`이 자동으로 적용됩니다.

#### 볼륨 마운트
- **개발 환경**: 실시간 변경을 위해 소스 코드를 볼륨으로 마운트
- **프로덕션 환경**: 빌드된 파일만 포함

---

### 🐛 문제 해결

#### 포트 충돌
```bash
# 포트 사용 확인
lsof -i :5173
lsof -i :8000
lsof -i :80

# 포트 정리
make clean
```

#### 이미지 빌드 실패
```bash
# 캐시 없이 재빌드
docker-compose build --no-cache

# 정리 후 재빌드
make clean
make build
```

#### 로그 확인
```bash
# 모든 로그
docker-compose logs

# 특정 서비스 로그
docker-compose logs frontend
docker-compose logs backend

# 실시간 로그
docker-compose logs -f
```

#### 헬스 체크
```bash
# 서비스 상태 확인
make health

# 컨테이너 상태 확인
docker-compose ps
```

---

### 📦 이미지 정보

#### 프론트엔드 이미지
- **기본**: node:18-alpine
- **프로덕션**: nginx:alpine
- **포트**: 5173 (개발), 80 (프로덕션)

#### 백엔드 이미지
- **기본**: python:3.12-slim
- **포트**: 8000
- **헬스 체크**: /health 엔드포인트

---

### 🔒 보안 고려사항

#### 프로덕션 환경
- 비루트 사용자 실행
- 보안 헤더 설정
- HTTPS 권장
- 환경 변수 관리

#### 개발 환경
- 소스 코드 볼륨 마운트
- 핫 리로드 활성화
- 디버깅 도구 포함

---

### 📈 모니터링

#### 로그 모니터링
```bash
# 실시간 로그
docker-compose logs -f

# 특정 시간 이후 로그
docker-compose logs --since="2024-01-01T00:00:00"
```

#### 리소스 모니터링
```bash
# 컨테이너 리소스 사용량
docker stats

# 이미지 크기 확인
docker images
```

---

### 🚀 배포

#### 로컬 배포
```bash
make prod
```

#### 클라우드 배포
1. 이미지 태그 설정
2. 레지스트리에 푸시
3. 클라우드 환경에서 실행

```bash
# 이미지 태깅
docker tag langstar-frontend:latest your-registry/langstar-frontend:latest
docker tag langstar-backend:latest your-registry/langstar-backend:latest

# 레지스트리에 푸시
docker push your-registry/langstar-frontend:latest
docker push your-registry/langstar-backend:latest
```

---

### 🔄 멀티 스테이지 빌드

#### 개발 스테이지
- 모든 개발 의존성 포함
- 핫 리로드 지원
- 소스 코드 마운트
- 디버깅 도구

#### 프로덕션 스테이지
- 프로덕션 최적화
- 최소 이미지 크기
- 보안 강화
- 성능 최적화

---

### 📊 성능 최적화

#### 이미지 크기 최적화
- 멀티 스테이지 빌드
- Alpine Linux 기본 이미지
- 레이어 캐싱
- .dockerignore 파일

#### 메모리 사용량
- 개발: ~2-3GB RAM
- 프로덕션: ~1-2GB RAM
- 모델 캐시: ~200-500MB

---

### 🛡️ 모범 사례

#### 보안
- 비루트 사용자
- 최소 기본 이미지
- 보안 스캔
- 정기 업데이트

#### 성능
- 레이어 캐싱
- 멀티 스테이지 빌드
- 리소스 제한
- 헬스 체크

#### 개발
- 핫 리로드
- 볼륨 마운트
- 디버깅 지원
- 로깅

---

### 📝 환경 변수

#### 개발
```bash
NODE_ENV=development
PYTHONPATH=/app
ENVIRONMENT=development
```

#### 프로덕션
```bash
NODE_ENV=production
PYTHONPATH=/app
ENVIRONMENT=production
```

---

### 🔧 커스터마이징

#### 커스텀 포트
```yaml
# docker-compose.override.yml
services:
  frontend:
    ports:
      - "3000:5173"  # 커스텀 프론트엔드 포트
  backend:
    ports:
      - "9000:8000"  # 커스텀 백엔드 포트
```

#### 커스텀 네트워크
```yaml
# docker-compose.yml
networks:
  custom-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

#### 리소스 제한
```yaml
# docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
        reservations:
          memory: 1G
          cpus: '0.5'
```

---

### 🆘 지원

#### 일반적인 문제
- 포트 충돌: `make clean` 사용
- 빌드 실패: Dockerfile 구문 확인
- 메모리 문제: Docker 메모리 제한 증가
- 네트워크 문제: Docker 네트워크 설정 확인

#### 도움 받기
- 로그 확인: `make logs`
- 헬스 체크: `make health`
- 컨테이너 상태: `docker-compose ps`
- 시스템 리소스: `docker stats`

