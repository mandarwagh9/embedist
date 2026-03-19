import { useRef, useEffect } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import './CodeEditor.css';

interface CodeEditorProps {
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  readOnly?: boolean;
}

export function CodeEditor({ 
  value = '', 
  language = 'cpp', 
  onChange,
  readOnly = false 
}: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const { editor: editorSettings } = useSettingsStore();
  const { setCursorPosition } = useUIStore();

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    editor.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column);
    });

    monaco.editor.defineTheme('embedist-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', foreground: 'FFFFFF', background: '000000' },
        { token: 'comment', foreground: '666666', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'FFFFFF', fontStyle: 'bold' },
        { token: 'string', foreground: 'A0A0A0' },
        { token: 'number', foreground: 'E94560' },
        { token: 'type', foreground: 'FFFFFF' },
        { token: 'function', foreground: 'FFFFFF' },
        { token: 'variable', foreground: 'FFFFFF' },
        { token: 'constant', foreground: 'E94560' },
        { token: 'operator', foreground: 'A0A0A0' },
      ],
      colors: {
        'editor.background': '#000000',
        'editor.foreground': '#FFFFFF',
        'editor.lineHighlightBackground': '#1A1A1A',
        'editor.selectionBackground': '#333333',
        'editor.inactiveSelectionBackground': '#262626',
        'editorCursor.foreground': '#E94560',
        'editorLineNumber.foreground': '#666666',
        'editorLineNumber.activeForeground': '#A0A0A0',
        'editorIndentGuide.background': '#262626',
        'editorIndentGuide.activeBackground': '#404040',
        'editor.selectionHighlightBackground': '#333333',
        'editorWidget.background': '#0D0D0D',
        'editorWidget.border': '#333333',
        'input.background': '#1A1A1A',
        'input.border': '#333333',
        'scrollbar.shadow': '#000000',
        'scrollbarSlider.background': '#33333380',
        'scrollbarSlider.hoverBackground': '#404040',
        'scrollbarSlider.activeBackground': '#666666',
      },
    });
  };

  const handleChange: OnChange = (newValue) => {
    onChange?.(newValue);
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        fontSize: editorSettings.fontSize,
        fontFamily: editorSettings.fontFamily,
        tabSize: editorSettings.tabSize,
        wordWrap: editorSettings.wordWrap ? 'on' : 'off',
        minimap: { enabled: editorSettings.minimap },
      });
    }
  }, [editorSettings]);

  return (
    <div className="code-editor">
      <Editor
        height="100%"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={handleChange}
        theme="embedist-dark"
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          fontSize: editorSettings.fontSize,
          fontFamily: editorSettings.fontFamily,
          fontLigatures: true,
          tabSize: editorSettings.tabSize,
          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
          minimap: { enabled: editorSettings.minimap },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 8 },
          automaticLayout: true,
          bracketPairColorization: { enabled: false },
          guides: {
            bracketPairs: false,
            indentation: true,
          },
        }}
      />
    </div>
  );
}
