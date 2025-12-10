import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '@styles/blogeditor/BlogEditor.css';
import httpClient from '@utils/api/httpClient';
import TipTapEditor from '@components/blogeditor/TipTapEditor';
import MarkdownEditor from '@components/blogeditor/MarkdownEditor';
import CategoryWheel from '@components/blogeditor/CategoryWheel'; // Import the new component
import { marked } from 'marked';
import TurndownService from 'turndown';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { BLOG_CATEGORIES } from '@utils/constants';

const turndownService = new TurndownService();

const BlogEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cover, setCover] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [editorMode, setEditorMode] = useState('rich'); // 'rich' or 'markdown'
  const [previewHtml, setPreviewHtml] = useState('');
  const [tags, setTags] = useState([]); // Changed to array
  const [tagInput, setTagInput] = useState(''); // New state for tag input
  const [category, setCategory] = useState('');
  const [directory, setDirectory] = useState('');
  const [existingDirectories, setExistingDirectories] = useState([]); // 用户已有的目录列表

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

  const currentConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['技术'];
  const currentThemeColor = currentConfig.color;
  // 统一使用技术分类的布局样式（Tech Style），但保留背景色随分类变化
  const currentLayout = 'tech';

  const titleLen = useMemo(() => (title || '').trim().length, [title]);
  const contentLen = useMemo(() => (content || '').trim().length, [content]);

  const userId = localStorage.getItem('userId');
  const navigate = useNavigate();

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
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setCoverPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setCoverPreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
        return;
      }
    }
    formData.append('content', finalContent);
    
    formData.append('userId', userId);
    if (cover) formData.append('cover', cover);

    // Add tags, category, directory
    tags.forEach(tag => formData.append('tags', tag));
    if (category) formData.append('categoryName', category);
    if (directory) formData.append('directory', directory);

    try {
      const res = await httpClient.post('/blogpost/withcover', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res && (res.status === 200 || res.data?.code === 200)) {
        alert('发布成功！');
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
        alert('发布失败');
      }
    } catch {
      alert('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    try {
      const t = localStorage.getItem('blog.editor.title');
      const c = localStorage.getItem('blog.editor.content');
      const tg = localStorage.getItem('blog.editor.tags');
      if (t != null) setTitle(t);
      if (c != null) setContent(c);
      if (tg != null) setTags(JSON.parse(tg));
    } catch { /* ignore */ }
  }, []);

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
        document.querySelectorAll('.blog-editor-preview-container pre code').forEach((block) => {
          // Check if already highlighted to avoid double highlighting issues if any
          if (!block.dataset.highlighted) {
            hljs.highlightElement(block);
            block.dataset.highlighted = 'yes';
          }
        });
      });
    }
  }, [previewMode, previewHtml]);

  return (
    <div 
      className="blog-editor-container" 
      style={{ 
        background: currentConfig.bgImage || currentThemeColor 
      }}
    >
      <div className={`blog-editor-main layout-${currentLayout}`}>
        {/* Category Wheel Sidebar (Integrated) */}
        <div className="blog-category-sidebar">
          <CategoryWheel 
            categories={PREDEFINED_CATEGORIES}
            selected={category}
            onChange={setCategory}
          />
        </div>

        {/* Header removed - controls moved below */}

        
        {previewMode ? (
          <div className="blog-editor-preview-container" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <button 
                type="button" 
                className="blog-editor-action-btn blog-editor-preview-btn active"
                onClick={() => setPreviewMode(false)}
              >
                返回编辑
              </button>
            </div>
            <h1 style={{ fontSize: '42px', fontWeight: '800', marginBottom: '30px', lineHeight: '1.2' }}>{title || '无标题'}</h1>
            {coverPreview && (
              <div style={{ marginBottom: '30px' }}>
                <img src={coverPreview} alt="封面预览" className="blog-editor-cover-preview" style={{ maxWidth: '100%', borderRadius: '8px' }} />
              </div>
            )}
            <div className="tiptap-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} encType="multipart/form-data" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <input
              type="text"
              placeholder="请输入标题"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="blog-editor-title-input"
            />
            
            {/* 封面上传区域优化 */}
            <div className="blog-editor-cover-wrapper">
              {!coverPreview ? (
                <label className="blog-editor-cover-btn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                  <span>添加封面</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverChange}
                    className="blog-editor-cover-input"
                  />
                </label>
              ) : (
                <div className="blog-editor-cover-preview-container">
                  <img src={coverPreview} alt="封面预览" className="blog-editor-cover-preview" />
                  <button 
                    type="button" 
                    className="blog-editor-cover-remove"
                    onClick={() => {
                      setCover(null);
                      setCoverPreview(null);
                    }}
                    title="移除封面"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}
            </div>

            {/* Meta Info Inputs */}
            <div className="blog-editor-meta-inputs" style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              
              {/* Tag Input Area */}
              <div className="blog-editor-tags-wrapper" style={{ flex: '2 1 300px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', minHeight: '46px', alignSelf: 'center' }}>
                {tags.map(tag => (
                  <span key={tag} className="blog-editor-tag-chip">
                    {tag}
                    <button type="button" onClick={() => handleRemoveTag(tag)}>&times;</button>
                  </span>
                ))}
                {tags.length < TAG_MAX_COUNT && (
                  <div className="blog-editor-tag-input-group">
                    <input
                      type="text"
                      placeholder={tags.length === 0 ? "添加标签 (Enter添加)" : "添加标签"}
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleTagKeyDown}
                      className="blog-editor-tag-input"
                    />
                    <button type="button" onClick={handleAddTag} className="blog-editor-add-tag-btn" disabled={!tagInput.trim()}>
                      +
                    </button>
                  </div>
                )}
              </div>

               <div style={{ flex: '1 1 200px', position: 'relative', alignSelf: 'center' }}>
                 <input
                  type="text"
                  placeholder="目录/文件夹 (可选)"
                  value={directory}
                  onChange={e => setDirectory(e.target.value)}
                  list="directory-options"
                  className="blog-editor-meta-input"
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb', 
                    outline: 'none', 
                    transition: 'border-color 0.2s',
                    color: '#1f2937', /* 显式设置深色文字 */
                    backgroundColor: '#ffffff'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
                <datalist id="directory-options">
                  {existingDirectories.map((dir, idx) => (
                    <option key={idx} value={dir} />
                  ))}
                </datalist>
               </div>
            </div>

            {/* Controls Area (Moved from Header) */}
            <div className="blog-editor-controls-area" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '10px' }}>
                <button
                  type="button"
                  className={`blog-editor-action-btn ${editorMode === 'markdown' ? 'active' : ''}`}
                  onClick={async () => {
                    if (editorMode === 'markdown') {
                       // Markdown -> Rich Text (HTML)
                       try {
                         // Fix headers missing space (e.g. ##Title -> ## Title)
                         const fixedContent = (content || '').replace(/(^|\n)(#{1,6})([^\s#])/g, '$1$2 $3');
                         const html = await marked.parse(fixedContent);
                         setContent(html);
                       } catch(e) { console.error(e); }
                       setEditorMode('rich');
                    } else {
                       // Rich Text (HTML) -> Markdown
                       try {
                         const md = turndownService.turndown(content);
                         setContent(md);
                       } catch(e) { console.error(e); }
                       setEditorMode('markdown');
                    }
                  }}
                >
                  {editorMode === 'rich' ? 'Markdown模式' : '富文本模式'}
                </button>
                <button 
                  type="button" 
                  className={`blog-editor-action-btn blog-editor-preview-btn ${previewMode ? 'active' : ''}`}
                  onClick={() => setPreviewMode(!previewMode)}
                >
                  {previewMode ? '返回编辑' : '预览文章'}
                </button>
            </div>

            <div className="blog-editor-md-row" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
              {editorMode === 'rich' ? (
                <TipTapEditor value={content} onChange={setContent} placeholder={'开始创作…'} userId={userId} />
              ) : (
                <MarkdownEditor content={content} onChange={setContent} />
              )}
              
              {/* Word Count Stats - Floating Bottom Right */}
              <div className="blog-editor-stats-floating" style={{ 
                  position: 'absolute', 
                  bottom: '10px', 
                  right: '20px', 
                  zIndex: 10, 
                  background: 'rgba(255,255,255,0.9)', 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  fontSize: '12px', 
                  color: '#64748b',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  gap: '12px',
                  pointerEvents: 'none',
                  userSelect: 'none'
              }}>
                <span className={titleLen > TITLE_MAX ? 'over-limit' : ''}>标题 {titleLen}/{TITLE_MAX}</span>
                <span>正文 {contentLen} 字</span>
              </div>
            </div>
            
            {/* 底部发布按钮 */}
            <div className="blog-editor-footer">
              <button
                type="button"
                className="blog-editor-action-btn blog-editor-submit-btn large"
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || contentLen < CONTENT_MIN || titleLen > TITLE_MAX}
              >
                {submitting ? '发布中…' : '发布文章'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default BlogEditor;
