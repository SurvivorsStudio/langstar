# LangStar Docker Makefile

.PHONY: help build dev prod up down clean logs frontend backend

# Default target
help:
	@echo "LangStar Docker Commands:"
	@echo "  make dev     - Start development environment"
	@echo "  make prod    - Start production environment"
	@echo "  make build   - Build all images"
	@echo "  make up      - Start services"
	@echo "  make down    - Stop services"
	@echo "  make clean   - Clean up containers and images"
	@echo "  make logs    - Show logs"
	@echo "  make frontend - Build and run frontend only"
	@echo "  make backend  - Build and run backend only"

# Development environment
dev:
	docker-compose up --build

# Production environment
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d

# Build all images
build:
	docker-compose build

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# Clean up
clean:
	docker-compose down -v --rmi all
	docker system prune -f

# Show logs
logs:
	docker-compose logs -f

# Frontend only
frontend:
	docker-compose up --build frontend

# Backend only
backend:
	docker-compose up --build backend

# Health check (cross-platform)
health:
	@echo "Checking frontend health..."
	@curl -f http://localhost/health 2>/dev/null || echo "Frontend is not healthy"
	@echo "Checking backend health..."
	@curl -f http://localhost:8000/health 2>/dev/null || echo "Backend is not healthy"

# Install dependencies (for local development)
install:
	@echo "Installing frontend dependencies..."
	cd ui && npm install
	@echo "Installing backend dependencies..."
	cd server && pip install -r requirements.txt 