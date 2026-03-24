import { useRef, useEffect, useCallback } from 'react';
import type { editor as EditorType } from 'monaco-editor';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUIStore } from '../../stores/uiStore';
import { useMonacoEditor } from './useMonacoEditor';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}

export function CodeEditor({ value, language, onChange, readOnly }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorType.IStandaloneCodeEditor | null>(null);
  const isSettingValueRef = useRef(false);
  const lastKnownValueRef = useRef<string | undefined>(undefined);
  const { editor: editorSettings } = useSettingsStore();
  const { setCursorPosition } = useUIStore();
  const { monaco, isReady, error } = useMonacoEditor();

  const handleEditorMount = useCallback((ed: EditorType.IStandaloneCodeEditor, _m: typeof import('monaco-editor')) => {
    editorRef.current = ed;
    lastKnownValueRef.current = ed.getValue();

    ed.onDidChangeCursorPosition((e) => {
      setCursorPosition(e.position.lineNumber, e.position.column);
    });

    ed.onDidChangeModelContent(() => {
      if (!isSettingValueRef.current) {
        const newValue = ed.getValue();
        lastKnownValueRef.current = newValue;
        onChange(newValue);
      }
    });
  }, [onChange, setCursorPosition]);

  useEffect(() => {
    if (!monaco || !containerRef.current) return;

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

    const ed = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: editorSettings.theme || 'embedist-dark',
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
    });

    handleEditorMount(ed, monaco);

    return () => {
      ed.dispose();
      editorRef.current = null;
    };
  }, [monaco, handleEditorMount]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (isSettingValueRef.current) return;
    const current = lastKnownValueRef.current;
    if (current !== value) {
      isSettingValueRef.current = true;
      ed.setValue(value);
      lastKnownValueRef.current = value;
      isSettingValueRef.current = false;
    }
  }, [value]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed || !monaco) return;
    const model = ed.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language, monaco]);

  useEffect(() => {
    editorRef.current?.updateOptions({ readOnly });
  }, [readOnly]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.updateOptions({
      fontSize: editorSettings.fontSize,
      fontFamily: editorSettings.fontFamily,
      tabSize: editorSettings.tabSize,
      wordWrap: editorSettings.wordWrap ? 'on' : 'off',
      minimap: { enabled: editorSettings.minimap },
    });
  }, [editorSettings]);

  useEffect(() => {
    if (!monaco || !editorRef.current) return;
    monaco.editor.setTheme(editorSettings.theme || 'embedist-dark');
  }, [editorSettings.theme, monaco]);

  if (error) {
    return (
      <div className="editor-error">
        <span>Editor failed to load</span>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="editor-loading">
        <div className="editor-spinner" />
      </div>
    );
  }

  return <div ref={containerRef} className="code-editor" />;
}
