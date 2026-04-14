# Store Architecture

이 문서는 LangStar UI의 상태 관리 아키텍처를 설명합니다.

## 개요

LangStar는 Zustand를 사용하여 상태를 관리합니다. 원래 모든 상태가 `flowStore.ts` 하나에 집중되어 있었으나 (2,744줄), 유지보수성과 확장성을 위해 여러 개의 전문화된 스토어로 분리되었습니다.

## 리팩토링 결과

- **원본**: `flowStore.ts` (2,744줄)
- **현재**: `flowStore.ts` (1,183줄) + 4개의 전문 스토어
- **감소율**: 57% 감소
- **생성된 파일**: 28개 (타입, 유틸리티, 서비스, 실행자, 스토어)

## 스토어 구조

### 1. flowStore.ts (1,183줄)
**책임**: 워크플로우 캔버스의 핵심 상태 관리

**주요 기능**:
- 노드 및 엣지 관리 (추가, 수정, 삭제)
- 워크플로우 실행 (개별 노드 및 전체 워크플로우)
- 캔버스 상태 (viewport, 선택, 포커스)
- 워크플로우 저장/로드
- 엣지 검증 및 연결 규칙

**상태**:
```typescript
{
  nodes: Node<NodeData>[]
  edges: Edge[]
  projectName: string
  viewport: Viewport
  isWorkflowRunning: boolean
  selectedNode: string | null
  focusedElement: { type, id }
  manuallySelectedEdges: Record<string, string | null>
  // ... 저장/로드 관련 상태
}
```

**주요 함수**:
- `addNode`, `updateNodeData`, `removeNode`
- `executeNode`, `runWorkflow`
- `saveWorkflow`, `loadWorkflow`
- `canConnect`, `findViolatingEdges`

### 2. aiConnectionStore.ts (127줄)
**책임**: AI 모델 연결 관리

**주요 기능**:
- AI 연결 CRUD (생성, 조회, 수정, 삭제)
- AWS Bedrock, OpenAI, Google, Anthropic 지원
- 연결 상태 관리

**상태**:
```typescript
{
  aiConnections: AIConnection[]
  isLoadingAIConnections: boolean
  loadErrorAIConnections: string | null
}
```

**사용 컴포넌트**:
- `WorkspacePage.tsx`
- `AgentSettings.tsx`

### 3. userNodeStore.ts (약 200줄)
**책임**: 사용자 정의 노드 관리

**주요 기능**:
- 사용자 노드 CRUD
- 노드 Import/Export
- 사용자 정의 Python 코드 블록 관리

**상태**:
```typescript
{
  userNodes: UserNode[]
  isLoadingUserNodes: boolean
  loadErrorUserNodes: string | null
}
```

**사용 컴포넌트**:
- `NodeSidebar.tsx`
- `NodeCreation.tsx`
- `NodeDetail.tsx`
- `NodeManagement.tsx`

### 4. workflowStorageStore.ts (약 90줄)
**책임**: 워크플로우 목록 및 저장소 관리

**주요 기능**:
- 워크플로우 목록 조회
- 워크플로우 삭제
- 워크플로우 이름 변경

**상태**:
```typescript
{
  availableWorkflows: Workflow[]
  isLoading: boolean
  loadError: string | null
}
```

**참고**: `saveWorkflow`와 `loadWorkflow`는 노드/엣지 상태에 직접 접근해야 하므로 `flowStore`에 유지됩니다.

**사용 컴포넌트**:
- `WorkspacePage.tsx`
- `Header.tsx`

### 5. deploymentZustandStore.ts (280줄)
**책임**: 배포 관리

**주요 기능**:
- 배포 CRUD
- 배포 활성화/비활성화
- 배포 버전 관리
- 배포 롤백

**상태**:
```typescript
{
  deployments: Deployment[]
  activeDeployment: Deployment | null
  deploymentVersions: DeploymentVersion[]
  isLoadingDeployments: boolean
  loadErrorDeployments: string | null
}
```

**사용 컴포넌트**:
- `WorkspacePage.tsx`
- `ScheduleModal.tsx`

**참고**: 기존 `deploymentStore.ts` (클래스 기반, storageService 사용)와는 별도로 존재합니다.

## 지원 서비스 및 유틸리티

### 타입 정의 (`types/`)
- `node.ts`: NodeData, NodeConfig 인터페이스
- `edge.ts`: EdgeData, EDGE_STATES
- `workflow.ts`: Workflow 인터페이스
- `aiConnection.ts`: AIConnection 인터페이스
- `userNode.ts`: UserNode 인터페이스

### 유틸리티 함수 (`utils/`)
- `nodeUtils.ts`: 노드 관련 유틸리티
- `edgeUtils.ts`: 엣지 관련 유틸리티
- `edgeValidation.ts`: 엣지 검증 로직
- `dataTransform.ts`: 데이터 변환 유틸리티

### 노드 API 서비스 (`services/nodeApi/`)
각 노드 타입별 API 통신 함수:
- `startNodeApi.ts`
- `promptNodeApi.ts`
- `agentNodeApi.ts`
- `functionNodeApi.ts`
- `conditionNodeApi.ts`
- `mergeNodeApi.ts`
- `userNodeApi.ts`

### 노드 실행자 (`services/execution/nodeExecutors/`)
각 노드 타입별 실행 로직:
- `startNodeExecutor.ts`
- `promptNodeExecutor.ts`
- `agentNodeExecutor.ts`
- `functionNodeExecutor.ts`
- `conditionNodeExecutor.ts`
- `mergeNodeExecutor.ts`
- `loopNodeExecutor.ts`
- `userNodeExecutor.ts`
- `endNodeExecutor.ts`

