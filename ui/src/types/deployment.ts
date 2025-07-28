import { Workflow } from '../store/flowStore';

// 배포 상태 enum
export enum DeploymentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  DEPLOYING = 'deploying'
}

// 배포 환경 enum
export enum DeploymentEnvironment {
  DEV = 'dev',
  STAGING = 'staging',
  PROD = 'prod'
}

// 배포 정보 인터페이스
export interface Deployment {
  id: string;                    // 고유 배포 ID
  name: string;                  // 배포 이름 (사용자 정의)
  version: string;               // 버전 (예: "1.0.0", "2.1.3")
  description?: string;          // 배포 설명
  workflowId: string;            // 연결된 워크플로우 ID
  workflowName: string;          // 워크플로우 이름 (참조용)
  status: DeploymentStatus;      // 배포 상태
  environment: DeploymentEnvironment; // 배포 환경
  createdAt: string;             // 생성일 (ISO string)
  updatedAt: string;             // 수정일 (ISO string)
  deployedAt?: string;           // 실제 배포일 (ISO string)
  deploymentUrl?: string;        // 배포된 서비스 URL
  config?: {                     // 배포별 설정
    resources?: {
      cpu?: string;
      memory?: string;
      replicas?: number;
    };
    environment?: Record<string, string>; // 환경 변수
    [key: string]: any;
  };
  versions?: DeploymentVersion[]; // 배포 버전 목록
}

// 배포 버전 정보 인터페이스
export interface DeploymentVersion {
  id: string;                    // 버전 고유 ID
  deploymentId: string;          // 배포 ID
  version: string;               // 버전 문자열
  workflowSnapshot: Workflow;    // 해당 시점의 워크플로우 스냅샷
  changelog?: string;            // 변경사항 설명
  createdAt: string;             // 버전 생성일 (ISO string)
  isActive: boolean;             // 현재 활성 버전 여부
  deployedAt?: string;           // 배포일 (ISO string)
}

// 배포 생성 시 필요한 폼 데이터
export interface DeploymentFormData {
  name: string;                  // 배포 이름
  version: string;               // 버전
  description?: string;          // 설명
  environment: DeploymentEnvironment; // 환경
  config?: {                     // 추가 설정
    resources?: {
      cpu?: string;
      memory?: string;
      replicas?: number;
    };
    environment?: Record<string, string>;
  };
}

// 배포 생성 요청 데이터
export interface CreateDeploymentRequest {
  workflowData: Workflow;        // 워크플로우 데이터
  deployment: DeploymentFormData; // 배포 정보
}

// 배포 생성 응답 데이터
export interface CreateDeploymentResponse {
  success: boolean;
  deploymentId?: string;
  deploymentUrl?: string;
  status: DeploymentStatus;
  message: string;
  logs?: string[];
  error?: string;
}

// 배포 목록 조회 응답
export interface DeploymentsResponse {
  deployments: Deployment[];
  total: number;
  page: number;
  limit: number;
}

// 배포 상태 업데이트 요청
export interface UpdateDeploymentStatusRequest {
  status: DeploymentStatus;
  reason?: string;
}

// 배포 버전 롤백 요청
export interface RollbackDeploymentRequest {
  version: string;
  reason?: string;
} 