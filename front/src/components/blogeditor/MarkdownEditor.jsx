import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import '../../styles/blogeditor/MarkdownEditor.css';

const MarkdownEditor = ({ content, onChange }) => {
  const [leftWidth, setLeftWidth] = useState(50); // Percentage
  const containerRef = useRef(null);
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

  // Pre-process content to ensure headers have spaces
  const processedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');

  return (
    <div className="markdown-editor-container" ref={containerRef}>
      <div className="markdown-pane-wrapper" style={{ width: `${leftWidth}%` }}>
        <div className="markdown-pane-header">
          <span>Markdown 编辑</span>
        </div>
        <div className="markdown-input-pane">
          <textarea
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
              rehypePlugins={[rehypeHighlight]}
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
