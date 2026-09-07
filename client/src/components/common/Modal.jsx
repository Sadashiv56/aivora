import { X } from "lucide-react";
import { useClickOutside } from "../../hooks";

export const Modal = ({ open, onClose, title, children, width = 520 }) => {
  const ref = useClickOutside(onClose);
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal" ref={ref} style={{ maxWidth: width }}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};