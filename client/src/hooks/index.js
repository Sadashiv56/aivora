import { useEffect, useRef, useState } from "react";

export const useDebouncedValue = (value, delay = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

export const useClickOutside = (onOutside) => {
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside?.();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
};

export const usePresenceTimer = () => {
  const ref = useRef({});
  const debounce = (key, fn, delay = 1200) => {
    clearTimeout(ref.current[key]);
    ref.current[key] = setTimeout(fn, delay);
  };
  const flush = (key) => {
    clearTimeout(ref.current[key]);
  };
  return { debounce, flush };
};

export const usePrevious = (value) => {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};