import React from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  onCursorPositionChange?: (position: number) => void;
  onMount?: (editor: any) => void;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = 'python',
  onCursorPositionChange,
  onMount,
  readOnly = false
}) => {
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleEditorDidMount = (editor: any) => {
    if (onCursorPositionChange) {
      editor.onDidChangeCursorPosition((e: any) => {
        const position = editor.getModel().getOffsetAt(e.position);
        onCursorPositionChange(position);
      });
    }
    
    if (onMount) {
      onMount(editor);
    }
  };

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage={language}
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 13,
          lineNumbers: 'on',
          tabSize: 4,
          insertSpaces: true,
          automaticLayout: true,
          readOnly: readOnly,
        }}
        key={`${language}-${readOnly}`} // 언어나 읽기 전용 상태가 변경될 때 에디터 재생성
      />
    </div>
  );
};

export default CodeEditor;