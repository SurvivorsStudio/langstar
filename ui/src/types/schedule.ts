export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export enum ScheduleTargetType {
  /** 배포된 워크플로우 실행 */
  DEPLOYMENT = 'deployment',
  /** 배포 없이 저장된 챗플로우를 서버 Run 으로 실행 */
  WORKFLOW = 'workflow',
}

export enum ScheduleType {
  CRON = 'cron',
  INTERVAL = 'interval',
  DATE = 'date',
}

export interface ScheduleConfig {
  // For CRON type
  minute?: string;
  hour?: string;
  day?: string;
  month?: string;
  day_of_week?: string;
  
  // For INTERVAL type
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  
  // For DATE type
  run_date?: string;
}

export interface Schedule {
  id: string;
  name: string;
  description?: string;
  targetType?: ScheduleTargetType;
  deploymentId: string;
  deploymentName: string;
  /** targetType 이 workflow 일 때 실행할 챗플로우 이름 */
  workflowName?: string;
  scheduleType: ScheduleType;
  scheduleConfig: ScheduleConfig;
  inputData?: Record<string, any>;
  status: ScheduleStatus;
  nextRunTime?: string;
  lastRunTime?: string;
  lastRunStatus?: string;
  /** 챗플로우 스케줄의 마지막 Run ID (실행 이력에서 조회) */
  lastRunId?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateScheduleRequest {
  name: string;
  description?: string;
  targetType?: ScheduleTargetType;
  deploymentId?: string;
  workflowName?: string;
  scheduleType: ScheduleType;
  scheduleConfig: ScheduleConfig;
  inputData?: Record<string, any>;
}

export interface UpdateScheduleRequest {
  name?: string;
  description?: string;
  scheduleConfig?: ScheduleConfig;
  inputData?: Record<string, any>;
  status?: ScheduleStatus;
}

export interface ScheduleResponse {
  success: boolean;
  schedule: Schedule;
  message: string;
}

export interface SchedulesListResponse {
  success: boolean;
  schedules: Schedule[];
  message: string;
}




