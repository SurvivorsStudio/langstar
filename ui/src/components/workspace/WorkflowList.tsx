import React from 'react';
import { PlusCircle, Trash2, Loader2 } from 'lucide-react';

interface WorkflowListProps {
  availableWorkflows: string[];
  isLoading: boolean;
  loadError: string | null;
  handleNewWorkflow: () => void;
  handleWorkflowClick: (workflowName: string) => void;
  handleDeleteWorkflow: (workflowName: string, event: React.MouseEvent) => void;
}

const WorkflowList: React.FC<WorkflowListProps> = ({
  availableWorkflows,
  isLoading,
  loadError,
  handleNewWorkflow,
  handleWorkflowClick,
  handleDeleteWorkflow,
}) => (
  <div className="p-8">
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-2xl font-semibold text-gray-800">Workflows</h1>
      <button
        onClick={handleNewWorkflow}
        className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <PlusCircle className="w-5 h-5 mr-2" />
        New Workflow
      </button>
    </div>
    {isLoading && (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600">Loading workflows...</p>
      </div>
    )}
    {!isLoading && loadError && (
      <div className="text-red-500 bg-red-100 p-4 rounded-md">
        Error loading workflows: {loadError}
      </div>
    )}
    {!isLoading && !loadError && availableWorkflows.length === 0 && (
      <div className="text-center text-gray-500 py-10">
        <p>No workflows found.</p>
        <p>Click "New Workflow" to get started.</p>
      </div>
    )}
    {!isLoading && !loadError && availableWorkflows.length > 0 && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableWorkflows.map((workflowName) => (
          <div
            key={workflowName}
            onClick={() => handleWorkflowClick(workflowName)}
            className="bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group relative"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{workflowName}</h3>
              </div>
              <button
                onClick={(e) => handleDeleteWorkflow(workflowName, e)}
                className="p-1 text-gray-400 hover:text-red-500 transition-opacity absolute top-2 right-2"
                title={`Delete ${workflowName}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div>
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                Saved
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default WorkflowList; 