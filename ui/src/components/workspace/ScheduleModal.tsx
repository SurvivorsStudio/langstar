import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../../store/scheduleStore';
import { useFlowStore } from '../../store/flowStore';
import {
  Schedule,
  ScheduleType,
  ScheduleConfig,
  CreateScheduleRequest,
} from '../../types/schedule';

interface ScheduleModalProps {
  schedule: Schedule | null;
  onClose: () => void;
  onSuccess: () => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ schedule, onClose, onSuccess }) => {
  const { createSchedule, updateSchedule } = useScheduleStore();
  const { deployments, fetchDeployments } = useFlowStore();

  const [formData, setFormData] = useState({
    name: schedule?.name || '',
    description: schedule?.description || '',
    deploymentId: schedule?.deploymentId || '',
    scheduleType: schedule?.scheduleType || ScheduleType.INTERVAL,
  });

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>(
    schedule?.scheduleConfig || {}
  );

  const [inputData, setInputData] = useState<string>(
    schedule?.inputData ? JSON.stringify(schedule.inputData, null, 2) : '{}'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  // 활성 상태인 배포만 필터링
  const activeDeployments = deployments.filter((d) => d.status === 'active');

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError('');
  };

  const handleConfigChange = (field: string, value: any) => {
    setScheduleConfig((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setValidationError('스케줄 이름을 입력해주세요.');
      return false;
    }

    if (!formData.deploymentId) {
      setValidationError('배포를 선택해주세요.');
      return false;
    }

    // 스케줄 타입별 설정 검증
    if (formData.scheduleType === ScheduleType.CRON) {
      if (!scheduleConfig.minute || !scheduleConfig.hour) {
        setValidationError('Cron 표현식을 입력해주세요.');
        return false;
      }
    } else if (formData.scheduleType === ScheduleType.INTERVAL) {
      const hasInterval =
        scheduleConfig.weeks ||
        scheduleConfig.days ||
        scheduleConfig.hours ||
        scheduleConfig.minutes ||
        scheduleConfig.seconds;
      if (!hasInterval) {
        setValidationError('반복 간격을 설정해주세요.');
        return false;
      }
    } else if (formData.scheduleType === ScheduleType.DATE) {
      if (!scheduleConfig.run_date) {
        setValidationError('실행 날짜/시간을 입력해주세요.');
        return false;
      }
    }

    // JSON 검증
    try {
      JSON.parse(inputData);
    } catch {
      setValidationError('입력 데이터가 올바른 JSON 형식이 아닙니다.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const parsedInputData = JSON.parse(inputData);

      if (schedule) {
        // 수정
        await updateSchedule(schedule.id, {
          name: formData.name,
          description: formData.description,
          scheduleConfig,
          inputData: parsedInputData,
        });
      } else {
        // 생성
        const request: CreateScheduleRequest = {
          name: formData.name,
          description: formData.description,
          deploymentId: formData.deploymentId,
          scheduleType: formData.scheduleType,
          scheduleConfig,
          inputData: parsedInputData,
        };
        await createSchedule(request);
      }

      onSuccess();
    } catch (error: any) {
      setValidationError(error.message || '스케줄 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            {schedule ? '스케줄 수정' : '새 스케줄 생성'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Validation Error */}
          {validationError && (
            <div className="p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 rounded">
              {validationError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              스케줄 이름 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="예: 매일 밤 데이터 동기화"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="스케줄에 대한 설명을 입력하세요"
            />
          </div>

          {/* Deployment Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              배포 선택 *
            </label>
            <select
              value={formData.deploymentId}
              onChange={(e) => handleInputChange('deploymentId', e.target.value)}
              disabled={!!schedule}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            >
              <option value="">배포를 선택하세요</option>
              {activeDeployments.map((deployment) => (
                <option key={deployment.id} value={deployment.id}>
                  {deployment.name} (v{deployment.version})
                </option>
              ))}
            </select>
            {activeDeployments.length === 0 && (
              <p className="mt-1 text-sm text-red-500">
                활성 상태인 배포가 없습니다. 먼저 배포를 생성하고 활성화해주세요.
              </p>
            )}
          </div>

          {/* Schedule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              스케줄 타입 *
            </label>
            <select
              value={formData.scheduleType}
              onChange={(e) => handleInputChange('scheduleType', e.target.value as ScheduleType)}
              disabled={!!schedule}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800"
            >
              <option value={ScheduleType.INTERVAL}>반복 (Interval)</option>
              <option value={ScheduleType.CRON}>Cron 표현식</option>
              <option value={ScheduleType.DATE}>일회성 (특정 날짜/시간)</option>
            </select>
          </div>

          {/* Schedule Configuration */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              스케줄 설정
            </h3>

            {formData.scheduleType === ScheduleType.INTERVAL && (
              <div className="grid grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    주 (weeks)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleConfig.weeks || 0}
                    onChange={(e) => handleConfigChange('weeks', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    일 (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleConfig.days || 0}
                    onChange={(e) => handleConfigChange('days', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    시간 (hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleConfig.hours || 0}
                    onChange={(e) => handleConfigChange('hours', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    분 (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleConfig.minutes || 0}
                    onChange={(e) => handleConfigChange('minutes', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    초 (seconds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={scheduleConfig.seconds || 0}
                    onChange={(e) => handleConfigChange('seconds', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}

            {formData.scheduleType === ScheduleType.CRON && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Cron 표현식을 입력하세요. * = 모든 값
                </p>
                <div className="grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      분 (0-59)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.minute || '*'}
                      onChange={(e) => handleConfigChange('minute', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="*"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      시 (0-23)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.hour || '*'}
                      onChange={(e) => handleConfigChange('hour', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="*"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      일 (1-31)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.day || '*'}
                      onChange={(e) => handleConfigChange('day', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="*"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      월 (1-12)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.month || '*'}
                      onChange={(e) => handleConfigChange('month', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="*"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      요일 (0-6)
                    </label>
                    <input
                      type="text"
                      value={scheduleConfig.day_of_week || '*'}
                      onChange={(e) => handleConfigChange('day_of_week', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="*"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.scheduleType === ScheduleType.DATE && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  실행 날짜/시간
                </label>
                <input
                  type="datetime-local"
                  value={scheduleConfig.run_date || ''}
                  onChange={(e) => handleConfigChange('run_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Input Data */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              입력 데이터 (JSON)
            </label>
            <textarea
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 font-mono text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder='{"key": "value"}'
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              워크플로우 실행 시 전달할 입력 데이터를 JSON 형식으로 입력하세요
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || activeDeployments.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '저장 중...' : schedule ? '수정' : '생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;


