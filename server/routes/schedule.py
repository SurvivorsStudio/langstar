from fastapi import APIRouter, HTTPException, Body
from typing import List
import logging

from server.models.schedule import (
    Schedule, CreateScheduleRequest, UpdateScheduleRequest,
    ScheduleResponse, SchedulesListResponse
)
from server.services.schedule_service import schedule_service
from server.services.deployment_service import deployment_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/schedules', response_model=ScheduleResponse)
def create_schedule(request: CreateScheduleRequest):
    """새 스케줄 생성"""
    try:
        logger.info(f"Creating schedule for deployment: {request.deploymentId}")
        
        # 배포 존재 여부 확인
        deployment = deployment_service.get_deployment_by_id(request.deploymentId)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment not found: {request.deploymentId}")
        
        # 배포가 활성 상태인지 확인
        if deployment.status != "active":
            raise HTTPException(
                status_code=400, 
                detail=f"Deployment must be active to create a schedule. Current status: {deployment.status}"
            )
        
        # 스케줄 생성
        schedule = schedule_service.create_schedule(request, deployment.name)
        
        logger.info(f"Schedule created successfully: {schedule.id}")
        return ScheduleResponse(
            success=True,
            schedule=schedule,
            message="Schedule created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating schedule: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/schedules', response_model=SchedulesListResponse)
def get_all_schedules():
    """모든 스케줄 목록 조회"""
    try:
        logger.info("Fetching all schedules")
        schedules = schedule_service.get_all_schedules()
        
        return SchedulesListResponse(
            success=True,
            schedules=schedules,
            message=f"Found {len(schedules)} schedules"
        )
        
    except Exception as e:
        logger.error(f"Error fetching schedules: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/schedules/{schedule_id}', response_model=ScheduleResponse)
def get_schedule(schedule_id: str):
    """특정 스케줄 조회"""
    try:
        logger.info(f"Fetching schedule: {schedule_id}")
        schedule = schedule_service.get_schedule(schedule_id)
        
        if not schedule:
            raise HTTPException(status_code=404, detail=f"Schedule not found: {schedule_id}")
        
        return ScheduleResponse(
            success=True,
            schedule=schedule,
            message="Schedule retrieved successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get('/deployments/{deployment_id}/schedules', response_model=SchedulesListResponse)
def get_deployment_schedules(deployment_id: str):
    """특정 배포의 스케줄 목록 조회"""
    try:
        logger.info(f"Fetching schedules for deployment: {deployment_id}")
        
        # 배포 존재 여부 확인
        deployment = deployment_service.get_deployment_by_id(deployment_id)
        if not deployment:
            raise HTTPException(status_code=404, detail=f"Deployment not found: {deployment_id}")
        
        schedules = schedule_service.get_schedules_by_deployment(deployment_id)
        
        return SchedulesListResponse(
            success=True,
            schedules=schedules,
            message=f"Found {len(schedules)} schedules for deployment"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deployment schedules: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.put('/schedules/{schedule_id}', response_model=ScheduleResponse)
def update_schedule(schedule_id: str, request: UpdateScheduleRequest):
    """스케줄 업데이트"""
    try:
        logger.info(f"Updating schedule: {schedule_id}")
        
        schedule = schedule_service.update_schedule(schedule_id, request)
        
        return ScheduleResponse(
            success=True,
            schedule=schedule,
            message="Schedule updated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete('/schedules/{schedule_id}')
def delete_schedule(schedule_id: str):
    """스케줄 삭제"""
    try:
        logger.info(f"Deleting schedule: {schedule_id}")
        
        success = schedule_service.delete_schedule(schedule_id)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"Schedule not found: {schedule_id}")
        
        return {
            "success": True,
            "message": "Schedule deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/schedules/{schedule_id}/pause', response_model=ScheduleResponse)
def pause_schedule(schedule_id: str):
    """스케줄 일시 중지"""
    try:
        logger.info(f"Pausing schedule: {schedule_id}")
        
        schedule = schedule_service.pause_schedule(schedule_id)
        
        return ScheduleResponse(
            success=True,
            schedule=schedule,
            message="Schedule paused successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error pausing schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post('/schedules/{schedule_id}/resume', response_model=ScheduleResponse)
def resume_schedule(schedule_id: str):
    """스케줄 재개"""
    try:
        logger.info(f"Resuming schedule: {schedule_id}")
        
        schedule = schedule_service.resume_schedule(schedule_id)
        
        return ScheduleResponse(
            success=True,
            schedule=schedule,
            message="Schedule resumed successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error resuming schedule {schedule_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


