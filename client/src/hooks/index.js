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

export const useVisualViewportHeight = () => {
  const [height, setHeight] = useState(
    typeof window !== "undefined"
      ? Math.round(window.visualViewport?.height || window.innerHeight)
      : 0
  );

  useEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      const next = Math.round(vv ? vv.height : window.innerHeight);
      setHeight((prev) => (prev === next ? prev : next));
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", update);
    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
    }
    update();
    return () => {
      window.removeEventListener("resize", update);
      if (vv) {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      }
    };
  }, []);

  return height;
};