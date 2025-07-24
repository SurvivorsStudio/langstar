import React, { useState, useEffect } from 'react';
import { Workflow } from '../../store/flowStore';
import { PlusCircle, Code, ArrowRightCircle, ListChecks, X } from 'lucide-react';

interface DeploymentListProps {
  getWorkflowAsJSONString: (deploymentData?: Workflow) => string | null;
  availableDeployments: Workflow[];
  isLoading: boolean;
  loadError: string | null;
  handleNewDeployment: () => void;
  handleDeleteDeployment: (deploymentName: string, event: React.MouseEvent) => void;
}

const DeploymentList: React.FC<DeploymentListProps> = ({
  getWorkflowAsJSONString,
  availableDeployments,
  isLoading,
  loadError,
  handleNewDeployment,
  handleDeleteDeployment,
}) => {
  // This state is for demonstration purposes to make the toggle switch interactive.

  useEffect(() => {
    console.log('[DeploymentList] ➡️ 컴포넌트가 새로운 props로 렌더링됩니다.');
    if (isLoading) {
      console.log('[DeploymentList] ⏳ 상태: 로딩 중...');
    } else if (loadError) {
      console.error('[DeploymentList] ❌ 상태: 오류 발생.', loadError);
    } else {
      console.log(`[DeploymentList] ✅ 상태: 성공. ${availableDeployments.length}개의 배포 목록을 받았습니다.`);
      console.log('[DeploymentList] 수신된 데이터:', JSON.parse(JSON.stringify(availableDeployments)));
    }
  }, [availableDeployments, isLoading, loadError]);

  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);

  // It should be replaced with actual deployment status data from your backend.
  const [deploymentStatuses, setDeploymentStatuses] = React.useState<Record<string, boolean>>(
    () => availableDeployments.reduce((acc, wf) => ({ ...acc, [wf.projectName]: true }), {})
  );

  const handleStatusToggle = async (e: React.MouseEvent, deploymentName: string) => {
    e.stopPropagation(); // Prevents the row's onClick handler from being triggered.

    const deployment = availableDeployments.find(d => d.projectName === deploymentName);
    if (!deployment) {
      console.error(`Deployment with name "${deploymentName}" not found.`);
      alert(`Error: Deployment with name "${deploymentName}" not found.`);
      return;
    }

    // Header.tsx와 완전히 동일한 방식으로 getWorkflowAsJSONString() 호출
    // deployment 데이터를 파라미터로 전달하여 동일한 로직으로 JSON 생성
    const jsonString = getWorkflowAsJSONString(deployment);
    if (!jsonString) {
      console.error('Failed to generate workflow JSON string');
      alert(`Failed to generate workflow JSON for ${deploymentName}.`);
      return;
    }

    console.log("888889999999");
    console.log('jsonString', jsonString);

    try {
      const response = await fetch('http://localhost:8000/workflow/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API call failed: ${response.status} ${response.statusText}. Body: ${errorText}`);
      }

      const result = await response.json();
      console.log('Deployment API call successful:', result);

      // On successful API call, update the local state to reflect the change.
      setDeploymentStatuses(prev => ({
        ...prev,
        [deploymentName]: !prev[deploymentName],
      }));
    } catch (error) {
      console.error('Failed to toggle deployment status:', error);
      alert(`Failed to toggle deployment status for ${deploymentName}. See console for details.`);
    }
  };

  const handleViewCode = () => {
    setApiResponseModalContent('print("hello world")');
  };
  if (isLoading) {
    return <p>Loading deployments...</p>;
  }

  if (loadError) {
    return <p>Error loading deployments: {loadError}</p>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Deployments</h2>
        {/* <button
          onClick={handleNewDeployment}
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          New Deployment
        </button> */}
      </div>
      {availableDeployments.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400">No deployments available. Create a new one to get started.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Workflow ID
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {availableDeployments.map((deployment) => (
                <tr
                  key={deployment.projectId}
                  className="hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                    {deployment.projectName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    {deployment.projectId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox" 
                        className="sr-only peer"
                        checked={deploymentStatuses[deployment.projectName] ?? false}
                        onChange={() => {}} // Required for a controlled component, logic is in onClick
                        onClick={(e) => handleStatusToggle(e, deployment.projectName)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-center items-center space-x-4">
                      <button title="View API Code" onClick={(e) => { e.stopPropagation(); handleViewCode(); }}>
                        <Code className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                      </button>
                      <a href={`/flow/${encodeURIComponent(deployment.projectName)}`} target="_blank" rel="noopener noreferrer" title="Go to Workflow">
                        <ArrowRightCircle className="h-5 w-5 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300" />
                      </a>
                      <button title="View Logs" onClick={(e) => e.stopPropagation()}>
                        <ListChecks className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {apiResponseModalContent && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center p-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold ml-1 text-gray-900 dark:text-gray-100">API Response</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(apiResponseModalContent);
                          alert('Code copied to clipboard!');
                        } catch (err) {
                          console.error('Failed to copy code: ', err);
                          alert('Failed to copy code. See console for details.');
                        }
                      }
                      }
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center text-sm"
                      title="Copy Code"
                    >
                      <Code size={16} className="mr-1" /> Copy
                    </button>
                    <button
                      onClick={() => {
                        setApiResponseModalContent(null);
                      }}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-4 overflow-auto">
                  <div className="h-[60vh] rounded-md overflow-hidden bg-gray-100 dark:bg-gray-900">
                    <div className="flex h-full">
                      <div className="py-4 px-2 bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-mono whitespace-nowrap">
                        {apiResponseModalContent &&
                          Array.from({ length: (apiResponseModalContent.match(/\n/g)?.length || 0) + 1 }, (_, i) => i + 1).map(line => (
                            <div key={line} className="text-right py-0.5 px-2">
                              {line}
                            </div>
                          ))
                        }
                      </div>
                      <pre className="overflow-x-auto py-4 px-4 whitespace-pre-wrap break-words text-sm text-gray-800 dark:text-gray-200">
                        <code className="font-mono">
                          {apiResponseModalContent}
                        </code>
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeploymentList;