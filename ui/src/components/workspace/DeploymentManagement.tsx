import React from 'react';

interface DeploymentManagementProps {
  availableWorkflows: string[];
  isLoading: boolean;
  loadError: string | null;
}

const DeploymentManagement: React.FC<DeploymentManagementProps> = ({
  availableWorkflows,
  isLoading,
  loadError,
}) => {
  if (isLoading) {
    return <p>Loading chatflows...</p>;
  }

  if (loadError) {
    return <p>Error loading chatflows: {loadError}</p>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Deployment Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead>
            <tr>
              <th className="px-4 py-2 border-b">Chatflow ID</th>
              <th className="px-4 py-2 border-b">Chatflow Name</th>
              <th className="px-4 py-2 border-b">Deployed</th>
              <th className="px-4 py-2 border-b">Control</th>
              <th className="px-4 py-2 border-b">Description</th>
            </tr>
          </thead>
          <tbody>
            {availableWorkflows.map((workflowName, index) => (
              <tr key={index} className="hover:bg-gray-100">
                <td className="px-4 py-2 border-b">{index + 1}</td>
                <td className="px-4 py-2 border-b">{workflowName}</td>
                <td className="px-4 py-2 border-b">
                  <input type="checkbox" />
                </td>
                <td className="px-4 py-2 border-b">
                  <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-1">
                    Logs
                  </button>
                  <button className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded">
                    API Sample
                  </button>
                </td>
                <td className="px-4 py-2 border-b">
                  {/* TODO: Add description logic if available */}
                  No description available
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeploymentManagement;