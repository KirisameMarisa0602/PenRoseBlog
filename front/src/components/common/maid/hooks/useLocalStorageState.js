import { useCallback, useEffect, useState } from 'react';

export default function useLocalStorageState(key, initialValue, { parse = JSON.parse, serialize = JSON.stringify } = {}) {
  const getInitial = () => {
    if (typeof window === 'undefined') return typeof initialValue === 'function' ? initialValue() : initialValue;
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return typeof initialValue === 'function' ? initialValue() : initialValue;
      try { return parse(raw); } catch { return typeof initialValue === 'function' ? initialValue() : initialValue; }
    } catch {
      return typeof initialValue === 'function' ? initialValue() : initialValue;
    }
  };
  const [value, setValue] = useState(getInitial);

  useEffect(() => {
    try { localStorage.setItem(key, serialize(value)); } catch { /* ignore */ }
  }, [key, value, serialize]);

  const set = useCallback((v) => {
    setValue((prev) => (typeof v === 'function' ? v(prev) : v));
  }, []);

  return [value, set];
}
