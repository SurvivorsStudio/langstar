import React, { useRef } from 'react';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  onCursorChange?: (position: { line: number; ch: number }) => void;
  setCursorPosition?: (setFn: (position: { line: number; ch: number }) => void) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ 
  value, 
  onChange, 
  language = 'python',
  onCursorChange,
  setCursorPosition
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    // 커서 위치 변경 이벤트 리스너
    if (onCursorChange) {
      editor.onDidChangeCursorPosition((e: editor.ICursorPositionChangedEvent) => {
        onCursorChange({
          line: e.position.lineNumber - 1, // Monaco는 1-based, 우리는 0-based 사용
          ch: e.position.column - 1
        });
      });
    }

    // 커서 위치 설정 함수 제공
    if (setCursorPosition) {
      setCursorPosition((position: { line: number; ch: number }) => {
        if (editorRef.current) {
          editorRef.current.setPosition({
            lineNumber: position.line + 1, // Monaco는 1-based
            column: position.ch + 1
          });
          editorRef.current.focus();
        }
      });
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
        }}
      />
    </div>
  );
};

export default CodeEditor;