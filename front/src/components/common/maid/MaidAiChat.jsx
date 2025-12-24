import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/atom-one-dark.css';
import useAiAssistant from '@contexts/useAiAssistant';

export default function MaidAiChat({ visible }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef(null);
  const ai = useAiAssistant();
  const eventSourceRef = useRef(null);
  const abortRef = useRef(null);
  const hasChunkRef = useRef(false);
  const lastUserRef = useRef('');
  const [copiedMsgIdx, setCopiedMsgIdx] = useState(null);
  // 文件上传相关功能已移除，当前模型不支持文件分析

  async function copyToClipboard(text) {
    const t = String(text ?? '');
    if (!t) return false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(t);
        return true;
      }
    } catch (e) { /* ignore */ void e; }
    try {
      const ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) { /* ignore */ void e; }
    return false;
  }

  function CodeRenderer({ inline, className, children, ...props }) {
    const [copied, setCopied] = useState(false);
    const raw = String(children ?? '').replace(/\n$/, '');
    const match = /language-([a-zA-Z0-9_+-]+)/.exec(className || '');
    const lang = match?.[1] || '';

    if (inline) {
      return (
        <code className={`maid-inline-code ${className || ''}`} {...props}>
          {children}
        </code>
      );
    }

    const doCopy = async () => {
      const ok = await copyToClipboard(raw);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }
    };

    return (
      <div className="maid-codeblock" role="group" aria-label="代码块">
        <div className="maid-codeblock-head">
          <span className="maid-codeblock-lang">{lang || 'code'}</span>
          <button
            type="button"
            className="maid-codeblock-copy"
            title="复制代码"
            aria-label="复制代码"
            onClick={doCopy}
          >
            {copied ? '已复制' : '复制'}
          </button>
        </div>
        <pre className="maid-codeblock-pre">
          <code className={className} {...props}>
            {raw}
          </code>
        </pre>
      </div>
    );
  }

  useEffect(() => {
    if (!visible) return;
    // 恢复历史
    try {
      const raw = localStorage.getItem('maid.ai.messages');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch { /* ignore */ }
    setMessages((m) => {
      if (m.length === 0) return [{ role: 'assistant', text: '你好，我是你的看板娘 AI 助手，有什么可以帮忙的吗？' }];
      return m;
    });
    try {
      const draft = localStorage.getItem('maid.ai.draft');
      if (draft != null) setText(draft);
    } catch { /* ignore */ }
    // 模型选择逻辑已移除，按后端 application.properties 使用默认模型
  }, [visible]);

  useEffect(() => {
    const el = listRef.current; if (!el) return; try { if (typeof el.scrollTop === 'number' && typeof el.scrollHeight === 'number') { el.scrollTop = el.scrollHeight; } else if (typeof el.scrollTo === 'function') { el.scrollTo({ top: el.scrollHeight, behavior: 'auto' }); } } catch (err) { console.warn('MaidAiChat: failed to scroll messages', err); }
  }, [messages]);

  // 持久化消息与草稿
  useEffect(() => {
    try {
      const cap = 200;
      const data = Array.isArray(messages) ? messages.slice(-cap) : [];
      localStorage.setItem('maid.ai.messages', JSON.stringify(data));
    } catch { /* ignore */ }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem('maid.ai.draft', text); } catch { /* ignore */ }
  }, [text]);

  // 已移除模型持久化

  const send = async () => {
    const t = String(text || '').trim(); if (!t) return; setSending(true); setError('');
    setMessages((m) => [...m, { role: 'user', text: t }]); setText('');
    lastUserRef.current = t;
    try {
      if (!ai || (!ai.sendMessage && !ai.sendMessageStream)) {
        // 优先 SSE 流式回退
        if (typeof window !== 'undefined' && 'EventSource' in window) {
          let idx;
          setMessages((m) => { idx = m.length; return [...m, { role: 'assistant', text: '' }]; });
          hasChunkRef.current = false;
          await new Promise((resolve) => {
            try {
              const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
              const tokenParam = token ? `&token=${encodeURIComponent(token)}` : `&token=`;
              const url = `/api/ai/chat/stream?message=${encodeURIComponent(t)}${tokenParam}`;
              const es = new EventSource(url);
              eventSourceRef.current = es;
              es.onmessage = (ev) => {
                const c = String(ev?.data ?? '');
                if (!c) return;
                hasChunkRef.current = true;
                setMessages((m) => {
                  const next = [...m];
                  if (idx == null || idx >= next.length) return next;
                  next[idx] = { ...next[idx], text: (next[idx].text || '') + c };
                  return next;
                });
              };
              es.onerror = () => {
                try { es.close(); } catch (e) { /* ignore */ void e; }
                eventSourceRef.current = null;
                resolve();
              };
            } catch {
              resolve();
            }
          });
          return;
        }
        // 不支持 SSE 时回退到 POST
        const controller = new AbortController();
        abortRef.current = controller;
        const payload = { message: t };
        const url = '/api/ai/chat';
        const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
        if (!res.ok) { const txt = await res.text(); throw new Error(`请求失败 ${res.status}: ${txt}`); }
        const data = await res.json(); const raw = data?.reply ?? data; setMessages((m) => [...m, { role: 'assistant', text: String(raw ?? '') }]);
        return;
      }

      // Prefer streaming if available
      if (ai.sendMessageStream) {
        let idx;
        setMessages((m) => { idx = m.length; return [...m, { role: 'assistant', text: '' }]; });
        const appendChunk = (chunk) => {
          const c = String(chunk || '');
          setMessages((m) => {
            const next = [...m];
            if (idx == null || idx >= next.length) return next;
            next[idx] = { ...next[idx], text: (next[idx].text || '') + c };
            return next;
          });
        };
        try {
          const controller = new AbortController();
          abortRef.current = controller;
          const full = await ai.sendMessageStream(t, { onChunk: appendChunk, signal: controller.signal });
          // ensure final text present (in case onChunk missed anything)
          setMessages((m) => {
            const next = [...m];
            if (idx != null && idx < next.length) next[idx] = { ...next[idx], text: String(full || next[idx].text || '') };
            return next;
          });
          return;
        } catch {
          // streaming path failed, fallback to non-streaming
          const controller = new AbortController();
          abortRef.current = controller;
          const raw = await ai.sendMessage(t, { signal: controller.signal });
          const replyText = normalizeReply(raw);
          setMessages((m) => [...m, { role: 'assistant', text: replyText }]);
          return;
        }
      }

      // Non-streaming path
      const controller = new AbortController();
      abortRef.current = controller;
      // 如果你的 useAiAssistant 支持多模态，可在此处传attachments；目前走后端接口已处理
      const raw = await ai.sendMessage(t, { signal: controller.signal });
      const replyText = normalizeReply(raw);
      setMessages((m) => [...m, { role: 'assistant', text: replyText }]);
    } catch (e) {
      console.error(e); setError(e?.message || '发送失败'); setMessages((m) => [...m, { role: 'assistant', text: '抱歉，出错了：' + (e?.message || '') }]);
    } finally { setSending(false); }
  };

  const cancel = () => {
    try { if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; } } catch { /* ignore */ }
    try { if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; } } catch { /* ignore */ }
    setSending(false);
  };

  const retryLast = () => {
    const t = String(lastUserRef.current || '').trim();
    if (!t) return;
    setText(t);
    void send();
  };

  function normalizeReply(raw) {
    if (raw == null) return '';
    if (typeof raw === 'string') {
      try {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const parsed = JSON.parse(raw);
          return normalizeReply(parsed);
        }
      } catch { /* ignore */ }
      return raw;
    }
    if (typeof raw === 'object') {
      try {
        const choices = raw.choices || raw.result || raw.outputs;
        if (Array.isArray(choices) && choices.length > 0) {
          const first = choices[0];
          if (first?.message?.content) return first.message.content;
          if (first?.text) return first.text;
          if (first?.content) return first.content;
          return JSON.stringify(raw);
        } else if (raw?.message && typeof raw.message === 'string') return raw.message;
        else if (raw?.content && typeof raw.content === 'string') return raw.content;
        return JSON.stringify(raw);
      } catch { return String(raw); }
    }
    return String(raw);
  }

  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } };

  // Quick Actions
  const quickActions = React.useMemo(() => {
    if (ai?.aiContext?.type === 'READING') {
      return [
        { label: '📝 生成大纲', prompt: '请为这篇文章生成一份详细的大纲。' },
        { label: '💡 核心观点', prompt: '这篇文章的核心观点是什么？' },
        { label: '❓ 解释术语', prompt: '请列出并解释这篇文章中的关键专业术语。' },
        { label: '✨ 生成摘要', prompt: '请为这篇文章生成一份简短的摘要。' }
      ];
    } else if (ai?.aiContext?.type === 'EDITING') {
      return [
        { label: '✨ 润色当前段落', prompt: '请帮我润色一下我正在写的这段内容，使其更通顺专业。' },
        { label: '✍️ 续写一段', prompt: '根据我目前写的内容，请帮我续写一段。' },
        { label: '🔨 优化结构', prompt: '请检查我的文章结构，并给出优化建议（如标题层级）。' },
        { label: '📝 生成Markdown示例', prompt: '请给我一个Markdown格式的博客文章示例模板。' }
      ];
    }
    return [];
  }, [ai?.aiContext?.type]);

  const handleQuickAction = (prompt) => {
    setText(prompt);
    // Optional: auto-send
    // setTimeout(() => send(), 0);
  };

  if (!visible) return null;

  return (
    <div className="maid-ai-panel" role="dialog" aria-label="看板娘 AI 助手">
      <div className="maid-ai-header">
        <strong>看板娘 AI 助手</strong>
        {sending && <span className="maid-ai-sending">发送中…</span>}
        {/* 模型选择控件已移除 */}
      </div>
      <div className="maid-ai-messages" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`maid-ai-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
            <div className="maid-ai-msg-actions">
              {m.role === 'assistant' && (
                <button
                  type="button"
                  className="maid-copy-msg-btn"
                  title="复制整段回答"
                  aria-label="复制整段回答"
                  onClick={async () => {
                    const ok = await copyToClipboard(m.text);
                    if (ok) {
                      setCopiedMsgIdx(i);
                      setTimeout(() => setCopiedMsgIdx(null), 1200);
                    }
                  }}
                >
                  <span className="maid-copy-icon" />
                  <span className="maid-copy-text">{copiedMsgIdx === i ? '已复制' : '复制回答'}</span>
                </button>
              )}
            </div>
            <div className="maid-ai-msg-text">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ children }) => <>{children}</>,
                  code: CodeRenderer,
                }}
              >
                {String(m.text || '')}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Chips */}
      {quickActions.length > 0 && (
        <div className="maid-quick-actions" style={{ padding: '8px 12px', display: 'flex', gap: '8px', overflowX: 'auto', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickAction(action.prompt)}
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                color: '#374151',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.target.style.background = '#eef2ff'; e.target.style.borderColor = '#c7d2fe'; }}
              onMouseLeave={e => { e.target.style.background = '#f9fafb'; e.target.style.borderColor = '#e5e7eb'; }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      <div className="maid-ai-input-row">
        <div className="maid-input-wrap">
          <textarea
            className="maid-ai-input"
            placeholder={'向看板娘提问，按 Enter 发送（Shift+Enter 换行）'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            rows={3}
            style={{ resize: 'vertical', minHeight: '64px', maxHeight: '40vh' }}
          />
          <div className="maid-input-actions">
            {sending ? (
              <button className="maid-send-btn" onClick={cancel} title="停止">
                <img src="/icons/maid/stop.svg" alt="停止" className="maid-stop-img" />
              </button>
            ) : (
              <button className="maid-send-btn" onClick={() => void send()} disabled={sending || !text.trim()} title="发送"><span className="maid-send-icon" /></button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <div className="maid-ai-error">
          {error}
          <button className="maid-iconbtn" onClick={retryLast} title="重试">重试</button>
        </div>
      )}
    </div>
  );
}
