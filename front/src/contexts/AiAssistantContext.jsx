import React, { useCallback, useMemo, useState } from 'react';
import AiAssistantContext from './aiContextCore';
import httpClient from '@utils/api/httpClient';

export function AiAssistantProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiContext, setAiContext] = useState({ type: 'GLOBAL', id: null, content: null });

  const sendMessage = useCallback(async (message, { model } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await httpClient.post('/ai/chat', model ? { message, model } : { message });
      const data = res?.data ?? null;
      return data?.reply ?? data;
    } catch (e) {
      setError(e?.message || String(e));
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessageStream = useCallback(async (message, { onChunk, firstChunkTimeoutMs = 20000, model, signal, contextType, contextId, contextContent } = {}) => {
    setLoading(true);
    setError(null);
    let firstTimer;
    let acc = '';
    const append = (val) => {
      const s = typeof val === 'string' ? val : (val == null ? '' : JSON.stringify(val));
      if (!s) return;
      acc += s;
      if (onChunk) { try { onChunk(s); } catch { /* ignore */ } }
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      };
      let tokenVal = null;
      try {
        tokenVal = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        if (tokenVal) headers['Authorization'] = `Bearer ${tokenVal}`;
      } catch { /* ignore */ }

      const body = {
        message,
        model,
        contextType: contextType || aiContext.type,
        contextId: contextId || aiContext.id,
        contextContent: contextContent || (typeof aiContext.getContent === 'function' ? aiContext.getContent() : aiContext.content)
      };

      // Use the new POST streaming endpoint
      const res = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEventData = null;

      if (firstChunkTimeoutMs > 0) {
        firstTimer = setTimeout(() => { try { reader.cancel(); } catch { /* ignore */ } }, firstChunkTimeoutMs);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (firstTimer) { clearTimeout(firstTimer); firstTimer = null; }

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.substring(5);
            if (currentEventData === null) {
              currentEventData = data;
            } else {
              currentEventData += "\n" + data;
            }
          } else if (line.trim() === '') {
            if (currentEventData !== null) {
              if (currentEventData.trim() === '[DONE]') return acc;
              append(currentEventData);
              currentEventData = null;
            }
          }
        }
      }
      return acc;
    } catch (e) {
      // If we have some content, return it instead of failing or retrying
      if (acc && acc.length > 0) {
        return acc;
      }

      // Fallback to non-streaming if streaming fails
      try {
        const full = await sendMessage(message, { model });
        append(full);
        return acc;
      } catch {
        setError(e?.message || String(e));
        throw e;
      }
    } finally {
      if (firstTimer) clearTimeout(firstTimer);
      setLoading(false);
    }
  }, [sendMessage, aiContext]);

  const summarizeArticle = useCallback((content, options) => {
    const prompt = `请简要总结以下文章的核心内容：\n\n${content}`;
    return sendMessageStream(prompt, options);
  }, [sendMessageStream]);

  const polishText = useCallback((text, options) => {
    const prompt = `请润色以下文本，使其更加专业流畅：\n\n${text}`;
    return sendMessageStream(prompt, options);
  }, [sendMessageStream]);

  const continueWriting = useCallback((text, options) => {
    const prompt = `根据以下上下文，请继续写作：\n\n${text}`;
    return sendMessageStream(prompt, options);
  }, [sendMessageStream]);

  const explainCode = useCallback((code, options) => {
    const prompt = `请解释以下代码的功能和逻辑：\n\n${code}`;
    return sendMessageStream(prompt, options);
  }, [sendMessageStream]);

  const value = useMemo(() => ({
    sendMessage,
    sendMessageStream,
    loading,
    error,
    summarizeArticle,
    polishText,
    continueWriting,
    explainCode,
    aiContext,
    setAiContext
  }), [sendMessage, sendMessageStream, loading, error, summarizeArticle, polishText, continueWriting, explainCode, aiContext]);

  return (
    <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
  );
}

export default AiAssistantProvider;
