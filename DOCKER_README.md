# 🐳 LangStar Docker Guide

This guide explains how to run the LangStar project in a Docker environment.

## 📋 Prerequisites

- Docker Desktop installed
- Docker Compose installed
- Minimum 4GB RAM recommended

## 🖥️ Windows Support

### Recommended Methods

#### **1. WSL (Windows Subsystem for Linux) - Best Option**
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

#### **2. Git Bash - Simple Alternative**
```bash
# Install Git for Windows (includes Git Bash)
# Download from: https://git-scm.com/download/win

# Open Git Bash and navigate to project
cd /c/path/to/langstar

# Use original Makefile commands
make dev
make prod
```

#### **3. Docker Desktop Terminal**
```bash
# Open Docker Desktop
# Use the built-in terminal

# Navigate to project directory
cd C:\path\to\langstar

# Use original Makefile commands
make dev
make prod
```

### Alternative: Batch File (Windows Native)
If you prefer Windows native commands, use the provided batch file:

```cmd
# Command Prompt or PowerShell
docker-commands.bat dev
docker-commands.bat prod
docker-commands.bat help
```

### Windows Compatibility Notes
- **Original Makefile**: Works perfectly with WSL, Git Bash, Docker Terminal
- **Docker Commands**: Cross-platform compatible
- **Health Check**: Uses PowerShell commands for Windows compatibility
- **Path Separators**: Docker handles path conversion automatically

## 🚀 Quick Start

### 1. Development Environment
```bash
# Start development environment (with hot reload support)
make dev

# Or
docker-compose up --build
```

### 2. Production Environment
```bash
# Start production environment
make prod

# Or
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## 📁 Docker File Structure

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

## 🛠️ Available Commands

### Makefile Commands
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

### Docker Compose Commands
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

## 🌐 Access Information

### Development Environment
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Production Environment
- **Frontend**: http://localhost:80 (or http://localhost)
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Environment Configuration

### Environment Variables
In development environment, `docker-compose.override.yml` is automatically applied.

### Volume Mounts
- **Development Environment**: Source code is mounted as volumes for real-time changes
- **Production Environment**: Only built files are included

## 🐛 Troubleshooting

### Port Conflicts
```bash
# Check port usage
lsof -i :5173
lsof -i :8000
lsof -i :80

# Clean up ports
make clean
```

### Image Build Failures
```bash
# Rebuild without cache
docker-compose build --no-cache

# Clean and rebuild
make clean
make build
```

### Log Checking
```bash
# All logs
docker-compose logs

# Specific service logs
docker-compose logs frontend
docker-compose logs backend

# Real-time logs
docker-compose logs -f
```

### Health Check
```bash
# Check service status
make health

# Check container status
docker-compose ps
```

## 📦 Image Information

### Frontend Image
- **Base**: node:18-alpine
- **Production**: nginx:alpine
- **Ports**: 5173 (development), 80 (production)

### Backend Image
- **Base**: python:3.12-slim
- **Port**: 8000
- **Health Check**: /health endpoint

## 🔒 Security Considerations

### Production Environment
- Non-root user execution
- Security headers configuration
- HTTPS recommended
- Environment variable management

### Development Environment
- Source code volume mounting
- Hot reload enabled
- Debugging tools included

## 📈 Monitoring

### Log Monitoring
```bash
# Real-time logs
docker-compose logs -f

# Logs since specific time
docker-compose logs --since="2024-01-01T00:00:00"
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Image size check
docker images
```

## 🚀 Deployment

### Local Deployment
```bash
make prod
```

### Cloud Deployment
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

## 🔄 Multi-Stage Build

### Development Stage
- Includes all development dependencies
- Hot reload support
- Source code mounting
- Debugging tools

### Production Stage
- Optimized for production
- Minimal image size
- Security hardened
- Performance optimized

## 📊 Performance Optimization

### Image Size Optimization
- Multi-stage builds
- Alpine Linux base images
- Layer caching
- .dockerignore files

### Memory Usage
- Development: ~2-3GB RAM
- Production: ~1-2GB RAM
- Model cache: ~200-500MB

## 🛡️ Best Practices

### Security
- Non-root users
- Minimal base images
- Security scanning
- Regular updates

### Performance
- Layer caching
- Multi-stage builds
- Resource limits
- Health checks

### Development
- Hot reload
- Volume mounting
- Debugging support
- Logging

## 📝 Environment Variables

### Development
```bash
NODE_ENV=development
PYTHONPATH=/app
ENVIRONMENT=development
```

### Production
```bash
NODE_ENV=production
PYTHONPATH=/app
ENVIRONMENT=production
```

## 🔧 Customization

### Custom Ports
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

### Custom Networks
```yaml
# docker-compose.yml
networks:
  custom-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Resource Limits
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

## 🆘 Support

### Common Issues
- Port conflicts: Use `make clean`
- Build failures: Check Dockerfile syntax
- Memory issues: Increase Docker memory limit
- Network issues: Check Docker network configuration

### Getting Help
- Check logs: `make logs`
- Health check: `make health`
- Container status: `docker-compose ps`
- System resources: `docker stats` 