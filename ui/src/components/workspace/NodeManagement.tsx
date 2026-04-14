import React, { useState } from 'react';
import { Plus, Code, Edit, Trash2, FileDown, X, Upload } from 'lucide-react';
import { useUserNodeStore } from '../../store/userNodeStore';
import NodeCreation from './NodeCreation';
import NodeDetail from './NodeDetail';

interface NodeManagementProps {
  onBack: () => void;
}

const NodeManagement: React.FC<NodeManagementProps> = ({ onBack }) => {
  const { userNodes, fetchUserNodes, deleteUserNode, importUserNodes, exportUserNodes } = useUserNodeStore();
  const [showNodeCreation, setShowNodeCreation] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  
  // Import 관련 상태
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResults, setImportResults] = useState<any[]>([]);

  React.useEffect(() => {
    fetchUserNodes();
  }, [fetchUserNodes]);

  const handleAddNode = () => {
    setShowNodeCreation(true);
  };

  const handleBackToManagement = () => {
    setShowNodeCreation(false);
    setSelectedNode(null);
  };

  const handleBackFromDetail = () => {
    setSelectedNode(null);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleDeleteNode = async (nodeId: string, nodeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete the node "${nodeName}"?`)) {
      try {
        await deleteUserNode(nodeId);
      } catch (error) {
        alert(`Error deleting node: ${(error as Error).message}`);
      }
    }
  };

  // Import 핸들러
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const results = await importUserNodes(file);
      setImportResults(results);
      setIsImportModalOpen(true);
      
      // 성공한 노드 수 계산
      const successCount = results.filter((r: any) => r.success).length;
      const failCount = results.length - successCount;
      
      let message = `Import 완료!\n성공: ${successCount}개`;
      if (failCount > 0) {
        message += `\n실패: ${failCount}개`;
      }
      alert(message);
      
      // 파일 입력 초기화
      event.target.value = '';
    } catch (error) {
      console.error('Import 중 오류:', error);
      alert('Import 중 오류가 발생했습니다: ' + (error as Error).message);
      event.target.value = '';
    }
  };

  // Export 개별 노드 핸들러
  const handleExportNode = async (nodeId: string, nodeName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // 노드 이름을 포함한 파일명 생성 (날짜도 포함)
      const today = new Date().toISOString().split('T')[0];
      const customFileName = `${nodeName}-${today}`;
      
      await exportUserNodes([nodeId], customFileName);
      alert(`"${nodeName}" 노드가 성공적으로 Export되었습니다.`);
    } catch (error) {
      console.error('Export 중 오류:', error);
      alert('Export 중 오류가 발생했습니다.');
    }
  };

  if (showNodeCreation) {
    return (
      <div className="h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBackToManagement}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to Node Management
          </button>
        </div>
        <NodeCreation onSave={handleBackToManagement} />
      </div>
    );
  }

  if (selectedNode) {
    return <NodeDetail nodeId={selectedNode} onBack={handleBackFromDetail} />;
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Node Management</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your custom nodes
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
            <Upload className="w-5 h-5 mr-2" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleAddNode}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Node
          </button>
        </div>
      </div>

      <div className="p-6">
        {userNodes.length === 0 ? (
          <div className="text-center py-12">
            <Code className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No custom nodes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first custom node to get started
            </p>
            <button
              onClick={handleAddNode}
              className="flex items-center mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Node
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {userNodes.map((node) => {
              // 중복된 이름이 있는지 확인
              const duplicateNames = userNodes.filter(n => n.name === node.name);
              const isDuplicate = duplicateNames.length > 1;
              
              return (
                <div
                  key={node.id}
                  onClick={() => handleNodeClick(node.id)}
                  className={`rounded-lg border p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group ${
                    isDuplicate 
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600 hover:border-yellow-400 dark:hover:border-yellow-500' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700'
                  }`}
                  title={isDuplicate ? `중복된 이름: "${node.name}" (${duplicateNames.length}개)` : ''}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <Code className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {node.name}
                      </h3>
                      {isDuplicate && (
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                          중복
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => handleExportNode(node.id, node.name, e)}
                        className="text-gray-400 hover:text-blue-500 dark:text-gray-500 dark:hover:text-blue-400 transition-colors"
                        title="Export this node"
                      >
                        <FileDown className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteNode(node.id, node.name, e)}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                        title="Delete this node"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {node.functionDescription || 'No description provided'}
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Function:</span>
                      <span className="ml-1">{node.functionName}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Parameters:</span>
                      <span className="ml-1">{node.parameters.length}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">Last modified:</span>
                      <span className="ml-1">
                        {new Date(node.lastModified).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to view details →
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}
      </div>

      {/* Import 결과 모달 */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Import Results
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
              {importResults.map((result, index) => (
                <div key={index} className={`p-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0 ${
                  result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      result.success ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {result.originalName}
                        {result.finalName !== result.originalName && (
                          <span className="text-sm text-blue-600 dark:text-blue-400 ml-2">
                            → {result.finalName}
                          </span>
                        )}
                      </p>
                      {result.success ? (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Successfully imported
                        </p>
                      ) : (
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Failed: {result.error}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeManagement; 