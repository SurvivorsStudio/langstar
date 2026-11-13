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
import time

from server.models.schedule import (
    Schedule, ScheduleStatus, ScheduleType, ScheduleTargetType,
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
    
    def _run_schedule(self, schedule_id: str) -> None:
        """APScheduler 작업 진입점: 스케줄 대상(배포/챗플로우)에 맞게 실행"""
        schedule = self._load_schedule(schedule_id)
        if not schedule:
            logger.warning(f"Scheduled job fired but schedule not found: {schedule_id}")
            return
        if schedule.targetType == ScheduleTargetType.WORKFLOW:
            self._execute_scheduled_chatflow(schedule)
        else:
            self._execute_scheduled_workflow(schedule_id, schedule.deploymentId, schedule.inputData)

    def _add_job(self, schedule: Schedule):
        """스케줄을 APScheduler 작업으로 등록"""
        trigger = self._create_trigger(schedule.scheduleType, schedule.scheduleConfig)
        return self.scheduler.add_job(
            func=self._run_schedule,
            trigger=trigger,
            id=schedule.id,
            args=[schedule.id],
            name=schedule.name,
            replace_existing=True,
            max_instances=1,  # 이전 실행이 끝나지 않았으면 이번 실행은 건너뜀
        )

    def _record_run_result(self, schedule_id: str, status: str, run_id: Optional[str] = None) -> None:
        """실행 결과를 스케줄에 기록 (다음 실행 시간 포함)"""
        schedule = self._load_schedule(schedule_id)
        if not schedule:
            return
        schedule.lastRunStatus = status
        if run_id:
            schedule.lastRunId = run_id
        schedule.updatedAt = datetime.now().isoformat()
        job = self.scheduler.get_job(schedule_id)
        if job and job.next_run_time:
            schedule.nextRunTime = job.next_run_time.isoformat()
        elif schedule.status == ScheduleStatus.ACTIVE and status != "running":
            schedule.nextRunTime = None
            schedule.status = ScheduleStatus.COMPLETED
        self._save_schedule(schedule)

    def _execute_scheduled_chatflow(self, schedule: Schedule) -> None:
        """배포 없이 저장된 챗플로우를 서버 Run 으로 실행하고 끝날 때까지 기다림"""
        from server.services.storage_service import storage_service
        from server.services.workflow_run_service import workflow_run_service, TERMINAL_STATUSES

        name = schedule.workflowName
        logger.info(f"Executing scheduled chatflow - Schedule: {schedule.id}, Workflow: {name}")
        schedule.lastRunTime = datetime.now().isoformat()
        schedule.executionCount += 1
        self._save_schedule(schedule)

        try:
            workflow = storage_service.get_workflow_by_name(name) if name else None
            if not workflow:
                raise ValueError(f"Workflow not found: {name}")
            run = workflow_run_service.start_run(
                name, workflow.get("nodes") or [], workflow.get("edges") or [],
                triggered_by={"type": "schedule", "schedule_id": schedule.id, "schedule_name": schedule.name},
            )
        except RuntimeError as e:
            # 같은 챗플로우가 이미 실행 중 (사용자가 직접 Run 했거나 이전 스케줄 실행)
            logger.warning(f"Scheduled chatflow skipped - {name}: {e}")
            self._record_run_result(schedule.id, "skipped")
            return
        except Exception as e:
            logger.error(f"Error starting scheduled chatflow {schedule.id}: {e}", exc_info=True)
            self._record_run_result(schedule.id, "failed")
            return

        self._record_run_result(schedule.id, "running", run["id"])
        status = "failed"
        while True:
            record = workflow_run_service.get_run(run["id"])
            if not record:
                break
            if record["status"] in TERMINAL_STATUSES:
                status = "success" if record["status"] == "succeeded" else record["status"]
                break
            time.sleep(5)
        self._record_run_result(schedule.id, status, run["id"])
        logger.info(f"Scheduled chatflow finished - Schedule: {schedule.id}, Run: {run['id']}, Status: {status}")

    def rename_workflow(self, old_name: str, new_name: str) -> None:
        """챗플로우 이름 변경 시 해당 챗플로우를 실행하는 스케줄도 함께 변경"""
        for schedule in self.get_all_schedules():
            if schedule.targetType == ScheduleTargetType.WORKFLOW and schedule.workflowName == old_name:
                schedule.workflowName = new_name
                schedule.updatedAt = datetime.now().isoformat()
                self._save_schedule(schedule)

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
    
    def create_schedule(self, request: CreateScheduleRequest, deployment_name: str = "") -> Schedule:
        """새 스케줄 생성 (배포 또는 챗플로우 대상)"""
        try:
            schedule_id = str(uuid.uuid4())
            now = datetime.now().isoformat()

            # 스케줄 객체 생성
            schedule = Schedule(
                id=schedule_id,
                name=request.name,
                description=request.description,
                targetType=request.targetType,
                deploymentId=request.deploymentId or "",
                deploymentName=deployment_name,
                workflowName=request.workflowName,
                scheduleType=request.scheduleType,
                scheduleConfig=request.scheduleConfig,
                inputData=request.inputData,
                status=ScheduleStatus.ACTIVE,
                nextRunTime=None,
                lastRunTime=None,
                lastRunStatus=None,
                executionCount=0,
                createdAt=now,
                updatedAt=now
            )
            
            # 작업이 실행될 때 스케줄 파일을 읽으므로 먼저 저장한 뒤 APScheduler 에 등록
            self._save_schedule(schedule)
            job = self._add_job(schedule)
            schedule.nextRunTime = job.next_run_time.isoformat() if job.next_run_time else None
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
            if self.scheduler.get_job(schedule_id):
                self.scheduler.remove_job(schedule_id)

            # 새 트리거로 작업 재생성
            job = self._add_job(schedule)
                        
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
                        # APScheduler에 작업 추가
                        self._add_job(schedule)
                                                
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

