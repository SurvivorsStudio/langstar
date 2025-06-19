import React, { useState } from 'react';
import { Save, Play, Undo, Redo, Settings, ArrowLeft, Loader2, FileJson, Copy, X } from 'lucide-react'; // Copy, X 아이콘 추가
import { useNavigate } from 'react-router-dom';
import { useFlowStore } from '../store/flowStore';

import CodeEditor from './CodeEditor'; // CodeEditor 컴포넌트 임포트
const Header: React.FC = () => {
  const navigate = useNavigate();
  const { 
    projectName, 
    setProjectName, 
    runWorkflow, 
    isWorkflowRunning, 
    saveWorkflow, 
    isSaving,
    getWorkflowAsJSONString // 스토어에서 함수 가져오기
  } = useFlowStore(state => ({ 
    projectName: state.projectName, setProjectName: state.setProjectName, runWorkflow: state.runWorkflow, isWorkflowRunning: state.isWorkflowRunning, saveWorkflow: state.saveWorkflow, isSaving: state.isSaving, getWorkflowAsJSONString: state.getWorkflowAsJSONString 
  }));

  const [apiResponseModalContent, setApiResponseModalContent] = useState<string | null>(null);
  const [editableModalContent, setEditableModalContent] = useState<string>('');

  return (
    <header className="bg-white border-b border-gray-200 py-2 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-md bg-blue-500 flex items-center justify-center text-white mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
            </svg>
          </div>
          <div className="relative">
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="font-medium text-gray-800 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 px-2 py-1 rounded"
              placeholder="Untitled Project"
            />
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md">
          <Undo className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md">
          <Redo className="h-4 w-4" />
        </button>
        <button className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md">
          <Settings className="h-4 w-4" />
        </button>
        {/* 워크플로우 JSON 내보내기 버튼 추가 */}
        <button
          onClick={async () => {
            const jsonString = getWorkflowAsJSONString();
            if (jsonString) {
              console.log("Workflow JSON:\n", jsonString);
              try {
                const response = await fetch('http://127.0.0.1:8000/workflow/export/python/langgraph', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: jsonString,
                });

                if (response.ok) {
                  try {
                    const responseData = await response.json();
                    // Check if responseData is an object and has a key (e.g., "python")
                    if (typeof responseData === 'object' && responseData !== null) {
                      const keys = Object.keys(responseData);
                      const extractedContent = (keys.length > 0 && typeof responseData[keys[0]] === 'string')
                        ? responseData[keys[0]]
                        : JSON.stringify(responseData, null, 2);
                      setApiResponseModalContent(extractedContent);
                      setEditableModalContent(extractedContent);
                      } else {
                      const stringContent = String(responseData);
                      setApiResponseModalContent(stringContent);
                      setEditableModalContent(stringContent);
                    }
                  } catch (jsonError) {
                    const textResponse = await response.text();
                    console.log('API call successful, but response was not JSON:', textResponse);
                    setApiResponseModalContent(textResponse);
                    setEditableModalContent(textResponse);
                  }
                } else {
                  const errorData = await response.json().catch(() => ({ message: response.statusText }));
                  alert(`Failed to export workflow JSON. Server responded with: ${errorData.message || response.statusText}`);
                }
              } catch (error) {
                console.error('Header.tsx: Error exporting workflow JSON via API:', error);
                alert(`Failed to export workflow JSON. An error occurred: ${error instanceof Error ? error.message : String(error)}`);
              }
            } else {
              alert('Failed to generate workflow JSON.');
            }
          }}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm"
          title="Export Workflow as Python"
        >
          <FileJson className="h-4 w-4 mr-1" />
          Export Python
        </button>
        <button
          onClick={async () => {
            if (saveWorkflow) {
              try {
                await saveWorkflow();
                alert('Workflow saved successfully!'); // 저장 성공 시 알림창 표시
              } catch (error) {
                console.error('Header.tsx: Error saving workflow:', error);
                alert('Failed to save workflow. Please try again.'); // 저장 실패 시 알림창 표시
                // 여기에 실패 알림을 추가할 수 있습니다.
              }
            } else {
              console.error('Header.tsx: saveWorkflow function is undefined!');
            }
          }}
          disabled={isSaving}
          className="hidden sm:flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => {
            console.log('Header.tsx: Run button clicked!'); // <-- 디버깅 로그 추가
            if (runWorkflow) {
              runWorkflow();
            } else {
              console.error('Header.tsx: runWorkflow function is undefined!');
            }
          }}
          disabled={isWorkflowRunning}
          className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isWorkflowRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-1" /> Run
            </>
          )}
        </button>
      </div>
      {apiResponseModalContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-3 border-b">
              <h3 className="text-lg font-semibold ml-1">API Response</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    if (editableModalContent) { // 복사할 때 editableModalContent 사용
                      try {
                        await navigator.clipboard.writeText(editableModalContent);
                        alert('Code copied to clipboard!');
                      } catch (err) {
                        console.error('Failed to copy code: ', err);
                        alert('Failed to copy code. See console for details.');
                      }
                    }
                  }}
                  className="text-gray-600 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 flex items-center text-sm"
                  title="Copy Code"
                >
                  <Copy size={16} className="mr-1" /> Copy
                </button>
                <button
                  onClick={() => {
                    setApiResponseModalContent(null);
                    setEditableModalContent(''); // 모달 닫을 때 편집된 내용도 초기화
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto">
              {/* CodeEditor를 사용하여 Python 코드 표시 */}
              <div className="h-[60vh] border border-gray-300 rounded-md">
                <CodeEditor
                  value={editableModalContent} // CodeEditor에 editableModalContent 바인딩
                  onChange={setEditableModalContent} // CodeEditor 내용 변경 시 editableModalContent 업데이트
                  language="python"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;