import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, Eye, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    search: '',
    timeRange: 'last-15-months'
  });

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
    if (!durationMs) return '-';
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {workflowName} - Executions
            </h2>
            <p className="text-sm text-gray-500">
              {executions.length} executions
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchExecutions}
              className="p-2 text-gray-500 hover:text-gray-700"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Filter executions by property or value"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  Loading executions...
                </td>
              </tr>
            ) : executions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No executions found
                </td>
              </tr>
            ) : (
              executions.map((execution) => (
                <tr
                  key={execution.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => onExecutionSelect(execution)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                    {execution.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(execution.status)}
                      <span className="text-sm text-gray-900">
                        {getStatusText(execution.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(execution.start_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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