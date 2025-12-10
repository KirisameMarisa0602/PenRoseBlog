import React, { useCallback, useMemo, useState } from 'react';
import AiAssistantContext from './aiContextCore';
import httpClient from '@utils/api/httpClient';

export function AiAssistantProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const sendMessageStream = useCallback(async (message, { onChunk, firstChunkTimeoutMs = 20000, model, signal } = {}) => {
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

    // 1) Prefer SSE (GET) first to match backend mapping
    try {
      if (typeof window !== 'undefined' && typeof window.EventSource !== 'undefined') {
        const encoded = encodeURIComponent(String(message ?? ''));
        let url = `/api/ai/chat/stream?message=${encoded}${model ? `&model=${encodeURIComponent(model)}` : ''}`;
        try {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
          if (token) url += `&token=${encodeURIComponent(token)}`;
        } catch { /* ignore */ }
        const es = new EventSource(url);
        // allow external abort to stop SSE immediately
        if (signal && typeof signal.addEventListener === 'function') {
          const onAbort = () => { try { es.close(); } catch { /* ignore */ } };
          signal.addEventListener('abort', onAbort, { once: true });
        }
        const sseResult = await new Promise((resolve, reject) => {
          let opened = false;
          let timer;
          if (firstChunkTimeoutMs > 0) {
            timer = setTimeout(() => {
              try { es.close(); } catch { /* ignore */ }
              reject(new Error('SSE first-chunk timeout'));
            }, firstChunkTimeoutMs);
          }
          es.onopen = () => { opened = true; };
          es.onmessage = (ev) => {
            if (timer) { try { clearTimeout(timer); } catch { /* ignore */ } timer = null; }
            const data = ev?.data;
            if (data === '[DONE]') { try { es.close(); } catch { /* ignore */ } return resolve(acc); }
            append(data);
          };
          es.onerror = () => {
            try { es.close(); } catch { /* ignore */ }
            if (!acc) reject(new Error(opened ? 'SSE error' : 'SSE open failed'));
            else resolve(acc);
          };
        });
        return sseResult;
      }
      throw new Error('SSE not available');
    } catch {
      // 2) Fallback: fetch streaming (GET) to the same endpoint
      try {
        const headers = { 'Accept': 'text/event-stream, text/plain, */*' };
        try {
          const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
          const userId = typeof localStorage !== 'undefined' ? localStorage.getItem('userId') : null;
          if (token) headers['Authorization'] = `Bearer ${token}`;
          if (userId && !isNaN(Number(userId))) headers['X-User-Id'] = Number(userId);
        } catch { /* ignore */ }
        const encoded = encodeURIComponent(String(message ?? ''));
        let url = `/api/ai/chat/stream?message=${encoded}${model ? `&model=${encodeURIComponent(model)}` : ''}`;
        const res = await fetch(url, { method: 'GET', headers, signal });
        const ctype = String(res.headers.get('content-type') || '');
        if (!res.ok) { const txt = await res.text().catch(() => ''); throw new Error(`HTTP ${res.status}: ${txt}`); }
        if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let gotFirst = false;
          if (firstChunkTimeoutMs > 0) {
            firstTimer = setTimeout(() => { try { reader.cancel(); } catch { /* ignore */ } }, firstChunkTimeoutMs);
          }
          // abort support for stream reader
          if (signal && typeof signal.addEventListener === 'function') {
            const onAbort = () => { try { reader.cancel(); } catch { /* ignore */ } };
            signal.addEventListener('abort', onAbort, { once: true });
          }
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const txt = decoder.decode(value, { stream: true });
            if (!gotFirst) { gotFirst = true; try { clearTimeout(firstTimer); } catch { /* ignore */ } }
            if (/^data:/m.test(txt)) {
              const lines = txt.split(/\r?\n/);
              for (const line of lines) {
                if (line.startsWith('data:')) {
                  const d = line.replace(/^data:\s?/, '');
                  if (d === '[DONE]') continue;
                  append(d);
                }
              }
            } else {
              append(txt);
            }
          }
          try { clearTimeout(firstTimer); } catch { /* ignore */ }
          if (acc) return acc;
          const tail = await res.text().catch(() => '');
          if (tail) { append(tail); return acc; }
        } else if (/json/i.test(ctype)) {
          const data = await res.json().catch(() => null);
          append(data?.reply ?? data ?? '');
          return acc;
        }
        // 3) Final fallback: non-streaming
        const full = await sendMessage(message, { model });
        append(full);
        return acc;
      } catch {
        // 3) Final fallback: non-streaming
        try {
          const full = await sendMessage(message, { model });
          append(full);
          return acc;
        } catch (inner) {
          setError(inner?.message || String(inner));
          throw inner;
        }
      }
    } finally {
      setLoading(false);
      try { clearTimeout(firstTimer); } catch { /* ignore */ }
    }
  }, [sendMessage]);

  const value = useMemo(() => ({ sendMessage, sendMessageStream, loading, error }), [sendMessage, sendMessageStream, loading, error]);

  return (
    <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>
  );
}

export default AiAssistantProvider;
