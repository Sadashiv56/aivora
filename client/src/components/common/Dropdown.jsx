import { useEffect, useRef, useState } from "react";

export const Dropdown = ({ trigger, children, align = "end", closeOnSelect = true, width }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="dropdown" ref={ref}>
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={`dropdown-menu ${align}`}
          style={width ? { width } : undefined}
          onClick={() => closeOnSelect && setOpen(false)}
        >
          {typeof children === "function" ? children({ close: () => setOpen(false) }) : children}
        </div>
      )}
    </div>
  );
};

export const MenuItem = ({ onClick, danger, children }) => (
  <button
    className={`menu-item ${danger ? "danger" : ""}`}
    onClick={onClick}
  >
    {children}
  </button>
);