import React, { useEffect, useState, useRef } from 'react';
import { EditorContent, useEditor, BubbleMenu, FloatingMenu } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import Youtube from '@tiptap/extension-youtube';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import Strike from '@tiptap/extension-strike';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';
import '@styles/blogeditor/tiptap/TipTapEditor.css';
import { marked } from 'marked';
import resolveUrl from '@utils/resolveUrl';
import httpClient from '@utils/api/httpClient';
import axios from 'axios';

// 自定义视频扩展
const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'video',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { class: 'video-wrapper', style: 'display: flex; justify-content: center; margin: 1em 0;' },
      ['video', mergeAttributes(HTMLAttributes, {
        controls: true,
        playsinline: true,
        crossorigin: 'anonymous',
        preload: 'metadata',
        style: 'max-width: 100%; height: auto; max-height: 500px; border-radius: 8px;'
      })]
    ]
  },

  addCommands() {
    return {
      setVideo: options => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: options,
        })
      },
    }
  },
});

// 初始化语法高亮
const lowlight = createLowlight(common);

// --- 图标组件 (SVG) ---
const Icons = {
  Markdown: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"></rect><path d="M7 15V9l2 2.5L11 9v6"></path><path d="M14 15l2-2.5 2 2.5"></path><path d="M14 9v6"></path></svg>,
  Bold: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>,
  Italic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>,
  Underline: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path><line x1="4" y1="21" x2="20" y2="21"></line></svg>,
  Strike: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5.8 2.5 2 3.1M3 12h18m-9 0c2 0 6 .5 6 4.5 0 3.5-3.5 4.5-6.5 4.5-3.5 0-5.4-1.3-6.5-3" /></svg>,
  Highlight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11-6 6v3h9l3-3" /><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" /></svg>,
  Subscript: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 5 8 8" /><path d="m12 5-8 8" /><path d="M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07" /></svg>,
  Superscript: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 19 8-8" /><path d="m12 19-8-8" /><path d="M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06" /></svg>,
  H1: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17 12l3-2v8" /></svg>,
  H2: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1" /></svg>,
  H3: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h8" /><path d="M4 18V6" /><path d="M12 18V6" /><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2" /><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2" /></svg>,
  BulletList: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>,
  OrderedList: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="10" y1="6" x2="21" y2="6"></line><line x1="10" y1="12" x2="21" y2="12"></line><line x1="10" y1="18" x2="21" y2="18"></line><path d="M4 6h1v4"></path><path d="M4 10h2"></path><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path></svg>,
  Quote: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path></svg>,
  Code: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>,
  Link: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>,
  Image: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>,
  Video: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>,
  Palette: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" /><circle cx="17.5" cy="10.5" r=".5" /><circle cx="8.5" cy="7.5" r=".5" /><circle cx="6.5" cy="12.5" r=".5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></svg>,
  AlignLeft: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="14" x2="3" y2="14"></line><line x1="15" y1="18" x2="3" y2="18"></line></svg>,
  AlignCenter: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="17" y1="14" x2="7" y2="14"></line><line x1="17" y1="18" x2="7" y2="18"></line></svg>,
  AlignRight: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"></line><line x1="21" y1="6" x2="3" y2="6"></line><line x1="21" y1="14" x2="9" y2="14"></line><line x1="21" y1="18" x2="9" y2="18"></line></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>,
  Undo: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>,
  Redo: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"></path><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 3.7"></path></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
};

// Image compression helper
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          resolve(new File([blob], file.name, { type: file.type, lastModified: Date.now() }));
        }, file.type, quality);
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

