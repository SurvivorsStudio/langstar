/**
 * 워크플로우 서버 실행(Run) API
 *
 * Run 버튼으로 시작한 워크플로우는 서버 백그라운드에서 실행됩니다.
 * 브라우저를 닫거나 다른 페이지로 이동해도 실행은 계속되며,
 * 실행 상태와 이력은 이 API로 조회/중지할 수 있습니다.
 */

const API_BASE_URL = 'http://localhost:8000/api';

export type WorkflowRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export type NodeRunStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'waiting' | 'cancelled';

export interface WorkflowRunSummary {
  id: string;
  workflow_name: string;
  status: WorkflowRunStatus;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  error: string | null;
  error_nodes: string[];
  cancel_requested: boolean;
  /** 이어서 실행한 경우 원본 Run ID */
  resumed_from?: string | null;
  reused_node_count?: number;
  node_count: number;
  completed_node_count: number;
  running_nodes: string[];
}

export interface NodeRunState {
  label: string;
  type: string;
  status: NodeRunStatus;
  is_executing: boolean;
  exec_count: number;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number | null;
  input: unknown;
  output: unknown;
  error: string | null;
  /** 이전 실행 결과를 재사용한 노드 */
  reused?: boolean;
}

export interface EdgeRunState {
  output: unknown;
  timestamp: number;
  status: 'idle' | 'executing' | 'success' | 'failure';
}

export interface WorkflowRunEvent {
  ts: string;
  type: string;
  node_id?: string;
  node_label?: string;
  message?: string;
}

export interface WorkflowRun extends Omit<WorkflowRunSummary, 'node_count' | 'completed_node_count' | 'running_nodes' | 'reused_node_count'> {
  chat_id: string | null;
  updated_at: string;
  error_details: string | null;
  final_output: unknown;
  version: number;
  node_states: Record<string, NodeRunState>;
  edge_states: Record<string, EdgeRunState>;
  events: WorkflowRunEvent[];
  /** 실행 당시 워크플로우 그래프 (읽기 전용 뷰어에서 사용) */
  snapshot?: { nodes: unknown[]; edges: unknown[] };
}

export const isTerminalRunStatus = (status: WorkflowRunStatus) =>
  status === 'succeeded' || status === 'failed' || status === 'cancelled';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return response.json();
};

export const startWorkflowRun = async (payload: {
  workflow_name: string;
  nodes: unknown[];
  edges: unknown[];
  chat_id?: string;
  resume_from?: string;
}): Promise<WorkflowRunSummary> => {
  const result = await request<{ run: WorkflowRunSummary }>('/workflow-runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return result.run;
};

export const getWorkflowRun = async (runId: string): Promise<WorkflowRun> => {
  const result = await request<{ run: WorkflowRun }>(`/workflow-runs/${encodeURIComponent(runId)}`);
  return result.run;
};

export const listWorkflowRuns = async (params: {
  workflowName?: string;
  status?: WorkflowRunStatus;
  limit?: number;
} = {}): Promise<WorkflowRunSummary[]> => {
  const query = new URLSearchParams();
  if (params.workflowName) query.set('workflow_name', params.workflowName);
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  const result = await request<{ runs: WorkflowRunSummary[] }>(`/workflow-runs?${query.toString()}`);
  return result.runs;
};

export const cancelWorkflowRun = async (runId: string): Promise<WorkflowRunSummary> => {
  const result = await request<{ run: WorkflowRunSummary }>(
    `/workflow-runs/${encodeURIComponent(runId)}/cancel`,
    { method: 'POST' }
  );
  return result.run;
};

export const deleteWorkflowRun = async (runId: string): Promise<void> => {
  await request(`/workflow-runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });
};
