import { cn, initials, avatarColor } from "../../utils/format";

export const Avatar = ({ name = "", src, size = 40, online, showOnline = false, style, onClick }) => {
  const show = Boolean(src);
  return (
    <div
      className="avatar-wrap"
      style={{ width: size, height: size, minWidth: size, cursor: onClick ? "pointer" : undefined, ...style }}
      onClick={onClick}
    >
      {show ? (
        <img className="avatar-img" src={src} alt={name} referrerPolicy="no-referrer" />
      ) : (
        <div
          className="avatar-img avatar-fallback"
          style={{ backgroundColor: avatarColor(name) }}
        >
          {initials(name)}
        </div>
      )}
      {showOnline && (
        <span className={cn("online-dot", online ? "online" : "offline")} />
      )}
    </div>
  );
};