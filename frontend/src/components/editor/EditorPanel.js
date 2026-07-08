'use client';
import { useRef, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useTheme } from '@/contexts/ThemeContext';

export default function EditorPanel({
  file,
  onSave,
  onChange,
  socket,
  roomId,
  remoteCursors,
  comments = [],
  onAddCommentClick,
  focusLine
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const isRemoteChange = useRef(false);
  const decorationsRef = useRef([]);
  const commentDecorationsRef = useRef([]);
  const { theme } = useTheme();

  // Use refs so mount-time closures always see current values
  const socketRef = useRef(socket);
  const fileRef = useRef(file);
  const roomIdRef = useRef(roomId);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const onAddCommentClickRef = useRef(onAddCommentClick);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { fileRef.current = file; }, [file]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onAddCommentClickRef.current = onAddCommentClick; }, [onAddCommentClick]);

  // Reveal focusLine when updated
  useEffect(() => {
    if (focusLine && editorRef.current) {
      editorRef.current.revealLineInCenter(focusLine.lineNumber);
      editorRef.current.setPosition({ lineNumber: focusLine.lineNumber, column: 1 });
      editorRef.current.focus();
    }
  }, [focusLine]);

  function handleMount(editor, monaco) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Ctrl+S to save
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSaveRef.current(editor.getValue());
    });

    // Track cursor changes
    editor.onDidChangeCursorPosition((e) => {
      const s = socketRef.current;
      const rid = roomIdRef.current;
      const f = fileRef.current;
      if (s && rid && f) {
        s.emit('cursor-move', {
          fileId: f.id,
          position: { lineNumber: e.position.lineNumber, column: e.position.column },
          selection: editor.getSelection()
        });
      }
    });

    // Track content changes and broadcast
    editor.onDidChangeModelContent((e) => {
      if (isRemoteChange.current) return;
      const content = editor.getValue();
      onChangeRef.current(content);
      const s = socketRef.current;
      const rid = roomIdRef.current;
      const f = fileRef.current;
      if (s && rid && f) {
        s.emit('code-change', {
          fileId: f.id,
          changes: e.changes.map(c => ({
            range: {
              startLineNumber: c.range.startLineNumber,
              startColumn: c.range.startColumn,
              endLineNumber: c.range.endLineNumber,
              endColumn: c.range.endColumn,
            },
            text: c.text,
          })),
          version: editor.getModel().getVersionId()
        });
      }
    });

    // Handle mouse click on line numbers / glyph margin to add comments
    editor.onMouseDown((e) => {
      // Check if clicked the line numbers (line numbers is element type 3) or glyph margin (type 2)
      const targetType = e.target.type;
      if (targetType === 3 || targetType === 2) {
        const line = e.target.position.lineNumber;
        if (onAddCommentClickRef.current) {
          onAddCommentClickRef.current(line);
        }
      }
    });
  }

  // Listen for remote code changes
  useEffect(() => {
    if (!socket) return;

    function handleRemoteChange({ fileId, changes }) {
      if (fileId !== file?.id || !editorRef.current || !monacoRef.current) return;
      isRemoteChange.current = true;
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      const model = editor.getModel();
      if (model && changes) {
        const edits = changes.map(c => ({
          range: new monaco.Range(
            c.range.startLineNumber,
            c.range.startColumn,
            c.range.endLineNumber,
            c.range.endColumn
          ),
          text: c.text
        }));
        model.pushEditOperations([], edits, () => null);
      }
      isRemoteChange.current = false;
    }

    socket.on('code-change', handleRemoteChange);
    return () => socket.off('code-change', handleRemoteChange);
  }, [socket, file?.id]);

  // Render remote cursors
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations = [];
    for (const [cursor] of Object.entries(remoteCursors || {})) {
      if (cursor.fileId !== file?.id) continue;
      newDecorations.push({
        range: new monaco.Range(cursor.position.lineNumber, cursor.position.column, cursor.position.lineNumber, cursor.position.column + 1),
        options: {
          className: `remote-cursor`,
          beforeContentClassName: `remote-cursor-line`,
          hoverMessage: { value: cursor.username },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
        }
      });
    }

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors, file?.id]);

  // Render review comments in glyph margin
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations = (comments || []).map(c => ({
      range: new monaco.Range(c.line_number, 1, c.line_number, 1),
      options: {
        isWholeLine: false,
        glyphMarginClassName: 'comment-glyph',
        glyphMarginHoverMessage: { value: `Review Comment:\n**${c.username}**: ${c.comment}` }
      }
    }));

    commentDecorationsRef.current = editor.deltaDecorations(commentDecorationsRef.current, newDecorations);
  }, [comments, file?.id]);

  return (
    <div className="h-full w-full">
      <Editor
        key={file?.id}
        path={file?.name || 'untitled'}
        height="100%"
        language={file?.language || 'javascript'}
        defaultValue={file?.content || ''}
        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          wordWrap: 'on',
          lineNumbers: 'on',
          glyphMargin: true, // Enable glyph margin for review comment indicators
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 8 },
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          renderLineHighlight: 'line',
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true },
          suggest: { showKeywords: true, showSnippets: true },
          quickSuggestions: true,
          parameterHints: { enabled: true },
          folding: true,
          foldingStrategy: 'indentation',
          links: true,
          colorDecorators: true,
          roundedSelection: false,
        }}
      />
    </div>
  );
}
