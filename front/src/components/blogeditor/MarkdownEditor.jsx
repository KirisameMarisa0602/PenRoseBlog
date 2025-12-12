import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { common } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';
import '../../styles/blogeditor/MarkdownEditor.css';

const MarkdownEditor = ({ content, onChange }) => {
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const containerRef = useRef(null);
  const textareaRef = useRef(null);
  const isDragging = useRef(false);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none'; // Prevent selection while dragging
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Limit the width between 20% and 80%
    if (newLeftWidth >= 20 && newLeftWidth <= 80) {
      setLeftWidth(newLeftWidth);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  };

  const insertText = (prefix, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    onChange(newText);

    // Restore selection/cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  // Pre-process content to ensure headers have spaces
  const processedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');

  return (
    <div className="markdown-editor-container" ref={containerRef}>
      <div className="markdown-pane-wrapper" style={{ width: `${leftWidth}%` }}>
        <div className="markdown-pane-header">
          <span>Markdown 编辑</span>
        </div>
        <div className="markdown-input-pane">
          <div className="markdown-toolbar">
             <button onClick={() => insertText('**', '**')} title="粗体"><b>B</b></button>
             <button onClick={() => insertText('*', '*')} title="斜体"><i>I</i></button>
             <button onClick={() => insertText('~~', '~~')} title="删除线"><s>S</s></button>
             <div className="md-divider"></div>
             <button onClick={() => insertText('# ', '')} title="标题1">H1</button>
             <button onClick={() => insertText('## ', '')} title="标题2">H2</button>
             <button onClick={() => insertText('### ', '')} title="标题3">H3</button>
             <div className="md-divider"></div>
             <button onClick={() => insertText('> ', '')} title="引用">“</button>
             <button onClick={() => insertText('`', '`')} title="代码">{'<>'}</button>
             <button onClick={() => insertText('```\n', '\n```')} title="代码块">Code</button>
             <div className="md-divider"></div>
             <button onClick={() => insertText('- ', '')} title="列表">•</button>
             <button onClick={() => insertText('1. ', '')} title="有序列表">1.</button>
             <div className="md-divider"></div>
             <button onClick={() => insertText('[', '](url)')} title="链接">Link</button>
             <button onClick={() => insertText('![', '](url)')} title="图片">Img</button>
          </div>
          <textarea
            ref={textareaRef}
            className="markdown-textarea"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="在此处粘贴或输入 Markdown 文本..."
          />
        </div>
      </div>
      
      <div className="markdown-splitter" onMouseDown={handleMouseDown}>
        <div className="markdown-splitter-handle" />
      </div>

      <div className="markdown-pane-wrapper" style={{ width: `${100 - leftWidth}%` }}>
        <div className="markdown-pane-header preview-header">
          <span>预览</span>
        </div>
        <div className="markdown-preview-pane">
          <div className="markdown-preview-content">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[[rehypeHighlight, { languages: common }]]}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarkdownEditor;
