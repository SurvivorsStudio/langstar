import json
import os
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from pathlib import Path
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
import logging

from server.models.schedule import (
    Schedule, ScheduleStatus, ScheduleType,
    CreateScheduleRequest, UpdateScheduleRequest
)

logger = logging.getLogger(__name__)

class ScheduleService:
    def __init__(self):
        self.schedules_dir = Path("schedules")
        self.schedules_dir.mkdir(exist_ok=True)
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()
        logger.info("APScheduler started")
        
    def _get_schedule_file_path(self, schedule_id: str) -> Path:
        """스케줄 파일 경로 반환"""
        return self.schedules_dir / f"{schedule_id}.json"
    
    def _save_schedule(self, schedule: Schedule) -> None:
        """스케줄을 파일에 저장"""
        file_path = self._get_schedule_file_path(schedule.id)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(schedule.dict(), f, indent=2, ensure_ascii=False)
    
    def _load_schedule(self, schedule_id: str) -> Optional[Schedule]:
        """파일에서 스케줄 로드"""
        file_path = self._get_schedule_file_path(schedule_id)
        if not file_path.exists():
            return None
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return Schedule(**data)
    
    def _delete_schedule_file(self, schedule_id: str) -> None:
        """스케줄 파일 삭제"""
        file_path = self._get_schedule_file_path(schedule_id)
        if file_path.exists():
            file_path.unlink()
    
    def _execute_scheduled_workflow(self, schedule_id: str, deployment_id: str, input_data: Dict[str, Any]) -> None:
        """스케줄된 워크플로우 실행"""
        try:
            logger.info(f"Executing scheduled workflow - Schedule: {schedule_id}, Deployment: {deployment_id}")
            
            # 실행 전 스케줄 정보 업데이트
            schedule = self._load_schedule(schedule_id)
            if schedule:
                # deployment_service를 통해 워크플로우 실행
                from server.services.deployment_service import deployment_service
                execution_result = deployment_service.run_deployment(
                    deployment_id=deployment_id,
                    input_data=input_data or {}
                )
                
                # 실행 결과에 따라 스케줄 업데이트
                schedule.lastRunTime = datetime.now().isoformat()
                schedule.lastRunStatus = "success" if execution_result.get("success") else "failed"
                schedule.executionCount += 1
                schedule.updatedAt = datetime.now().isoformat()
                
                # 다음 실행 시간 업데이트
                job = self.scheduler.get_job(schedule_id)
                if job and job.next_run_time:
                    schedule.nextRunTime = job.next_run_time.isoformat()
                else:
                    schedule.nextRunTime = None
                    schedule.status = ScheduleStatus.COMPLETED
                
                self._save_schedule(schedule)
                
                logger.info(f"Scheduled workflow executed successfully - Schedule: {schedule_id}")
            
        except Exception as e:
            logger.error(f"Error executing scheduled workflow {schedule_id}: {str(e)}", exc_info=True)
            # 실패 시에도 스케줄 정보 업데이트
            schedule = self._load_schedule(schedule_id)
            if schedule:
                schedule.lastRunTime = datetime.now().isoformat()
                schedule.lastRunStatus = "failed"
                schedule.executionCount += 1
                schedule.updatedAt = datetime.now().isoformat()
                self._save_schedule(schedule)
    
    def _create_trigger(self, schedule_type: ScheduleType, config: Dict[str, Any]):
        """스케줄 타입에 따른 트리거 생성"""
        if schedule_type == ScheduleType.CRON:
            # Cron 표현식 사용
            # config: {"minute": "*/5", "hour": "*", "day": "*", "month": "*", "day_of_week": "*"}
            return CronTrigger(**config)
        
        elif schedule_type == ScheduleType.INTERVAL:
            # 간격 설정
            # config: {"weeks": 0, "days": 0, "hours": 1, "minutes": 0, "seconds": 0}
            return IntervalTrigger(**config)
        
        elif schedule_type == ScheduleType.DATE:
            # 특정 날짜/시간
            # config: {"run_date": "2024-12-31 23:59:59"}
            run_date = datetime.fromisoformat(config["run_date"])
            return DateTrigger(run_date=run_date)
        
        else:
            raise ValueError(f"Unsupported schedule type: {schedule_type}")
    
    def create_schedule(self, request: CreateScheduleRequest, deployment_name: str) -> Schedule:
        """새 스케줄 생성"""
        try:
            schedule_id = str(uuid.uuid4())
            now = datetime.now().isoformat()
            
            # 트리거 생성
            trigger = self._create_trigger(request.scheduleType, request.scheduleConfig)
            
            # APScheduler에 작업 추가
            job = self.scheduler.add_job(
                func=self._execute_scheduled_workflow,
                trigger=trigger,
                id=schedule_id,
                args=[schedule_id, request.deploymentId, request.inputData],
                name=request.name,
                replace_existing=True
            )
            
            # 다음 실행 시간 가져오기
            next_run_time = job.next_run_time.isoformat() if job.next_run_time else None
            
            # 스케줄 객체 생성
            schedule = Schedule(
                id=schedule_id,
                name=request.name,
                description=request.description,
                deploymentId=request.deploymentId,
                deploymentName=deployment_name,
                scheduleType=request.scheduleType,
                scheduleConfig=request.scheduleConfig,
                inputData=request.inputData,
                status=ScheduleStatus.ACTIVE,
                nextRunTime=next_run_time,
                lastRunTime=None,
                lastRunStatus=None,
                executionCount=0,
                createdAt=now,
                updatedAt=now
            )
            
            # 파일에 저장
            self._save_schedule(schedule)
            
            logger.info(f"Schedule created: {schedule_id}")
            return schedule
            
        except Exception as e:
            logger.error(f"Error creating schedule: {str(e)}", exc_info=True)
            raise
    
    def get_schedule(self, schedule_id: str) -> Optional[Schedule]:
        """스케줄 조회"""
        schedule = self._load_schedule(schedule_id)
        if schedule:
            # 최신 다음 실행 시간 업데이트
            job = self.scheduler.get_job(schedule_id)
            if job and job.next_run_time:
                schedule.nextRunTime = job.next_run_time.isoformat()
            else:
                schedule.nextRunTime = None
        return schedule
    
    def get_all_schedules(self) -> List[Schedule]:
        """모든 스케줄 조회"""
        schedules = []
        for file_path in self.schedules_dir.glob("*.json"):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    schedule = Schedule(**data)
                    
                    # 최신 다음 실행 시간 업데이트
                    job = self.scheduler.get_job(schedule.id)
                    if job and job.next_run_time:
                        schedule.nextRunTime = job.next_run_time.isoformat()
                    else:
                        schedule.nextRunTime = None
                    
                    schedules.append(schedule)
            except Exception as e:
                logger.error(f"Error loading schedule from {file_path}: {str(e)}")
        
        # 생성일 기준 내림차순 정렬
        schedules.sort(key=lambda x: x.createdAt, reverse=True)
        return schedules
    
    def get_schedules_by_deployment(self, deployment_id: str) -> List[Schedule]:
        """특정 배포의 스케줄 목록 조회"""
        all_schedules = self.get_all_schedules()
        return [s for s in all_schedules if s.deploymentId == deployment_id]
    
    def update_schedule(self, schedule_id: str, request: UpdateScheduleRequest) -> Schedule:
        """스케줄 업데이트"""
        schedule = self._load_schedule(schedule_id)
        if not schedule:
            raise ValueError(f"Schedule not found: {schedule_id}")
        
        # 업데이트 가능한 필드만 변경
        if request.name is not None:
            schedule.name = request.name
        if request.description is not None:
            schedule.description = request.description
        if request.inputData is not None:
            schedule.inputData = request.inputData
        
        # 스케줄 설정이 변경된 경우 APScheduler 작업 재생성
        if request.scheduleConfig is not None:
            schedule.scheduleConfig = request.scheduleConfig
            
            # 기존 작업 제거
            self.scheduler.remove_job(schedule_id)
            
            # 새 트리거로 작업 재생성
            trigger = self._create_trigger(schedule.scheduleType, schedule.scheduleConfig)
            job = self.scheduler.add_job(
                func=self._execute_scheduled_workflow,
                trigger=trigger,
                id=schedule_id,
                args=[schedule_id, schedule.deploymentId, schedule.inputData],
                name=schedule.name,
                replace_existing=True
            )
            
            schedule.nextRunTime = job.next_run_time.isoformat() if job.next_run_time else None
        
        # 상태 변경
        if request.status is not None:
            old_status = schedule.status
            schedule.status = request.status
            
            if old_status != request.status:
                if request.status == ScheduleStatus.PAUSED:
                    # 일시 중지
                    self.scheduler.pause_job(schedule_id)
                    logger.info(f"Schedule paused: {schedule_id}")
                elif request.status == ScheduleStatus.ACTIVE:
                    # 재개
                    self.scheduler.resume_job(schedule_id)
                    job = self.scheduler.get_job(schedule_id)
                    schedule.nextRunTime = job.next_run_time.isoformat() if job and job.next_run_time else None
                    logger.info(f"Schedule resumed: {schedule_id}")
        
        schedule.updatedAt = datetime.now().isoformat()
        self._save_schedule(schedule)
        
        logger.info(f"Schedule updated: {schedule_id}")
        return schedule
    
    def delete_schedule(self, schedule_id: str) -> bool:
        """스케줄 삭제"""
        try:
            # APScheduler에서 작업 제거
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)
            
            # 파일 삭제
            self._delete_schedule_file(schedule_id)
            
            logger.info(f"Schedule deleted: {schedule_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting schedule {schedule_id}: {str(e)}", exc_info=True)
            return False
    
    def pause_schedule(self, schedule_id: str) -> Schedule:
        """스케줄 일시 중지"""
        return self.update_schedule(schedule_id, UpdateScheduleRequest(status=ScheduleStatus.PAUSED))
    
    def resume_schedule(self, schedule_id: str) -> Schedule:
        """스케줄 재개"""
        return self.update_schedule(schedule_id, UpdateScheduleRequest(status=ScheduleStatus.ACTIVE))
    
    def load_schedules_on_startup(self):
        """서버 시작 시 저장된 스케줄 로드"""
        try:
            schedules = self.get_all_schedules()
            for schedule in schedules:
                if schedule.status == ScheduleStatus.ACTIVE:
                    try:
                        # 트리거 재생성
                        trigger = self._create_trigger(schedule.scheduleType, schedule.scheduleConfig)
                        
                        # APScheduler에 작업 추가
                        self.scheduler.add_job(
                            func=self._execute_scheduled_workflow,
                            trigger=trigger,
                            id=schedule.id,
                            args=[schedule.id, schedule.deploymentId, schedule.inputData],
                            name=schedule.name,
                            replace_existing=True
                        )
                        
                        logger.info(f"Loaded schedule on startup: {schedule.id}")
                    except Exception as e:
                        logger.error(f"Error loading schedule {schedule.id}: {str(e)}")
            
            logger.info(f"Loaded {len(schedules)} schedules on startup")
            
        except Exception as e:
            logger.error(f"Error loading schedules on startup: {str(e)}", exc_info=True)
    
    def shutdown(self):
        """스케줄러 종료"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("APScheduler shut down")

# 전역 서비스 인스턴스
schedule_service = ScheduleService()