### 실행 엔진 (`services/execution/`)
- `executionEngine.ts` (450줄): 워크플로우 실행 오케스트레이션
  - 단일 노드 실행
  - 전체 워크플로우 실행
  - 순환 구조 처리
  - 병렬 실행
  - Merge 노드 대기 로직

## 데이터 흐름

### 워크플로우 실행
```
사용자 액션
  ↓
flowStore.executeNode() / runWorkflow()
  ↓
executionEngine.executeNode() / runWorkflow()
  ↓
nodeExecutors[nodeType].execute()
  ↓
nodeApi[nodeType].execute()
  ↓
Backend API
  ↓
콜백을 통한 상태 업데이트
  ↓
UI 반영
```

### 워크플로우 저장/로드
```
사용자 액션
  ↓
flowStore.saveWorkflow() / loadWorkflow()
  ↓
storageService (MongoDB)
  ↓
상태 업데이트
  ↓
UI 반영
```

### AI 연결 관리
```
사용자 액션
  ↓
aiConnectionStore.addAIConnection() / updateAIConnection()
  ↓
storageService (MongoDB)
  ↓
상태 업데이트
  ↓
UI 반영
```

## 설계 원칙

### 1. 단일 책임 원칙 (Single Responsibility)
각 스토어는 하나의 명확한 책임을 가집니다:
- `flowStore`: 워크플로우 캔버스
- `aiConnectionStore`: AI 연결
- `userNodeStore`: 사용자 노드
- `workflowStorageStore`: 워크플로우 저장소
- `deploymentZustandStore`: 배포

### 2. 관심사의 분리 (Separation of Concerns)
- **스토어**: 상태 관리
- **서비스**: 비즈니스 로직 및 API 통신
- **유틸리티**: 재사용 가능한 헬퍼 함수
- **실행자**: 노드별 실행 로직

### 3. 의존성 역전 (Dependency Inversion)
- 실행 엔진은 콜백 인터페이스를 통해 스토어와 통신
- 노드 실행자는 인터페이스를 구현하여 레지스트리에 등록

### 4. 개방-폐쇄 원칙 (Open-Closed)
- 새로운 노드 타입 추가 시 기존 코드 수정 불필요
- 노드 실행자 레지스트리에 등록만 하면 됨

## 확장 가이드

### 새로운 노드 타입 추가

1. **타입 정의** (`types/node.ts`)
```typescript
export interface MyNodeConfig {
  myProperty: string;
}
```

2. **노드 API 생성** (`services/nodeApi/myNodeApi.ts`)
```typescript
export async function executeMyNode(
  nodeId: string,
  nodeData: NodeData,
  inputData: any
): Promise<any> {
  // API 호출 로직
}
```

3. **노드 실행자 생성** (`services/execution/nodeExecutors/myNodeExecutor.ts`)
```typescript
export class MyNodeExecutor implements NodeExecutor {
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    // 실행 로직
  }
}
```

4. **레지스트리에 등록** (`services/execution/nodeExecutors/index.ts`)
```typescript
registerNodeExecutor('myNode', new MyNodeExecutor());
```

### 새로운 스토어 추가

1. **스토어 파일 생성** (`store/myStore.ts`)
```typescript
import { create } from 'zustand';

interface MyState {
  data: any[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
}

export const useMyStore = create<MyState>((set, get) => ({
  data: [],
  isLoading: false,
  fetchData: async () => {
    set({ isLoading: true });
    // 로직
    set({ isLoading: false });
  },
}));
```

2. **컴포넌트에서 사용**
```typescript
import { useMyStore } from '../store/myStore';

const MyComponent = () => {
  const { data, fetchData } = useMyStore();
  // ...
};
```

## 성능 최적화

### 1. 선택적 구독
Zustand의 선택자를 사용하여 필요한 상태만 구독:
```typescript
const projectName = useFlowStore(state => state.projectName);
```

### 2. 메모이제이션
복잡한 계산은 useMemo로 메모이제이션:
```typescript
const violatingEdges = useMemo(
  () => findViolatingEdges(nodes, edges),
  [nodes, edges]
);
```

### 3. 배치 업데이트
여러 상태 변경을 하나의 set 호출로 묶기:
```typescript
set({
  nodes: updatedNodes,
  edges: updatedEdges,
  isLoading: false
});
```

## 테스트 전략

### 단위 테스트
- 유틸리티 함수 테스트
- 노드 실행자 테스트
- API 서비스 테스트

### 통합 테스트
- 워크플로우 실행 테스트
- 스토어 상호작용 테스트

### E2E 테스트
- 전체 워크플로우 시나리오 테스트

## 마이그레이션 가이드

기존 코드에서 새로운 아키텍처로 마이그레이션:

### Before (기존)
```typescript
const { 
  aiConnections, 
  fetchAIConnections 
} = useFlowStore();
```

### After (새로운)
```typescript
const { 
  aiConnections, 
  fetchAIConnections 
} = useAIConnectionStore();
```

## 참고 자료

- [Zustand 공식 문서](https://github.com/pmndrs/zustand)
- [React 상태 관리 패턴](https://react.dev/learn/managing-state)
- [클린 아키텍처](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

## 변경 이력

- **2024-12-10**: 배포 스토어 분리 (Task 10)
- **2024-12-10**: 워크플로우 저장소 스토어 분리 (Task 9)
- **2024-12-10**: 사용자 노드 스토어 분리 (Task 8)
- **2024-12-09**: AI 연결 스토어 분리 (Task 7)
- **2024-12-09**: 실행 엔진 및 노드 실행자 추출 (Tasks 4-6)
- **2024-12-09**: 노드 API 서비스 분리 (Task 3)
- **2024-12-09**: 유틸리티 함수 추출 (Task 2)
- **2024-12-09**: 타입 정의 분리 (Task 1)
