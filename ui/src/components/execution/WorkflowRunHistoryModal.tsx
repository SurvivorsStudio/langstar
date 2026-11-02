import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RefreshCw, Square, Trash2, ChevronDown, ChevronRight, Loader2, Eye, Workflow, RotateCcw } from 'lucide-react';
import WorkflowRunViewer from './WorkflowRunViewer';
import { useTranslation } from '../../hooks/useTranslation';
import { useFlowStore } from '../../store/flowStore';
import * as workflowRunApi from '../../services/workflowRunApi';
import type { WorkflowRun, WorkflowRunSummary } from '../../services/workflowRunApi';

interface WorkflowRunHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  waiting: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
  succeeded: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  cancelled: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
};

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-';
  const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return date.toLocaleString();
};

const formatDuration = (ms: number | null, startedAt?: string | null) => {
  let value = ms;
  if (value === null && startedAt) {
    value = Date.now() - new Date(startedAt.endsWith('Z') ? startedAt : `${startedAt}Z`).getTime();
  }
  if (value === null || value === undefined) return '-';
  if (value < 1000) return `${value}ms`;
  const seconds = value / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
};

const toJson = (value: unknown) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

/**
 * 워크플로우 서버 실행(Run) 이력 모달
 * - 실행 목록/상태 확인, 실행 중인 Run 강제 종료, 노드별 결과 확인
 */
