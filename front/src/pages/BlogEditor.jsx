import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import '@styles/blogeditor/BlogEditor.css';
import '@styles/blogeditor/Outline.css';
import httpClient from '@utils/api/httpClient';
import TipTapEditor from '@components/blogeditor/TipTapEditor';
import MarkdownEditor from '@components/blogeditor/MarkdownEditor';
import { SidebarAccordion, ResourceManager } from '@components/blogeditor/SidebarModules';
import { marked } from 'marked';
import TurndownService from 'turndown';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { BLOG_CATEGORIES } from '@utils/constants';
import resolveUrl from '@utils/resolveUrl';

const turndownService = new TurndownService();

const BlogEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState(null); // 'DRAFT' or 'PUBLISHED'
  const [previewMode, setPreviewMode] = useState(false);
  const [editorMode, setEditorMode] = useState('rich'); // 'rich' or 'markdown'
  const [previewHtml, setPreviewHtml] = useState('');
  const [tags, setTags] = useState([]); // Changed to array
  const [tagInput, setTagInput] = useState(''); // New state for tag input
  const [category, setCategory] = useState('');
  const [directory, setDirectory] = useState('');
  const [existingDirectories, setExistingDirectories] = useState([]); // 用户已有的目录列表
  const [outline, setOutline] = useState([]); // 文章大纲

  const TITLE_MAX = 80;
  const CONTENT_MIN = 10;
  const TAG_MAX_COUNT = 5;

  // 预设分类列表
  const PREDEFINED_CATEGORIES = BLOG_CATEGORIES;

  // Theme and Layout configuration for categories
  const CATEGORY_CONFIG = {
    '技术': {
      color: '#92d2fdff',
      layout: 'tech',
      placeholder: '记录技术沉淀，分享代码智慧...',
      bgImage: 'linear-gradient(120deg, #82c5f2ff 0%, #2da2f0ff 100%)'
    },
    '生活': {
      color: '#b7fdcfff',
      layout: 'moment',
      placeholder: '记录生活点滴，分享美好瞬间...',
      bgImage: 'linear-gradient(120deg, #8ffab5ff 0%, #2cf28cff 100%)'
    },
    '游戏': {
      color: '#a259f0ff',
      layout: 'standard',
      placeholder: '分享游戏攻略，记录高光时刻...',
      bgImage: 'linear-gradient(120deg, #caa2f4ff 0%, #8e65baff 100%)'
    },
    '动漫': {
      color: '#7f32faff',
      layout: 'artistic',
      placeholder: '分享番剧心得，记录二次元感动...',
      bgImage: 'linear-gradient(120deg, #f174bbff 0%, #e3fa63ff 100%)'
    },
    '影视': {
      color: '#f7ae4eff',
      layout: 'standard',
      placeholder: '撰写影评剧评，分享观影感悟...',
      bgImage: 'linear-gradient(120deg, #efc793ff 0%, #e0a159ff 100%)'
    },
    '音乐': {
      color: '#6aebf7ff',
      layout: 'artistic',
      placeholder: '分享动听旋律，记录音乐故事...',
      bgImage: 'linear-gradient(120deg, #66e8f4ff 0%rgba(66, 218, 150, 1)fc 100%)'
    },
    '绘画': {
      color: '#f6ec7fff',
      layout: 'gallery',
      placeholder: '展示绘画作品，分享创作灵感...',
      bgImage: 'linear-gradient(120deg, #f483a2ff 0%, #fd4765ff 100%)'
    },
    '随笔': {
      color: '#f75ea5ff',
      layout: 'paper',
      placeholder: '自由书写，记录此刻思绪...',
      bgImage: 'linear-gradient(120deg, #adc5f7ff 0%, #f8f36bff 100%)'
    },
  };

  // const currentConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['技术'];
  // const currentThemeColor = currentConfig.color;
  // 统一使用技术分类的布局样式（Tech Style），但保留背景色随分类变化
  // const currentLayout = 'tech';

  const titleLen = useMemo(() => (title || '').trim().length, [title]);
  const contentLen = useMemo(() => (content || '').trim().length, [content]);

  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');

  useEffect(() => {
    if (editId && userId) {
      httpClient.get(`/blogpost/${editId}?currentUserId=${userId}`)
        .then(res => {
          if (res.data && res.data.code === 200) {
            const post = res.data.data;
            // Verify ownership
            if (String(post.userId) !== String(userId)) {
              alert('无权编辑此文章');
              navigate('/');
              return;
            }
            setTitle(post.title || '');
            setContent(post.content || '');
            setTags(post.tags || []);
            setCategory(post.categoryName || '');
            setDirectory(post.directory || '');
            if (post.coverImageUrl) {
              setCoverPreview(resolveUrl(post.coverImageUrl));
            }
            // Default to rich editor for existing posts as they are stored as HTML
            setEditorMode('rich');
          }
        })
        .catch(err => {
          console.error(err);
          alert('加载文章失败');
        });
    }
  }, [editId, userId, navigate]);

  // 获取用户已有的目录列表
  useEffect(() => {
    if (userId) {
      fetch(`/api/blogpost/directories?userId=${userId}`)
        .then(r => r.json())
        .then(res => {
          if (res && (res.code === 200 || res.status === 200) && Array.isArray(res.data)) {
            setExistingDirectories(res.data);
          }
        })
        .catch(console.error);
    }
  }, [userId]);

  const handleAddTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    if (tags.length >= TAG_MAX_COUNT) {
      alert(`最多只能添加 ${TAG_MAX_COUNT} 个标签`);
      return;
    }
    if (tags.includes(val)) {
      alert('标签已存在');
      return;
    }
    setTags([...tags, val]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setCover(null);
      setCoverPreview(null);
      return;
    }
    const maxSizeMB = 5;
    const acceptTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!acceptTypes.includes(file.type)) {
      alert('仅支持 PNG/JPEG/WEBP/GIF 图片');
      e.target.value = '';
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`封面大小不能超过 ${maxSizeMB}MB`);
      e.target.value = '';
      return;
    }
    setCover(file);
    setRemoveCover(false);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleSubmit = async (e, status = 'PUBLISHED') => {
    if (e && e.preventDefault) e.preventDefault();
    if (!userId) {
      alert('请先登录！');
      return;
    }
    if (!title.trim()) {
      alert('请输入标题');
      return;
    }
    if (titleLen > TITLE_MAX) {
      alert(`标题请不要超过 ${TITLE_MAX} 个字符`);
      return;
    }
    if (contentLen < CONTENT_MIN) {
      alert(`正文至少需要 ${CONTENT_MIN} 个字符`);
      return;
    }
    setSubmitting(true);
    setSubmitType(status);
    const formData = new FormData();
    formData.append('title', title);

    let finalContent = content;
    if (editorMode === 'markdown') {
      try {
        // Fix headers missing space (e.g. ##Title -> ## Title)
        const fixedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');
        finalContent = await marked.parse(fixedContent);
      } catch (e) {
        console.error('Markdown parsing failed', e);
        alert('Markdown 解析失败');
        setSubmitting(false);
        setSubmitType(null);
        return;
      }
    }
    formData.append('content', finalContent);

    if (!editId) {
      formData.append('userId', userId);
    }
    if (removeCover) formData.append('removeCover', true);
    if (cover) formData.append('cover', cover);

    // Add tags, category, directory, status
    tags.forEach(tag => formData.append('tags', tag));
    if (category) formData.append('categoryName', category);
    if (directory) formData.append('directory', directory);
    formData.append('status', status);

    try {
      const url = editId ? `/blogpost/${editId}/withcover` : '/blogpost/withcover';
      // Use POST for both create and update to avoid issues with multipart/form-data in PUT requests
      const method = 'post';

      const res = await httpClient[method](url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res && (res.status === 200 || res.data?.code === 200)) {
        alert(status === 'PUBLISHED' ? (editId ? '更新成功！' : '发布成功！') : '草稿保存成功！');
        
        if (status === 'PUBLISHED') {
          try {
            localStorage.removeItem('blog.editor.title');
            localStorage.removeItem('blog.editor.content');
            localStorage.removeItem('blog.editor.tags'); // Clear tags
          } catch { /* ignore */ }
          setTitle('');
          setContent('');
          setTags([]);
          setCover(null);
          setCoverPreview(null);
          navigate('/');
        } else {
          // Draft saved
          // Do NOT clear localStorage so user can continue editing without glitch
          // If it's a new draft, navigate to the edit URL to ensure subsequent saves are updates
          if (!editId && res.data.data) {
            // Use replace to avoid history stack buildup
            navigate(`/blog-edit?id=${res.data.data}`, { replace: true });
          }
          // If it's already an editId, stay here.
        }
      } else {
        alert('操作失败');
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    } finally {
      setSubmitting(false);
      setSubmitType(null);
    }
  };

  useEffect(() => {
    const isNew = searchParams.get('new') === 'true';
    if (isNew) {
      try {
        localStorage.removeItem('blog.editor.title');
        localStorage.removeItem('blog.editor.content');
        localStorage.removeItem('blog.editor.tags');
      } catch { /* ignore */ }
      setTitle('');
      setContent('');
      setTags([]);
      setCover(null);
      setCoverPreview(null);
      // Remove param to avoid clearing on refresh if user wants to keep it
      navigate('/blog-edit', { replace: true });
    } else {
      try {
        const t = localStorage.getItem('blog.editor.title');
        const c = localStorage.getItem('blog.editor.content');
        const tg = localStorage.getItem('blog.editor.tags');
        if (t != null) setTitle(t);
        if (c != null) setContent(c);
        if (tg != null) setTags(JSON.parse(tg));
      } catch { /* ignore */ }
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const beforeUnload = (ev) => {
      if (titleLen || contentLen) {
        ev.preventDefault();
        ev.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [titleLen, contentLen]);

  useEffect(() => {
    try { localStorage.setItem('blog.editor.title', title); } catch { /* ignore */ }
  }, [title]);
  useEffect(() => {
    try { localStorage.setItem('blog.editor.content', content); } catch { /* ignore */ }
  }, [content]);
  useEffect(() => {
    try { localStorage.setItem('blog.editor.tags', JSON.stringify(tags)); } catch { /* ignore */ }
  }, [tags]);

  // Apply syntax highlighting in preview mode
  useEffect(() => {
    const updatePreview = async () => {
      if (previewMode) {
        let html = content;
        if (editorMode === 'markdown') {
          try {
            // Fix headers missing space (e.g. ##Title -> ## Title)
            const fixedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');
            html = await marked.parse(fixedContent);
          } catch (e) {
            console.error('Markdown parsing failed', e);
          }
        }
        setPreviewHtml(html);
      }
    };
    updatePreview();
  }, [previewMode, content, editorMode]);

  useEffect(() => {
    if (previewMode && previewHtml) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        document.querySelectorAll('.tiptap-content pre code').forEach((block) => {
          // Check if already highlighted to avoid double highlighting issues if any
          if (!block.dataset.highlighted) {
            hljs.highlightElement(block);
            block.dataset.highlighted = 'yes';
          }
        });
      });
    }
  }, [previewMode, previewHtml]);

  // Generate Outline
  useEffect(() => {
    if (!content) {
      setOutline([]);
      return;
    }

    const generateOutline = () => {
      const newOutline = [];
      if (editorMode === 'rich') {
        // Parse HTML content
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const headers = doc.querySelectorAll('h1, h2, h3');
        headers.forEach((header, index) => {
          newOutline.push({
            level: parseInt(header.tagName.substring(1)),
            text: header.textContent || '',
            index: index
          });
        });
      } else {
        // Parse Markdown content
        // Simple regex to find headers at start of line
        const lines = content.split('\n');
        let headerIndex = 0;
        lines.forEach((line) => {
          const match = line.match(/^(#{1,3})\s+(.*)/);
          if (match) {
            newOutline.push({
              level: match[1].length,
              text: match[2].trim(),
              index: headerIndex++
            });
          }
        });
      }
      setOutline(newOutline);
    };

    // Debounce slightly to avoid too many updates
    const timer = setTimeout(generateOutline, 500);
    return () => clearTimeout(timer);
  }, [content, editorMode]);

  const scrollToHeader = (item) => {
    let container;
    let headers;
    
    if (previewMode) {
       container = document.querySelector('.tiptap-content'); // In preview mode
    } else if (editorMode === 'rich') {
       container = document.querySelector('.ProseMirror'); // TipTap editor content
    } else {
       // Markdown mode - scroll the preview pane if visible, or just do nothing as textarea scrolling is hard
       container = document.querySelector('.markdown-preview-content');
    }

    if (container) {
      headers = container.querySelectorAll('h1, h2, h3');
      if (headers && headers[item.index]) {
        headers[item.index].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const scrollToResource = (res) => {
    let container;
    if (previewMode) {
       container = document.querySelector('.tiptap-content');
    } else if (editorMode === 'rich') {
       container = document.querySelector('.ProseMirror');
    } else {
       container = document.querySelector('.markdown-preview-content');
    }

    if (container) {
      const images = container.querySelectorAll('img, video');
      if (images && images[res.index]) {
        images[res.index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight effect
        images[res.index].style.transition = 'box-shadow 0.3s';
        images[res.index].style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5)';
        setTimeout(() => {
          images[res.index].style.boxShadow = '';
        }, 1500);
      }
    }
  };

  const handleResourceReorder = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    // Simple string replacement strategy
    // We need to find the exact strings in content and swap them
    // Note: This is risky if there are identical tags. We rely on the order.
    
    // Re-find all tags to ensure we have current positions
    let tags = [];
    let match;
    if (editorMode === 'rich') {
      const imgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/g;
      while ((match = imgRegex.exec(content)) !== null) {
        tags.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
    } else {
      // Markdown logic is more complex due to mixed syntax, simplifying to just standard md images for now
      // Or use the same regex as ResourceManager
      const mdImgRegex = /!\[(.*?)\]\((.*?)\)/g;
      while ((match = mdImgRegex.exec(content)) !== null) {
        tags.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
      const htmlImgRegex = /<img\s+[^>]*src="([^"]*)"[^>]*>/g;
      while ((match = htmlImgRegex.exec(content)) !== null) {
         tags.push({ start: match.index, end: match.index + match[0].length, text: match[0] });
      }
      tags.sort((a, b) => a.start - b.start);
    }

    if (!tags[fromIndex] || !tags[toIndex]) return;

    const tagA = tags[fromIndex];
    const tagB = tags[toIndex];

    // Swap logic
    // We need to construct new string carefully
    // Assume fromIndex < toIndex for simplicity in logic, swap if not
    let first = fromIndex < toIndex ? tagA : tagB;
    let second = fromIndex < toIndex ? tagB : tagA;
    
    // If we are swapping, we put second's text in first's place and vice versa
    const newContent = 
      content.substring(0, first.start) + 
      second.text + 
      content.substring(first.end, second.start) + 
      first.text + 
      content.substring(second.end);
      
    setContent(newContent);
  };

  const handleResourceRemove = (resource) => {
    if (!window.confirm('确定要移除这个资源吗？')) return;
    
    const targetStr = content.substring(resource.index, resource.index + resource.fullTag.length);
    if (targetStr === resource.fullTag) {
       const newContent = content.substring(0, resource.index) + content.substring(resource.index + resource.fullTag.length);
       setContent(newContent);
    } else {
       // Fallback if index mismatch
       setContent(content.replace(resource.fullTag, ''));
    }
  };

  const handleDelete = async () => {
    if (!editId) return;
    if (!window.confirm('确定要删除这篇草稿吗？删除后无法恢复，且关联的图片资源也会被清理。')) {
      return;
    }
    try {
      const res = await httpClient.delete(`/blogpost/${editId}?userId=${userId}`);
      if (res && (res.status === 200 || res.data?.code === 200)) {
        alert('删除成功');
        // Clear local storage if it matches
        try {
          localStorage.removeItem('blog.editor.title');
          localStorage.removeItem('blog.editor.content');
          localStorage.removeItem('blog.editor.tags');
        } catch { /* ignore */ }
        navigate('/');
      } else {
        alert('删除失败: ' + (res.data?.message || '未知错误'));
      }
    } catch (e) {
      console.error(e);
      alert('网络错误');
    }
  };

  return (
    <div className="blog-editor-container">
      {/* Top Header: Title & Main Actions */}
      <div className="blog-editor-header">
        <button className="blog-editor-back-btn" onClick={() => navigate('/')} title="返回首页">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>
        
        <input
          type="text"
          className="blog-editor-title-input-inline"
          placeholder="输入文章标题..."
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <div className="blog-editor-header-actions">
           {/* Delete Draft Button */}
           {editId && (
             <button 
               className="blog-editor-btn danger" 
               onClick={handleDelete}
               title="删除草稿"
               style={{ marginRight: '8px', backgroundColor: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}
             >
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
             </button>
           )}

           {/* Mode Switch */}
           <button 
             className={`blog-editor-btn secondary ${editorMode === 'markdown' ? 'active' : ''}`}
             onClick={async () => {
                if (editorMode === 'markdown') {
                  try {
                    const fixedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');
                    const html = await marked.parse(fixedContent);
                    setContent(html);
                  } catch (error) {
                    console.error('Markdown parsing failed', error);
                  }
                  setEditorMode('rich');
                } else {
                  try {
                    const md = turndownService.turndown(content);
                    setContent(md);
                  } catch (error) {
                    console.error('Turndown failed', error);
                  }
                  setEditorMode('markdown');
                }
             }}
             title="切换编辑模式"
           >
             {editorMode === 'markdown' ? '切换富文本' : '切换Markdown'}
           </button>

           {/* Preview Toggle */}
           <button 
             className={`blog-editor-btn secondary ${previewMode ? 'active' : ''}`}
             onClick={() => setPreviewMode(!previewMode)}
           >
             {previewMode ? '编辑' : '预览'}
           </button>

           <div className="divider-vertical" style={{height: '24px', margin: '0 8px', background: '#e2e8f0', width: '1px'}}></div>

           <button 
             className="blog-editor-btn secondary"
             onClick={(e) => handleSubmit(e, 'DRAFT')}
             disabled={submitting || !title.trim()}
           >{submitting && submitType === 'DRAFT' ? '保存中...' : '保存草稿'}
           </button>
           <button 
             className="blog-editor-btn primary"
             onClick={(e) => handleSubmit(e, 'PUBLISHED')}
             disabled={submitting || !title.trim() || contentLen < CONTENT_MIN}
           >
             {submitting && submitType === 'PUBLISHED' ? '发布中...' : '正式发布'}
           </button>
        </div>
      </div>

      {/* Main Layout: Editor + Sidebar */}
      <div className="blog-editor-body">
        {/* Left Sidebar: Outline & Resources */}
        <div className="blog-editor-left-sidebar">
           <SidebarAccordion title="文章大纲" defaultOpen={true} className="flex-module outline-module">
              <div className="sidebar-helper-text outline-list-container">
                 {outline.length > 0 ? (
                   <div className="outline-list">
                     {outline.map((item, idx) => (
                       <div 
                         key={idx} 
                         className={`outline-item level-${item.level}`}
                         onClick={() => scrollToHeader(item)}
                       >
                         {item.text}
                       </div>
                     ))}
                   </div>
                 ) : (
                   <p style={{ color: '#94a3b8', textAlign: 'center', padding: '10px 0' }}>暂无大纲内容</p>
                 )}
              </div>
           </SidebarAccordion>

           <SidebarAccordion title={<span>资源管理 <small style={{fontSize: '11px', color: '#94a3b8', fontWeight: 'normal', marginLeft: '4px'}}>拖动可调整位置</small></span>} defaultOpen={true} className="flex-module resource-module">
              <ResourceManager 
                content={content} 
                editorMode={editorMode} 
                onReorder={handleResourceReorder}
                onItemClick={scrollToResource}
                onRemove={handleResourceRemove}
              />
           </SidebarAccordion>
        </div>

        {/* Center: Editor Area */}
        <div className="blog-editor-content-area">
           {previewMode ? (
             <div className="blog-editor-preview-wrapper">
                <h1 className="preview-title">{title || '无标题'}</h1>
                {coverPreview && <img src={coverPreview} alt="Cover" className="preview-cover" />}
                <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
             </div>
           ) : (
             <div className="editor-wrapper">
                {editorMode === 'rich' ? (
                  <TipTapEditor value={content} onChange={setContent} placeholder={'开始创作…'} userId={userId} />
                ) : (
                  <MarkdownEditor content={content} onChange={setContent} />
                )}
             </div>
           )}
        </div>

        {/* Right Sidebar: Settings */}
        <div className="blog-editor-sidebar">
           {/* Publish Settings Card */}
           <div className="sidebar-card">
              <h3>发布设置</h3>
              <div className="sidebar-form-item">
                <label>分类</label>
                <select 
                  className="blog-editor-select full-width"
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="" disabled>选择分类</option>
                  {PREDEFINED_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="sidebar-form-item">
                <label>目录</label>
                <div className="directory-input-wrapper full-width">
                   <input
                      type="text"
                      placeholder="输入或选择目录"
                      value={directory}
                      onChange={e => setDirectory(e.target.value)}
                      list="directory-options"
                      className="blog-editor-input full-width"
                   />
                   <datalist id="directory-options">
                      {existingDirectories.map((dir, idx) => <option key={idx} value={dir} />)}
                   </datalist>
                </div>
              </div>

              <div className="sidebar-form-item">
                <label>标签</label>
                <div className="tags-input-container full-width">
                    <div className="tags-list">
                      {tags.map(tag => (
                        <span key={tag} className="tag-chip">
                          {tag} <span onClick={() => handleRemoveTag(tag)}>&times;</span>
                        </span>
                      ))}
                    </div>
                    {tags.length < TAG_MAX_COUNT && (
                      <input
                        type="text"
                        placeholder={tags.length === 0 ? "输入标签按回车" : "继续添加..."}
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        className="tag-input-field"
                      />
                    )}
                </div>
              </div>
           </div>

           {/* Cover Card */}
           <div className="sidebar-card">
              <h3>封面</h3>
              <div className="cover-upload-area">
                 {coverPreview ? (
                   <div className="cover-preview-large">
                     <img src={coverPreview} alt="Cover" />
                     <div className="cover-actions">
                        <label className="change-cover-btn">
                           更换
                           <input type="file" accept="image/*" onChange={handleCoverChange} hidden />
                        </label>
                        <button className="remove-cover-btn" onClick={() => {setCover(null); setCoverPreview(null); setRemoveCover(true);}}>移除</button>
                     </div>
                   </div>
                 ) : (
                   <label className="upload-cover-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span>点击上传封面</span>
                      <input type="file" accept="image/*" onChange={handleCoverChange} hidden />
                   </label>
                 )}
              </div>
           </div>

           {/* Info Card */}
           <div className="sidebar-card">
              <h3>文章信息</h3>
              <div className="sidebar-stats">
                 <div className="stat-row">
                    <span>标题字数</span>
                    <span className={titleLen > TITLE_MAX ? 'over-limit' : ''}>{titleLen} / {TITLE_MAX}</span>
                 </div>
                 <div className="stat-row">
                    <span>正文字数</span>
                    <span>{contentLen}</span>
                 </div>
                 <div className="stat-row">
                    <span>预计阅读</span>
                    <span>{Math.ceil(contentLen / 400)} 分钟</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
