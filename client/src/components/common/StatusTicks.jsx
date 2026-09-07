import { Check, CheckCheck } from "lucide-react";

export const StatusTicks = ({ status }) => {
  if (status === "read") return <CheckCheck size={16} className="tick tick-read" />;
  if (status === "delivered") return <CheckCheck size={16} className="tick" />;
  return <Check size={16} className="tick" />;
};

export const StatusText = ({ msg, currentUserId }) => {
  if (!msg || msg.senderId !== currentUserId) return null;
  const ids = msg.readBy?.filter((id) => id !== currentUserId);
  if (ids?.length) return <CheckCheck size={16} className="tick tick-read" />;
  const delivered = msg.deliveredTo?.filter((id) => id !== currentUserId);
  if (delivered?.length) return <CheckCheck size={16} className="tick" />;
  return <Check size={16} className="tick" />;
};