// --- 简单的模态框组件 ---
const MediaModal = ({ isOpen, onClose, onSubmit, title, placeholder, userId }) => {
  const [url, setUrl] = useState('');
  const [activeTab, setActiveTab] = useState('link'); // 'link' | 'upload'
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setActiveTab('link');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [isOpen]);

  const handleFileUpload = async (e) => {
    let file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Compress image if it's an image and larger than 1MB
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        try {
          file = await compressImage(file);
        } catch (err) {
          console.warn('Image compression failed, using original file', err);
        }
      }

      // 判断是否为视频或大文件 (> 10MB)
      const isVideo = file.type.startsWith('video/');
      const isLargeFile = file.size > 10 * 1024 * 1024;

      if (isVideo || isLargeFile) {
        // --- 大文件/视频：使用后端预签名 URL 直传（避免 STS/分片依赖） ---
        // 后端会做视频 VIP 校验（/blogpost/presigned-url）
        try {
          const presignRes = await httpClient.get('/blogpost/presigned-url', {
            params: { fileName: file.name, userId }
          });

          if (!presignRes?.data || presignRes.data.code !== 200) {
            alert(presignRes?.data?.message || '获取上传地址失败');
            setUploading(false);
            return;
          }

          const { uploadUrl, publicUrl } = presignRes.data.data || {};
          if (!uploadUrl || !publicUrl) {
            alert('上传地址返回不完整');
            setUploading(false);
            return;
          }

          await axios.put(uploadUrl, file, {
            headers: {
              'Content-Type': file.type || 'application/octet-stream'
            },
            timeout: 600000,
            onUploadProgress: (progressEvent) => {
              if (!progressEvent.total) return;
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          });

          const finalUrl = resolveUrl(publicUrl);
          onSubmit(finalUrl);
          onClose();
          setUploading(false);
        } catch (err) {
          console.error('预签名直传失败', err);
          alert('上传出错: ' + (err?.message || '未知错误'));
          setUploading(false);
        }

      } else {
        // --- 小文件/图片：走后端代理 ---
        const formData = new FormData();
        formData.append('file', file);
        if (userId) {
          formData.append('userId', userId);
        }

        const res = await httpClient.post('/blogpost/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 600000, // 10分钟超时
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        });
        if (res.data.code === 200) {
          const finalUrl = resolveUrl(res.data.data);
          onSubmit(finalUrl);
          onClose();
        } else {
          alert(res.data.message || '上传失败');
        }
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传出错，请重试: ' + (error.message || '未知错误'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const isMedia = title === '插入图片' || title === '插入视频';

  return (
    <div className="tt-modal-overlay" onClick={onClose}>
      <div className="tt-modal" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>

        {isMedia && (
          <div className="tt-modal-tabs" style={{ marginBottom: '15px', borderBottom: '1px solid #eee', display: 'flex', gap: '10px' }}>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'link' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'link' ? '#3b82f6' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === 'link' ? 'bold' : 'normal'
              }}
              onClick={() => setActiveTab('link')}
            >
              网络链接
            </button>
            <button
              type="button"
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === 'upload' ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === 'upload' ? '#3b82f6' : '#666',
                cursor: 'pointer',
                fontWeight: activeTab === 'upload' ? 'bold' : 'normal'
              }}
              onClick={() => setActiveTab('upload')}
            >
              本地上传
            </button>
          </div>
        )}

        {(!isMedia || activeTab === 'link') && (
          <>
            {title === '插入 Markdown' ? (
              <textarea
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={placeholder}
                autoFocus
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '16px',
                  resize: 'vertical',
                  fontFamily: 'monospace'
                }}
              />
            ) : (
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder={placeholder}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    onSubmit(url);
                    onClose();
                  }
                }}
              />
            )}
            <div className="tt-modal-actions">
              <button type="button" onClick={onClose}>取消</button>
              <button type="button" className="primary" onClick={() => { onSubmit(url); onClose(); }}>确认</button>
            </div>
          </>
        )}

        {isMedia && activeTab === 'upload' && (
          <div className="tt-upload-area" style={{ textAlign: 'center', padding: '20px' }}>
            <input
              type="file"
              ref={fileInputRef}
              accept={title === '插入图片' ? "image/*" : "video/*"}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="tt-file-upload"
              disabled={uploading}
            />
            <label
              htmlFor="tt-file-upload"
              style={{
                display: 'inline-block',
                padding: '20px',
                backgroundColor: '#f3f4f6',
                border: '1px dashed #ccc',
                borderRadius: '8px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                width: '100%',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ position: 'relative', zIndex: 1 }}>
                {uploading ? `正在上传... ${uploadProgress}%` : '点击选择文件上传'}
              </div>
              {uploading && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    backgroundColor: '#3b82f6',
                    width: `${uploadProgress}%`,
                    transition: 'width 0.2s ease'
                  }}
                />
              )}
            </label>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
              支持 {title === '插入图片' ? 'JPG, PNG, GIF' : 'MP4, WebM'} 格式
            </div>
            <div className="tt-modal-actions" style={{ marginTop: '15px' }}>
              <button type="button" onClick={onClose} disabled={uploading}>取消</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
import { useAiAssistant } from '@contexts/useAiAssistant';

export default function TipTapEditor({ value, onChange, placeholder = '开始创作…', userId }) {
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFontPicker, setShowFontPicker] = useState(false);
  const colorPickerRef = useRef(null);
  const fontPickerRef = useRef(null);

  // AI Assistant
  const { polishText, continueWriting } = useAiAssistant();
  const [aiProcessing, setAiProcessing] = useState(false);

  const handleAiPolish = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, ' ');
    if (!text) {
      alert('请先选择需要润色的文本');
      return;
    }

    setAiProcessing(true);
    try {
      let polished = '';
      await polishText(text, {
        onChunk: (chunk) => { polished += chunk; }
      });
      if (polished) {
        editor.chain().focus().insertContentAt({ from, to }, polished).run();
      }
    } catch (e) {
      console.error(e);
      alert('AI 润色失败');
    } finally {
      setAiProcessing(false);
    }
  };

  const handleAiContinue = async () => {
    if (!editor) return;
    const { to } = editor.state.selection;
    const from = Math.max(0, to - 1000);
    const context = editor.state.doc.textBetween(from, to, ' ');

    setAiProcessing(true);
    try {
      let generated = '';
      await continueWriting(context, {
        onChunk: (chunk) => { generated += chunk; }
      });
      if (generated) {
        editor.chain().focus().insertContent(generated).run();
      }
    } catch (e) {
      console.error(e);
      alert('AI 续写失败');
    } finally {
      setAiProcessing(false);
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
        codeBlock: false, // 使用 lowlight 的代码高亮
        heading: false, // 使用自定义的标题配置（1-3级）
        strike: false, // 使用单独的删除线扩展
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      Underline,
      Strike,
      Subscript,
      Superscript,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Link.configure({
        autolink: true,
        openOnClick: false, // 编辑时点击不跳转
        linkOnPaste: true,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Youtube.configure({
        controls: false,
      }),
      Video,
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap-content',
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      if (typeof onChange === 'function') onChange(html);
    },
  });

  // Click outside handler for color picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false);
      }
      if (fontPickerRef.current && !fontPickerRef.current.contains(event.target)) {
        setShowFontPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = String(value || '');
    // 避免光标跳动，只有内容真正改变且不聚焦时才强制更新，或者简单判断内容不一致
    // 这里为了简单，如果内容差异很大才更新，实际生产中可能需要更复杂的 diff
    if (current !== next && !editor.isFocused) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor]);

  // Add copy buttons to code blocks
  // useEffect(() => {
  //   if (!editor) return;

  //   const addCopyButtons = () => {
  //     const codeBlocks = document.querySelectorAll('.tiptap-content pre');
  //     codeBlocks.forEach((block) => {
  //       // Check if copy button already exists
  //       if (block.querySelector('.code-copy-btn')) return;

  //       const copyBtn = document.createElement('button');
  //       copyBtn.className = 'code-copy-btn';
  //       copyBtn.type = 'button';
  //       copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>复制</span>';
  //       copyBtn.title = '复制代码';

  //       copyBtn.addEventListener('click', () => {
  //         const code = block.querySelector('code')?.textContent || '';
  //         navigator.clipboard.writeText(code).then(() => {
  //           copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span>已复制</span>';
  //           copyBtn.classList.add('copied');
  //           setTimeout(() => {
  //             copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg><span>复制</span>';
  //             copyBtn.classList.remove('copied');
  //           }, 2000);
  //         });
  //       });

  //       block.style.position = 'relative';
  //       block.appendChild(copyBtn);
  //     });
  //   };

  //   // Add copy buttons initially
  //   addCopyButtons();

  //   // Use MutationObserver to watch for new code blocks
  //   const editorElement = document.querySelector('.tiptap-content');
  //   if (!editorElement) return;

  //   const observer = new MutationObserver(() => {
  //     addCopyButtons();
  //   });

  //   observer.observe(editorElement, {
  //     childList: true,
  //     subtree: true,
  //   });

  //   return () => observer.disconnect();
  // }, [editor]);

  const openModal = (type) => {
    setModalConfig({ isOpen: true, type });
  };

  const handleModalSubmit = (url) => {
    if (!url || !editor) return;

    switch (modalConfig.type) {
      case 'link':
        // 如果是空字符串，移除链接
        if (url === '') {
          editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }
        break;
      case 'image':
        editor.chain().focus().setImage({ src: url }).run();
        break;
      case 'video':
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          editor.chain().focus().setYoutubeVideo({ src: url }).run();
        } else {
          editor.chain().focus().setVideo({ src: url }).run();
        }
        break;
      case 'markdown':
        // 将 Markdown 转换为 HTML 并插入
        try {
          const html = marked.parse(url); // 这里 url 实际上是用户输入的 markdown 文本
          editor.chain().focus().insertContent(html).run();
        } catch (e) {
          console.error('Markdown parsing failed:', e);
          alert('Markdown 解析失败');
        }
        break;
      default:
        break;
    }
  };

  if (!editor) return null;

  const colors = ['#000000', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
  const highlightColors = ['#fef3c7', '#fecaca', '#fed7aa', '#d9f99d', '#bbf7d0', '#bfdbfe', '#ddd6fe', '#fbcfe8'];
  const fonts = [
    { label: '默认', value: '' },
    { label: '宋体', value: 'SimSun, serif' },
    { label: '黑体', value: 'SimHei, sans-serif' },
    { label: '微软雅黑', value: 'Microsoft YaHei, sans-serif' },
    { label: '楷体', value: 'KaiTi, serif' },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Times New Roman', value: 'Times New Roman, serif' },
    { label: 'Courier New', value: 'Courier New, monospace' },
    { label: 'Georgia', value: 'Georgia, serif' },
  ];

  return (
    <div className="tiptap-editor">
      {/* 增强的工具栏 */}
      <div className="tiptap-toolbar">
        {/* AI Tools */}
        <div className="tt-toolbar-group">
          <button
            type="button"
            className={`tt-btn ai-btn ${aiProcessing ? 'processing' : ''}`}
            onClick={handleAiPolish}
            title="AI 润色选中文字"
            disabled={aiProcessing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <span style={{ fontSize: '12px', marginLeft: '4px' }}>润色</span>
          </button>
          <button
            type="button"
            className={`tt-btn ai-btn ${aiProcessing ? 'processing' : ''}`}
            onClick={handleAiContinue}
            title="AI 续写"
            disabled={aiProcessing}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
            </svg>
            <span style={{ fontSize: '12px', marginLeft: '4px' }}>续写</span>
          </button>
        </div>

        {/* 历史操作 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="撤销"><Icons.Undo /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做"><Icons.Redo /></button>
        </div>

        {/* 字体选择 */}
        <div className="tt-toolbar-group" ref={fontPickerRef}>
          <div className="tt-dropdown">
            <button
              type="button"
              className="tt-btn tt-font-btn"
              onClick={() => setShowFontPicker(!showFontPicker)}
              title="字体"
            >
              字体
            </button>
            {showFontPicker && (
              <div className="tt-dropdown-menu">
                {fonts.map((font) => (
                  <button
                    key={font.value}
                    type="button"
                    onClick={() => {
                      if (font.value) {
                        editor.chain().focus().setFontFamily(font.value).run();
                      } else {
                        editor.chain().focus().unsetFontFamily().run();
                      }
                      setShowFontPicker(false);
                    }}
                    className={editor.isActive('textStyle', { fontFamily: font.value }) ? 'is-active' : ''}
                    style={{ fontFamily: font.value || 'inherit' }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 文本样式 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive('bold')} title="加粗"><Icons.Bold /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleItalic().run()} aria-pressed={editor.isActive('italic')} title="斜体"><Icons.Italic /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleUnderline().run()} aria-pressed={editor.isActive('underline')} title="下划线"><Icons.Underline /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleStrike().run()} aria-pressed={editor.isActive('strike')} title="删除线"><Icons.Strike /></button>
        </div>

        {/* 颜色和高亮 */}
        <div className="tt-toolbar-group" ref={colorPickerRef}>
          <div className="tt-dropdown">
            <button
              type="button"
              className="tt-btn"
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="文字颜色"
            >
              <Icons.Palette />
            </button>
            {showColorPicker && (
              <div className="tt-color-picker">
                <div className="tt-color-section">
                  <label>文字颜色</label>
                  <div className="tt-color-grid">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="tt-color-btn"
                        style={{ backgroundColor: color }}
                        onClick={() => editor.chain().focus().setColor(color).run()}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      className="tt-color-btn tt-color-clear"
                      onClick={() => editor.chain().focus().unsetColor().run()}
                      title="清除颜色"
                    >×</button>
                  </div>
                </div>
                <div className="tt-color-section">
                  <label>高亮颜色</label>
                  <div className="tt-color-grid">
                    {highlightColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="tt-color-btn"
                        style={{ backgroundColor: color }}
                        onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                        title={color}
                      />
                    ))}
                    <button
                      type="button"
                      className="tt-color-btn tt-color-clear"
                      onClick={() => editor.chain().focus().unsetHighlight().run()}
                      title="清除高亮"
                    >×</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()} aria-pressed={editor.isActive('highlight')} title="高亮"><Icons.Highlight /></button>
        </div>

        {/* 上下标 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleSubscript().run()} aria-pressed={editor.isActive('subscript')} title="下标"><Icons.Subscript /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleSuperscript().run()} aria-pressed={editor.isActive('superscript')} title="上标"><Icons.Superscript /></button>
        </div>

        {/* 标题 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-pressed={editor.isActive('heading', { level: 1 })} title="标题 1"><Icons.H1 /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-pressed={editor.isActive('heading', { level: 2 })} title="标题 2"><Icons.H2 /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} aria-pressed={editor.isActive('heading', { level: 3 })} title="标题 3"><Icons.H3 /></button>
        </div>

        {/* 列表 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleBulletList().run()} aria-pressed={editor.isActive('bulletList')} title="无序列表"><Icons.BulletList /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleOrderedList().run()} aria-pressed={editor.isActive('orderedList')} title="有序列表"><Icons.OrderedList /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleBlockquote().run()} aria-pressed={editor.isActive('blockquote')} title="引用"><Icons.Quote /></button>
        </div>

        {/* 对齐 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().setTextAlign('left').run()} aria-pressed={editor.isActive({ textAlign: 'left' })} title="左对齐"><Icons.AlignLeft /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().setTextAlign('center').run()} aria-pressed={editor.isActive({ textAlign: 'center' })} title="居中对齐"><Icons.AlignCenter /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().setTextAlign('right').run()} aria-pressed={editor.isActive({ textAlign: 'right' })} title="右对齐"><Icons.AlignRight /></button>
        </div>

        {/* 媒体和代码 */}
        <div className="tt-toolbar-group">
          <button type="button" className="tt-btn" onClick={() => openModal('image')} title="插入图片"><Icons.Image /></button>
          <button type="button" className="tt-btn" onClick={() => openModal('video')} title="插入视频"><Icons.Video /></button>
          <button type="button" className="tt-btn" onClick={() => openModal('markdown')} title="插入 Markdown"><Icons.Markdown /></button>
          <button type="button" className="tt-btn" onClick={() => editor.chain().focus().toggleCodeBlock().run()} aria-pressed={editor.isActive('codeBlock')} title="代码块"><Icons.Code /></button>
          <button type="button" className="tt-btn" onClick={() => openModal('link')} aria-pressed={editor.isActive('link')} title="插入链接"><Icons.Link /></button>
        </div>
      </div>

      {/* 气泡菜单 - 选中文字时出现 */}
      {editor && (
        <BubbleMenu className="tt-bubble-menu" tippyOptions={{ duration: 100 }} editor={editor}>
          <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'is-active' : ''} title="加粗"><Icons.Bold /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'is-active' : ''} title="斜体"><Icons.Italic /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'is-active' : ''} title="下划线"><Icons.Underline /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive('strike') ? 'is-active' : ''} title="删除线"><Icons.Strike /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef3c7' }).run()} className={editor.isActive('highlight') ? 'is-active' : ''} title="高亮"><Icons.Highlight /></button>
          <button type="button" onClick={() => openModal('link')} className={editor.isActive('link') ? 'is-active' : ''} title="链接"><Icons.Link /></button>
        </BubbleMenu>
      )}

      {/* 浮动菜单 - 空行时出现 */}
      {editor && (
        <FloatingMenu className="tt-floating-menu" tippyOptions={{ duration: 100 }} editor={editor}>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''} title="大标题"><Icons.H1 /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''} title="中标题"><Icons.H2 /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive('bulletList') ? 'is-active' : ''} title="无序列表"><Icons.BulletList /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive('orderedList') ? 'is-active' : ''} title="有序列表"><Icons.OrderedList /></button>
          <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive('blockquote') ? 'is-active' : ''} title="引用"><Icons.Quote /></button>
          <button type="button" onClick={() => openModal('image')} title="图片"><Icons.Image /></button>
        </FloatingMenu>
      )}

      <div className="tiptap-wrap">
        <EditorContent editor={editor} />
      </div>

      <MediaModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        onSubmit={handleModalSubmit}
        userId={userId}
        title={
          modalConfig.type === 'link' ? '添加链接' :
            modalConfig.type === 'image' ? '插入图片' :
              modalConfig.type === 'video' ? '插入视频' :
                '插入 Markdown'
        }
        placeholder={
          modalConfig.type === 'link' ? 'https://example.com' :
            modalConfig.type === 'image' ? '图片url' :
              modalConfig.type === 'video' ? '视频url' :
                '在此粘贴 Markdown 文本...'
        }
      />
    </div>
  );
}
