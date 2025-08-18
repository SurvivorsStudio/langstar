import React, { useState, useRef } from 'react';
import { 
  importWorkflowOnly
} from '../../utils/exportImport';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



     const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (file) {
       setSelectedFile(file);
       setMessage(null); // 이전 메시지 초기화
     }
   };

        const handleImport = async () => {
     if (!selectedFile) {
       setMessage({ type: 'error', text: 'Please select a file.' });
       return;
     }

     setIsLoading(true);
     setMessage(null);

     try {
       // 간단한 워크플로우 import 사용
       const result = await importWorkflowOnly(selectedFile);
       
       if (result.success) {
         setMessage({ type: 'success', text: result.message });
         onImportSuccess?.();
         // 파일 선택 초기화
         setSelectedFile(null);
         if (fileInputRef.current) {
           fileInputRef.current.value = '';
         }
       } else {
         setMessage({ type: 'error', text: result.message });
       }
     } catch (error) {
       setMessage({ type: 'error', text: 'An error occurred during import.' });
     } finally {
       setIsLoading(false);
     }
   };

   const handleClose = () => {
     // 모든 상태 초기화
     setSelectedFile(null);
     setMessage(null);
     setIsLoading(false);
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
     onClose();
   };

     const handleFileSelect = () => {
     fileInputRef.current?.click();
     setMessage(null); // 파일 선택 버튼 클릭 시에도 메시지 초기화
   };

  if (!isOpen) return null;

     return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
                          <div className="flex justify-between items-center mb-4">
           <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Import Chatflow</h2>
           <button
             onClick={handleClose}
             className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
           >
             ✕
           </button>
         </div>

                 {/* 메시지 표시 */}
         {message && (
           <div className={`mb-4 p-3 rounded-lg border ${
             message.type === 'success' 
               ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700' 
               : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700'
           }`}>
             {message.text}
           </div>
         )}

                          {/* Important Notes */}
         <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
           <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center">
             <span className="mr-2">⚠️</span>
             Important Notes
           </h4>
           <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
             <li>• Existing data will be overwritten if there are conflicts.</li>
             <li>• Please backup important data before importing.</li>
             <li>• Only valid Chatflow JSON files can be imported.</li>
           </ul>
         </div>

         {/* Import Section */}
         <div className="space-y-4">
           <div>
             <h3 className="font-medium mb-2 text-gray-900 dark:text-gray-100">Import Chatflow File</h3>
             <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
               Select a JSON file to import workflows.
             </p>
             <input
               ref={fileInputRef}
               type="file"
               accept=".json"
               onChange={handleFileChange}
               className="hidden"
             />
                            <div className="space-y-3">
                 <button
                   onClick={handleFileSelect}
                   disabled={isLoading}
                   className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                 >
                   Select File
                 </button>
                 {selectedFile && (
                   <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                     <span className="font-medium">Selected file:</span> {selectedFile.name}
                   </div>
                 )}
                 <button
                   onClick={handleImport}
                   disabled={isLoading || !selectedFile}
                   className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                 >
                   {isLoading ? 'Importing...' : 'Import'}
                 </button>
               </div>
           </div>
         </div>

                 {/* 하단 버튼 */}
         <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
           <button
             onClick={handleClose}
             className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
           >
             Close
           </button>
         </div>
      </div>
    </div>
  );
};

export default ImportExportModal;