const WorkflowRunHistoryModal: React.FC<WorkflowRunHistoryModalProps> = ({ isOpen, onClose, workflowName }) => {
  const { t } = useTranslation();
  const { applyWorkflowRunToCanvas, isWorkflowRunning, runWorkflow } = useFlowStore(state => ({
    applyWorkflowRunToCanvas: state.applyWorkflowRunToCanvas,
    isWorkflowRunning: state.isWorkflowRunning,
    runWorkflow: state.runWorkflow,
  }));

  const [runs, setRuns] = useState<WorkflowRunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [runDetail, setRunDetail] = useState<WorkflowRun | null>(null);
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  // 워크플로우 모양(읽기 전용)으로 보고 있는 Run
  const [viewerRunId, setViewerRunId] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    try {
      setRuns(await workflowRunApi.listWorkflowRuns({ workflowName, limit: 50 }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [workflowName]);

  const loadDetail = useCallback(async (runId: string) => {
    try {
      setRunDetail(await workflowRunApi.getWorkflowRun(runId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadRuns();
    else setViewerRunId(null);
  }, [isOpen, loadRuns]);

  // 실행 중인 Run 이 있으면 주기적으로 갱신
  const hasActiveRun = runs.some(run => !workflowRunApi.isTerminalRunStatus(run.status));
  useEffect(() => {
    if (!isOpen || !hasActiveRun) return;
    const timer = setInterval(() => {
      loadRuns();
      if (expandedRunId) loadDetail(expandedRunId);
    }, 2000);
    return () => clearInterval(timer);
  }, [isOpen, hasActiveRun, expandedRunId, loadRuns, loadDetail]);

  if (!isOpen) return null;

  const toggleDetail = (runId: string) => {
    if (expandedRunId === runId) {
      setExpandedRunId(null);
      setRunDetail(null);
      return;
    }
    setExpandedRunId(runId);
    setRunDetail(null);
    setExpandedNodeId(null);
    loadDetail(runId);
  };

  const handleStop = async (runId: string) => {
    if (!window.confirm(t('workflowRun.stopConfirm'))) return;
    try {
      await workflowRunApi.cancelWorkflowRun(runId);
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (runId: string) => {
    if (!window.confirm(t('workflowRun.deleteConfirm'))) return;
    try {
      await workflowRunApi.deleteWorkflowRun(runId);
      if (expandedRunId === runId) {
        setExpandedRunId(null);
        setRunDetail(null);
      }
      await loadRuns();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleShowOnCanvas = async (runId: string) => {
    try {
      const run = runDetail?.id === runId ? runDetail : await workflowRunApi.getWorkflowRun(runId);
      applyWorkflowRunToCanvas(run);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // 실패/중지된 Run 의 성공 노드는 재사용하고, 현재 캔버스 기준으로 실패 지점부터 다시 실행
  const handleResume = (runId: string) => {
    if (!window.confirm(t('workflowRun.resumeConfirm'))) return;
    onClose();
    runWorkflow(undefined, runId);
  };

  const canResume = (status: string) => status === 'failed' || status === 'cancelled';

  const statusBadge = (status: string) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status === 'running' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {t(`workflowRun.status.${status}`)}
    </span>
  );

  // 헤더/푸터 stacking context 위에 표시되도록 body 에 렌더링
  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full flex flex-col ${
          viewerRunId ? 'max-w-[95vw] h-[90vh]' : 'max-w-4xl max-h-[85vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('workflowRun.title')} <span className="text-gray-500 dark:text-gray-400 font-normal">· {workflowName}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('workflowRun.subtitle')}</p>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={loadRuns}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={t('workflowRun.refresh')}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 px-3 py-2 rounded bg-red-50 dark:bg-red-900/30 text-sm text-red-700 dark:text-red-300">{error}</div>
        )}

        {viewerRunId ? (
          <div className="flex-1 min-h-0">
            <WorkflowRunViewer
              runId={viewerRunId}
              onBack={() => {
                setViewerRunId(null);
                loadRuns();
              }}
              onStop={handleStop}
              onResume={handleResume}
              canStartRun={!isWorkflowRunning}
            />
          </div>
        ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {runs.length === 0 && !isLoading && (
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">{t('workflowRun.empty')}</div>
          )}

          {runs.map(run => {
            const isActive = !workflowRunApi.isTerminalRunStatus(run.status);
            const isExpanded = expandedRunId === run.id;
            return (
              <div key={run.id} className="border border-gray-200 dark:border-gray-700 rounded-md">
                <div className="flex items-center gap-3 px-3 py-2">
                  <button onClick={() => toggleDetail(run.id)} className="text-gray-500 dark:text-gray-400">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </button>
                  {statusBadge(run.status)}
                  <div className="flex-1 min-w-0 text-sm text-gray-700 dark:text-gray-300">
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                      <span>{t('workflowRun.startedAt')}: {formatDateTime(run.started_at || run.created_at)}</span>
                      <span>{t('workflowRun.duration')}: {formatDuration(run.duration_ms, isActive ? run.started_at : null)}</span>
                      <span>{t('workflowRun.progress')}: {run.completed_node_count}/{run.node_count}</span>
                      {run.resumed_from && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                          {t('workflowRun.resumedTag', { id: run.resumed_from.slice(0, 8), count: run.reused_node_count ?? 0 })}
                        </span>
                      )}
                    </div>
                    {isActive && run.running_nodes.length > 0 && (
                      <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
                        {t('workflowRun.runningNodes')}: {run.running_nodes.join(', ')}
                      </div>
                    )}
                    {run.error_nodes.length > 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 truncate">
                        {t('workflowRun.failedNodes')}: {run.error_nodes.join(', ')}
                      </div>
                    )}
                    {run.error && run.error_nodes.length === 0 && (
                      <div className="text-xs text-red-600 dark:text-red-400 truncate">{run.error}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setViewerRunId(run.id)}
                      className="flex items-center px-2 py-1 text-xs rounded-md border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title={t('workflowRun.viewAsWorkflow')}
                    >
                      <Workflow className="h-3.5 w-3.5 mr-1" />
                      {t('workflowRun.viewAsWorkflow')}
                    </button>
                    {isActive ? (
                      <button
                        onClick={() => handleStop(run.id)}
                        disabled={run.cancel_requested}
                        className="flex items-center px-2 py-1 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                      >
                        <Square className="h-3 w-3 mr-1" />
                        {run.cancel_requested ? t('header.stopping') : t('workflowRun.stop')}
                      </button>
                    ) : (
                      <>
                        {canResume(run.status) && (
                          <button
                            onClick={() => handleResume(run.id)}
                            disabled={isWorkflowRunning}
                            className="flex items-center px-2 py-1 text-xs rounded-md bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50"
                            title={t('workflowRun.resumeHint')}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            {t('workflowRun.resume')}
                          </button>
                        )}
                        <button
                          onClick={() => handleShowOnCanvas(run.id)}
                          disabled={isWorkflowRunning}
                          className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                          title={t('workflowRun.showOnCanvas')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(run.id)}
                          className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
                          title={t('workflowRun.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
                    {!runDetail ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <div className="space-y-3">
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">{t('workflowRun.nodes')}</div>
                          <div className="space-y-1">
                            {Object.entries(runDetail.node_states)
                              .filter(([, state]) => state.exec_count > 0 || state.status !== 'pending')
                              .sort(([, a], [, b]) => (a.started_at || '').localeCompare(b.started_at || ''))
                              .map(([nodeId, state]) => (
                                <div key={nodeId} className="rounded bg-gray-50 dark:bg-gray-900/40">
                                  <button
                                    onClick={() => setExpandedNodeId(expandedNodeId === nodeId ? null : nodeId)}
                                    className="w-full flex items-center gap-2 px-2 py-1 text-left"
                                  >
                                    {expandedNodeId === nodeId ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    {statusBadge(state.status)}
                                    <span className="text-gray-800 dark:text-gray-200">{state.label}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{state.type}</span>
                                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                      {formatDuration(state.duration_ms)}{state.exec_count > 1 ? ` · x${state.exec_count}` : ''}
                                    </span>
                                  </button>
                                  {state.error && (
                                    <div className="px-7 pb-1 text-xs text-red-600 dark:text-red-400">{state.error}</div>
                                  )}
                                  {expandedNodeId === nodeId && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 px-2 pb-2">
                                      <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.input')}</div>
                                        <pre className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">{toJson(state.input)}</pre>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('workflowRun.output')}</div>
                                        <pre className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-gray-800 dark:text-gray-200">{toJson(state.output)}</pre>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">{t('workflowRun.events')}</div>
                          <div className="max-h-40 overflow-y-auto text-xs font-mono text-gray-600 dark:text-gray-400 space-y-0.5">
                            {runDetail.events.map((event, index) => (
                              <div key={index}>
                                {formatDateTime(event.ts)} · {event.type}
                                {event.node_label ? ` · ${event.node_label}` : ''}
                                {event.message ? ` · ${event.message}` : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default WorkflowRunHistoryModal;
