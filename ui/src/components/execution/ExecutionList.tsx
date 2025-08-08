import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Eye, Clock, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface Execution {
  id: string;
  name: string;
  status: 'running' | 'succeeded' | 'failed' | 'aborted' | 'timed_out';
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  input: Record<string, any>;
  output?: Record<string, any>;
  error_message?: string;
}

interface ExecutionListProps {
  workflowId: string;
  workflowName: string;
  onExecutionSelect: (execution: Execution) => void;
}

const ExecutionList: React.FC<ExecutionListProps> = ({
  workflowId,
  workflowName,
  onExecutionSelect
}) => {
  const { isDarkMode } = useThemeStore();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    timeRange: 'last-15-months'
  });
  const [selectedExecutions, setSelectedExecutions] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchExecutions();
  }, [workflowId, filters]);

  useEffect(() => {
    // 실행 완료 이벤트 리스너 추가
    const handleExecutionCompleted = () => {
      fetchExecutions();
    };

    window.addEventListener('executionCompleted', handleExecutionCompleted);

    return () => {
      window.removeEventListener('executionCompleted', handleExecutionCompleted);
    };
  }, []);

  const fetchExecutions = async () => {
    setLoading(true);
    try {
      console.log('Fetching executions for workflowId:', workflowId);
      
      const params = new URLSearchParams({
        max_results: '100',
        ...(filters.status !== 'all' && { status_filter: filters.status }),
        ...(filters.search && { search: filters.search })
      });

      const url = `/api/workflows/${workflowId}/executions?${params}`;
      console.log('Fetching URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Execution API response:', data);
      
      if (data.success) {
        setExecutions(data.executions);
        console.log('Set executions:', data.executions);
      }
    } catch (error) {
      console.error('Error fetching executions:', error);
    } finally {
      setLoading(false);
    }
  };



  const stopExecution = async (executionId: string) => {
    try {
      await fetch(`/api/executions/${executionId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: 'Stopped by user',
          cause: 'User requested stop'
        })
      });

      fetchExecutions();
    } catch (error) {
      console.error('Error stopping execution:', error);
    }
  };

  const deleteExecution = async (executionId: string) => {
    if (!window.confirm('Are you sure you want to delete this execution? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/executions/${executionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Execution deleted successfully:', executionId);
        fetchExecutions(); // 목록 새로고침
      } else {
        console.error('Failed to delete execution:', data.message);
        alert('Failed to delete execution: ' + data.message);
      }
    } catch (error) {
      console.error('Error deleting execution:', error);
      alert('Error deleting execution: ' + error);
    }
  };

  const deleteSelectedExecutions = async () => {
    if (selectedExecutions.size === 0) {
      alert('Please select executions to delete.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedExecutions.size} execution(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsDeleting(true);
    const executionIds = Array.from(selectedExecutions);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const executionId of executionIds) {
        try {
          const response = await fetch(`/api/executions/${executionId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            }
          });

          const data = await response.json();
          
          if (data.success) {
            successCount++;
            console.log('Execution deleted successfully:', executionId);
          } else {
            errorCount++;
            console.error('Failed to delete execution:', executionId, data.message);
          }
        } catch (error) {
          errorCount++;
          console.error('Error deleting execution:', executionId, error);
        }
      }

      // 결과 알림
      if (successCount > 0) {
        alert(`Successfully deleted ${successCount} execution(s).${errorCount > 0 ? ` Failed to delete ${errorCount} execution(s).` : ''}`);
        setSelectedExecutions(new Set()); // 선택 초기화
        fetchExecutions(); // 목록 새로고침
      } else {
        alert('Failed to delete any executions.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedExecutions.size === executions.length) {
      setSelectedExecutions(new Set());
    } else {
      setSelectedExecutions(new Set(executions.map(execution => execution.id)));
    }
  };

  const handleSelectExecution = (executionId: string) => {
    const newSelected = new Set(selectedExecutions);
    if (newSelected.has(executionId)) {
      newSelected.delete(executionId);
    } else {
      newSelected.add(executionId);
    }
    setSelectedExecutions(newSelected);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'succeeded':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'aborted':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running':
        return 'Running';
      case 'succeeded':
        return 'Succeeded';
      case 'failed':
        return 'Failed';
      case 'aborted':
        return 'Aborted';
      case 'timed_out':
        return 'Timed Out';
      default:
        return status;
    }
  };

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) {
      return '-';
    }
    
    // ms 단위로 그대로 표시
    return `${durationMs}ms`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {workflowName} - Executions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {executions.length} executions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {selectedExecutions.size > 0 && (
              <button
                onClick={deleteSelectedExecutions}
                disabled={isDeleting}
                className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50 flex items-center space-x-1"
                title={`Delete ${selectedExecutions.size} selected execution(s)`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Deleting...' : `Delete (${selectedExecutions.size})`}</span>
              </button>
            )}
            <button
              onClick={fetchExecutions}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Filter executions by property or value"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="aborted">Aborted</option>
          </select>
          <select
            value={filters.timeRange}
            onChange={(e) => setFilters({ ...filters, timeRange: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="last-15-months">Last 15 months</option>
            <option value="last-30-days">Last 30 days</option>
            <option value="last-7-days">Last 7 days</option>
            <option value="last-24-hours">Last 24 hours</option>
          </select>
        </div>
      </div>

      {/* Executions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <input
                  type="checkbox"
                  checked={selectedExecutions.size === executions.length && executions.length > 0}
                  onChange={handleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-600"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  Loading executions...
                </td>
              </tr>
            ) : executions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  No executions found
                </td>
              </tr>
            ) : (
              executions.map((execution) => (
                <tr
                  key={execution.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => onExecutionSelect(execution)}
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedExecutions.has(execution.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectExecution(execution.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-600"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                    {execution.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {getStatusText(execution.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(execution.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDuration(execution.duration_ms)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onExecutionSelect(execution);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {execution.status === 'running' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopExecution(execution.id);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Stop execution"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteExecution(execution.id);
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Delete execution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExecutionList; 