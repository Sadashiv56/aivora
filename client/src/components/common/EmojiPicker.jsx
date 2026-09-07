import { useState } from "react";
import { Smile } from "lucide-react";

const EMOJI_SET = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤪", "😎",
  "🤩", "🥳", "😇", "🙂", "😉", "😌", "😔", "😢", "😭", "😤",
  "😡", "🤯", "😱", "🤔", "🙄", "😴", "🤗", "🤭", "😏", "🥺",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💕", "💯",
  "🔥", "✨", "🎉", "👍", "👎", "👏", "🙏", "💪", "🤞", "✌️",
  "👌", "🤝", "🫶", "🎁", "🎂", "🌹", "⚡", "🌈", "🌸", "🍕",
];

export const EmojiPicker = ({ onSelect, trigger }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="icon-btn emoji-toggle"
        onClick={() => setOpen((o) => !o)}
        title="Emoji"
        type="button"
      >
        {trigger || <Smile size={22} />}
      </button>
      {open && (
        <div className="emoji-picker" onClick={(e) => e.stopPropagation()}>
          <div className="emoji-grid">
            {EMOJI_SET.map((e) => (
              <button
                key={e}
                className="emoji-cell"
                onClick={() => {
                  onSelect(e);
                  setOpen(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};