import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Workflow, Square, X } from 'lucide-react';
import { useScheduleStore } from '../../store/scheduleStore';
import { Schedule, ScheduleStatus, ScheduleType } from '../../types/schedule';
import ScheduleModal from './ScheduleModal';
import WorkflowRunViewer from '../execution/WorkflowRunViewer';
import * as workflowRunApi from '../../services/workflowRunApi';
import type { WorkflowRunSummary } from '../../services/workflowRunApi';
import { useTranslation } from '../../hooks/useTranslation';

const ScheduleManagement: React.FC = () => {
  const { t } = useTranslation();
  const {
    schedules,
    isLoading,
    error,
    fetchSchedules,
    deleteSchedule,
    pauseSchedule,
    resumeSchedule,
    clearError,
  } = useScheduleStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  // 챗플로우 스케줄의 마지막 Run 진행 상황 (runId -> 요약)
  const [runSummaries, setRunSummaries] = useState<Record<string, WorkflowRunSummary>>({});
  const [viewerRunId, setViewerRunId] = useState<string | null>(null);

  useEffect(() => {
    fetchSchedules();
    // 화면을 열어둔 동안 스케줄이 시작/종료되는 것을 반영하도록 조용히 주기 갱신
    const timer = setInterval(() => fetchSchedules(true).catch(() => undefined), 10000);
    return () => clearInterval(timer);
  }, [fetchSchedules]);

  // 챗플로우 스케줄의 마지막 Run 요약을 가져옴
  const chatflowRuns = schedules.filter((s) => s.targetType === 'workflow' && s.lastRunId);
  const runKey = chatflowRuns.map((s) => `${s.workflowName}:${s.lastRunId}:${s.lastRunStatus}`).join('|');
  useEffect(() => {
    if (chatflowRuns.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const names = Array.from(new Set(chatflowRuns.map((s) => s.workflowName || '')));
      const next: Record<string, WorkflowRunSummary> = {};
      await Promise.all(names.map(async (name) => {
        try {
          const runs = await workflowRunApi.listWorkflowRuns({ workflowName: name, limit: 10 });
          runs.forEach((r) => { next[r.id] = r; });
        } catch {
          // 서버 연결 실패 시 이전 값 유지
        }
      }));
      if (!cancelled) setRunSummaries((prev) => ({ ...prev, ...next }));
    };
    load();
    return () => { cancelled = true; };
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 실행 중인 스케줄이 있으면 3초마다 진행 상황과 스케줄 상태를 갱신
  const hasRunning = chatflowRuns.some((s) => {
    const run = s.lastRunId ? runSummaries[s.lastRunId] : undefined;
    return s.lastRunStatus === 'running' || (run && !workflowRunApi.isTerminalRunStatus(run.status));
  });
  useEffect(() => {
    if (!hasRunning) return;
    const timer = setInterval(async () => {
      fetchSchedules(true).catch(() => undefined);
      const names = Array.from(new Set(chatflowRuns.map((s) => s.workflowName || '')));
      const next: Record<string, WorkflowRunSummary> = {};
      await Promise.all(names.map(async (name) => {
        try {
          const runs = await workflowRunApi.listWorkflowRuns({ workflowName: name, limit: 10 });
          runs.forEach((r) => { next[r.id] = r; });
        } catch {
          // 무시하고 다음 주기에 다시 시도
        }
      }));
      setRunSummaries((prev) => ({ ...prev, ...next }));
    }, 3000);
    return () => {
      clearInterval(timer);
      // 실행이 끝나 폴링을 멈출 때 스케줄 상태(완료/다음 실행)를 한 번 더 갱신
      fetchSchedules(true).catch(() => undefined);
    };
  }, [hasRunning, runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStopRun = async (runId: string) => {
    if (!window.confirm(t('workflowRun.stopConfirm'))) return;
    try {
      await workflowRunApi.cancelWorkflowRun(runId);
    } catch (error) {
      console.error('Failed to stop run:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (window.confirm(t('schedule.deleteConfirm'))) {
      try {
        await deleteSchedule(scheduleId);
      } catch (error) {
        console.error('Failed to delete schedule:', error);
      }
    }
  };

  const handlePauseResume = async (schedule: Schedule) => {
    try {
      if (schedule.status === ScheduleStatus.ACTIVE) {
        await pauseSchedule(schedule.id);
      } else if (schedule.status === ScheduleStatus.PAUSED) {
        await resumeSchedule(schedule.id);
      }
    } catch (error) {
      console.error('Failed to pause/resume schedule:', error);
    }
  };

  const getStatusBadgeColor = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ACTIVE:
        return 'bg-green-500';
      case ScheduleStatus.PAUSED:
        return 'bg-yellow-500';
      case ScheduleStatus.COMPLETED:
        return 'bg-blue-500';
      case ScheduleStatus.FAILED:
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getScheduleTypeLabel = (type: ScheduleType) => {
    switch (type) {
      case ScheduleType.CRON:
        return t('schedule.typeCron');
      case ScheduleType.INTERVAL:
        return t('schedule.typeInterval');
      case ScheduleType.DATE:
        return t('schedule.typeDate');
      default:
        return type;
    }
  };

  const getStatusLabel = (status: ScheduleStatus) => {
    switch (status) {
      case ScheduleStatus.ACTIVE:
        return t('schedule.statusActive');
      case ScheduleStatus.PAUSED:
        return t('schedule.statusPaused');
      case ScheduleStatus.COMPLETED:
        return t('schedule.statusCompleted');
      case ScheduleStatus.FAILED:
        return t('schedule.statusFailed');
      default:
        return status;
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('schedule.title')}
        </h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + {t('schedule.newSchedule')}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
        </div>
      )}

      {/* Schedule List */}
      {!isLoading && (
        <div className="flex-1 overflow-auto p-4">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">{t('schedule.noSchedules')}</p>
              <p className="text-sm">{t('schedule.createFirst')}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white dark:bg-gray-750"
                >
                  {/* Schedule Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {schedule.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs rounded-full text-white ${getStatusBadgeColor(
                            schedule.status
                          )}`}
                        >
                          {getStatusLabel(schedule.status)}
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {getScheduleTypeLabel(schedule.scheduleType)}
                        </span>
                      </div>
                      {schedule.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {schedule.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(schedule.status === ScheduleStatus.ACTIVE ||
                        schedule.status === ScheduleStatus.PAUSED) && (
                        <button
                          onClick={() => handlePauseResume(schedule)}
                          className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
                        >
                          {schedule.status === ScheduleStatus.ACTIVE ? t('schedule.pause') : t('schedule.resume')}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        {t('schedule.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">
                        {schedule.targetType === 'workflow' ? t('schedule.chatflow') : t('schedule.deployment')}:
                      </span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {schedule.targetType === 'workflow' ? schedule.workflowName : schedule.deploymentName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('schedule.executionCount')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {t('schedule.executionCountValue', { count: schedule.executionCount })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('schedule.nextRun')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDateTime(schedule.nextRunTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t('schedule.lastRun')}:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDateTime(schedule.lastRunTime)}
                      </span>
                    </div>
                  </div>

                  {/* Chatflow Run Progress */}
                  {schedule.targetType === 'workflow' && schedule.lastRunId && (() => {
                    const run = runSummaries[schedule.lastRunId];
                    const isRunning = run ? !workflowRunApi.isTerminalRunStatus(run.status) : schedule.lastRunStatus === 'running';
                    const percent = run && run.node_count > 0 ? Math.round((run.completed_node_count / run.node_count) * 100) : 0;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{t('schedule.lastRunResult')}:</span>
                          {run ? (
                            <span className={`font-medium flex items-center gap-1 ${
                              isRunning ? 'text-blue-600 dark:text-blue-400'
                                : run.status === 'succeeded' ? 'text-green-600 dark:text-green-400'
                                : run.status === 'cancelled' ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              {t(`workflowRun.status.${run.status}`)}
                              {run.cancel_requested && isRunning ? ` (${t('header.stopping')})` : ''}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                          <div className="ml-auto flex gap-2">
                            {isRunning && (
                              <button
                                onClick={() => handleStopRun(schedule.lastRunId as string)}
                                disabled={run?.cancel_requested}
                                className="flex items-center px-2 py-1 text-xs rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                              >
                                <Square className="h-3 w-3 mr-1" />
                                {t('workflowRun.stop')}
                              </button>
                            )}
                            <button
                              onClick={() => setViewerRunId(schedule.lastRunId as string)}
                              className="flex items-center px-2 py-1 text-xs rounded border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            >
                              <Workflow className="h-3.5 w-3.5 mr-1" />
                              {isRunning ? t('schedule.viewProgress') : t('schedule.viewRun')}
                            </button>
                          </div>
                        </div>
                        {run && (
                          <div>
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>{t('workflowRun.progress')}: {run.completed_node_count}/{run.node_count} ({percent}%)</span>
                              {run.error_nodes.length > 0 && (
                                <span className="text-red-600 dark:text-red-400 truncate ml-2">
                                  {t('workflowRun.failedNodes')}: {run.error_nodes.join(', ')}
                                </span>
                              )}
                            </div>
                            <div className="h-1.5 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full transition-all ${isRunning ? 'bg-blue-500' : run.status === 'succeeded' ? 'bg-green-500' : 'bg-amber-500'}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            {isRunning && run.running_nodes.length > 0 && (
                              <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 truncate">
                                {t('workflowRun.runningNodes')}: {run.running_nodes.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Last Run Status */}
                  {schedule.lastRunStatus && !(schedule.targetType === 'workflow' && schedule.lastRunId) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('schedule.lastRunResult')}:
                      </span>
                      <span
                        className={`ml-2 text-sm font-medium ${
                          schedule.lastRunStatus === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : schedule.lastRunStatus === 'running'
                              ? 'text-blue-600 dark:text-blue-400'
                              : schedule.lastRunStatus === 'skipped' || schedule.lastRunStatus === 'cancelled'
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {({
                          success: t('schedule.success'),
                          running: t('schedule.running'),
                          skipped: t('schedule.skipped'),
                          cancelled: t('schedule.cancelled'),
                        } as Record<string, string>)[schedule.lastRunStatus] || t('schedule.failed')}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {isModalOpen && (
        <ScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setSelectedSchedule(null);
            fetchSchedules();
          }}
        />
      )}

      {/* 스케줄 Run 진행 상황 (읽기 전용 워크플로우 뷰어) */}
      {viewerRunId && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200] p-4" onClick={() => setViewerRunId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end p-2 border-b border-gray-200 dark:border-gray-700">
              <button onClick={() => setViewerRunId(null)} className="p-1.5 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <WorkflowRunViewer runId={viewerRunId} onBack={() => setViewerRunId(null)} onStop={handleStopRun} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ScheduleManagement;




