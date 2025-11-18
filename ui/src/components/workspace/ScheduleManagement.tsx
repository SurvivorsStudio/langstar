import React, { useEffect, useState } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';
import { Schedule, ScheduleStatus, ScheduleType } from '../../types/schedule';
import ScheduleModal from './ScheduleModal';

const ScheduleManagement: React.FC = () => {
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

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreateNew = () => {
    setSelectedSchedule(null);
    setIsModalOpen(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDelete = async (scheduleId: string) => {
    if (window.confirm('이 스케줄을 삭제하시겠습니까?')) {
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
        return 'Cron';
      case ScheduleType.INTERVAL:
        return '반복';
      case ScheduleType.DATE:
        return '일회성';
      default:
        return type;
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
          스케줄 관리
        </h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 새 스케줄
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
          <div className="text-gray-500 dark:text-gray-400">로딩 중...</div>
        </div>
      )}

      {/* Schedule List */}
      {!isLoading && (
        <div className="flex-1 overflow-auto p-4">
          {schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <p className="text-lg mb-2">등록된 스케줄이 없습니다</p>
              <p className="text-sm">새 스케줄 버튼을 클릭하여 시작하세요</p>
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
                          {schedule.status}
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
                          {schedule.status === ScheduleStatus.ACTIVE ? '일시중지' : '재개'}
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(schedule)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* Schedule Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">배포:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {schedule.deploymentName}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">실행 횟수:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {schedule.executionCount}회
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">다음 실행:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDateTime(schedule.nextRunTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">마지막 실행:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {formatDateTime(schedule.lastRunTime)}
                      </span>
                    </div>
                  </div>

                  {/* Last Run Status */}
                  {schedule.lastRunStatus && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        마지막 실행 결과:
                      </span>
                      <span
                        className={`ml-2 text-sm font-medium ${
                          schedule.lastRunStatus === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {schedule.lastRunStatus === 'success' ? '성공' : '실패'}
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
    </div>
  );
};

export default ScheduleManagement;





