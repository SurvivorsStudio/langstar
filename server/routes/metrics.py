"""
Metrics endpoint for Prometheus scraping.
"""

from fastapi import APIRouter, Response
from server.services.monitoring_service import monitoring_service

router = APIRouter()


@router.get("/metrics")
async def get_metrics():
    """
    Prometheus metrics endpoint.
    
    Returns:
        Metrics in Prometheus text format
    """
    metrics_text = monitoring_service.get_metrics_text()
    return Response(content=metrics_text, media_type="text/plain")
