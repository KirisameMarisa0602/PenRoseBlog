import React, { useState, useEffect } from 'react';
import '@styles/blogeditor/SidebarModules.css';

export const SidebarAccordion = ({ title, children, defaultOpen = true, className = '' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`sidebar-module ${className} ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-module-header" onClick={() => setIsOpen(!isOpen)}>
        <h3>{title}</h3>
        <span className="toggle-icon">
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>
      {isOpen && <div className="sidebar-module-content">{children}</div>}
    </div>
  );
};

export const ResourceManager = ({ content, editorMode, onReorder, onItemClick }) => {
  const [resources, setResources] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    if (!content) {
      setResources([]);
      return;
    }

    const extracted = [];
    let match;
    
    if (editorMode === 'rich') {
      // HTML Mode: Match <img> and <video> tags
      // Simple regex for demo. Note: This might be fragile with complex attributes.
      const imgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/g;
      while ((match = imgRegex.exec(content)) !== null) {
        extracted.push({
          type: 'image',
          src: match[1],
          fullTag: match[0],
          index: match.index,
          id: `img-${match.index}`
        });
      }
      // Add video support if needed
    } else {
      // Markdown Mode: Match ![]() and <img />
      const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
      while ((match = mdImgRegex.exec(content)) !== null) {
        extracted.push({
          type: 'image',
          src: match[2], // URL is in the second capturing group
          alt: match[1],
          fullTag: match[0],
          index: match.index,
          id: `md-img-${match.index}`
        });
      }
      
      // Also match HTML img tags in Markdown
      const htmlImgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/g;
      while ((match = htmlImgRegex.exec(content)) !== null) {
         // Avoid duplicates if md regex already caught it (unlikely for standard md syntax)
         extracted.push({
            type: 'image',
            src: match[1],
            fullTag: match[0],
            index: match.index,
            id: `html-img-${match.index}`
         });
      }
    }

    // Sort by index to ensure order matches document order
    extracted.sort((a, b) => a.index - b.index);
    
    // Assign a sequential index for reordering logic
    const indexedResources = extracted.map((item, idx) => ({ ...item, listIndex: idx }));
    setResources(indexedResources);
  }, [content, editorMode]);

  const handleDragStart = (e, index) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = "move";
    // Set a transparent drag image or custom one if needed
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === targetIndex) return;
    
    onReorder(draggedItem, targetIndex, resources);
    setDraggedItem(null);
  };

  if (resources.length === 0) {
    return <div className="empty-resource-tip">暂无图片/视频资源</div>;
  }

  return (
    <div className="resource-list">
      {resources.map((res, idx) => (
        <div 
          key={res.id} 
          className="resource-item"
          draggable
          onDragStart={(e) => handleDragStart(e, idx)}
          onDragOver={(e) => handleDragOver(e, idx)}
          onDrop={(e) => handleDrop(e, idx)}
          onClick={() => onItemClick && onItemClick(res)}
          title="拖动调整位置，点击跳转"
        >
          <div className="resource-drag-handle">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          </div>
          <div className="resource-thumbnail">
            <img src={res.src} alt="resource" />
          </div>
          <div className="resource-info">
            <span className="resource-type">{res.type === 'image' ? '图片' : '视频'}</span>
            <span className="resource-index">#{idx + 1}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
