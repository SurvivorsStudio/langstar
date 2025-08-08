import React, { useState } from 'react';
import { X, Settings, Code, Play, RefreshCw, Save } from 'lucide-react';
import CodeEditor from '../CodeEditor';
import { useFlowStore } from '../../store/flowStore';

interface NodeCreationProps {
  onSave?: () => void;
}

const NodeCreation: React.FC<NodeCreationProps> = ({ onSave }) => {
  const { addUserNode } = useFlowStore();
  const [activeTab, setActiveTab] = useState<'code' | 'test'>('code');
  const [nodeName, setNodeName] = useState('my_function');
  const [nodeType, setNodeType] = useState('UserNode');
  const [outputVariable, setOutputVariable] = useState('');
  const [streamEnabled, setStreamEnabled] = useState(false);
  const [parameters, setParameters] = useState([
    { name: 'menu_name', inputType: 'select box', required: true, funcArgs: '메뉴 이름', matchData: '' }
  ]);
  const [functionName, setFunctionName] = useState('my_function');
  const [returnType, setReturnType] = useState('str');
  const [functionDescription, setFunctionDescription] = useState('새로운 파이썬 함수');
  const [code, setCode] = useState(`import numpy
import pandas

def my_function(input_data) -> str:
    """새로운 파이썬 함수
    Args:

    Returns:
        str: 새로운 파이썬 함수
    """
    #여기에 함수 로직을 작성하세요
    pass`);

  const addParameter = () => {
    setParameters([...parameters, { name: '', inputType: 'select box', required: false, funcArgs: '', matchData: '' }]);
  };

  const updateParameter = (index: number, field: string, value: string | boolean) => {
    const newParameters = [...parameters];
    newParameters[index] = { ...newParameters[index], [field]: value };
    setParameters(newParameters);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      // UserNode로 저장
      const savedUserNode = await addUserNode({
        name: nodeName,
        type: 'UserNode',
        code: code,
        parameters: parameters,
        functionName: functionName,
        returnType: returnType,
        functionDescription: functionDescription,
      });

      console.log('UserNode 저장 완료:', {
        nodeName,
        nodeType,
        parameters,
        functionName,
        returnType,
        functionDescription,
        code
      });
      
      // 이름이 자동으로 변경된 경우 사용자에게 알림
      if (savedUserNode.name !== nodeName) {
        alert(`${nodeName} 노드가 카탈로그에 추가되었습니다!\n\n참고: 이름이 "${savedUserNode.name}"로 자동 변경되었습니다. (기존에 동일한 이름의 노드가 있었습니다.)`);
      } else {
        alert(`${nodeName} 노드가 카탈로그에 추가되었습니다!`);
      }
      
      onSave?.(); // 저장 후 콜백 호출
    } catch (error) {
      console.error('노드 저장 중 오류:', error);
      alert('노드 저장 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="h-screen flex">
      {/* Node Inspector Panel */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Node Inspector</h2>
          <button className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>
        
                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Node Name
           </label>
                       <input
              type="text"
              value={nodeName}
              onChange={(e) => setNodeName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
         </div>

                 <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
             Node Type
           </label>
           <input
             type="text"
             value={nodeType}
             onChange={(e) => setNodeType(e.target.value)}
             disabled
             className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
           />
         </div>

        

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Parameters</h3>
            <div className="space-y-3">
                             {parameters.map((param, index) => (
                 <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                   <div className="space-y-3">
                     <div className="grid grid-cols-4 gap-2">
                       <input
                         type="text"
                         value={param.name}
                         onChange={(e) => updateParameter(index, 'name', e.target.value)}
                         className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                         placeholder="메뉴 이름"
                       />
                       <input
                         type="text"
                         value={param.funcArgs || ''}
                         onChange={(e) => updateParameter(index, 'funcArgs', e.target.value)}
                         className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                         placeholder="Func Args"
                       />
                       <input
                         type="text"
                         value={param.matchData || ''}
                         onChange={(e) => updateParameter(index, 'matchData', e.target.value)}
                         className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                         placeholder="Match Data"
                       />
                       <div className="flex items-center justify-center">
                         <input
                           type="checkbox"
                           checked={param.required}
                           onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                           className="mr-1"
                         />
                         <span className="text-xs text-gray-600 dark:text-gray-400">필수</span>
                       </div>
                     </div>
                     <div className="flex items-center space-x-2">
                       <select
                         value={param.inputType}
                         onChange={(e) => updateParameter(index, 'inputType', e.target.value)}
                         className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                       >
                         <option value="select box">select box</option>
                         <option value="text box">text box</option>
                       </select>
                       <button
                         onClick={() => removeParameter(index)}
                         className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
                       >
                         삭제
                       </button>
                     </div>
                   </div>
                 </div>
               ))}
              <button
                onClick={addParameter}
                className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
              >
                + 매개변수 추가
              </button>
            </div>
          </div>
        </div>
      </div>

             {/* Code Editor & Test Panel */}
       <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col">
         <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
           <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
             &lt;&gt; 코드 에디터 &amp; 테스트
           </h2>
           <button
             onClick={handleSave}
             className="flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
           >
             <Save className="w-4 h-4 mr-2" />
             저장
           </button>
         </div>

        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'code' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            onClick={() => setActiveTab('code')}
          >
            코드 작성
          </button>
          <button
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'test' 
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            onClick={() => setActiveTab('test')}
          >
            ▷ 테스트 실행
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
                     {activeTab === 'code' && (
             <div className="h-full flex flex-col">

              <div className="flex-1 relative">
                <div className="absolute top-2 right-2 z-10">
                  <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors">
                    코드 재생성
                  </button>
                </div>
                <div className="h-full">
                  <CodeEditor
                    value={code}
                    onChange={setCode}
                    language="python"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'test' && (
            <div className="p-6">
              <div className="text-center py-12">
                <div className="text-gray-400 dark:text-gray-500 mb-4">
                  <Play className="mx-auto h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  테스트 실행 기능
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  코드를 작성한 후 테스트를 실행할 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeCreation; 