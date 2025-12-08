export enum ScheduleStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
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
  deploymentId: string;
  deploymentName: string;
  scheduleType: ScheduleType;
  scheduleConfig: ScheduleConfig;
  inputData?: Record<string, any>;
  status: ScheduleStatus;
  nextRunTime?: string;
  lastRunTime?: string;
  lastRunStatus?: string;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateScheduleRequest {
  name: string;
  description?: string;
  deploymentId: string;
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




