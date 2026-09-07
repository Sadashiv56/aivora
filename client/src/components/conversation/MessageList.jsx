import { useEffect, useRef, useMemo, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { Spinner } from "../common/Spinner";
import { useChat } from "../../context/ChatContext";
import { isSameDay, isSameMessageGroup, formatDateLabel } from "../../utils/format";
import { ArrowDown } from "lucide-react";

const DateDivider = ({ date }) => (
  <div className="date-divider">
    <span className="date-divider-label">{formatDateLabel(date)}</span>
  </div>
);

export const MessageList = ({ conversationId, onAction }) => {
  const { messages, loadMessages, hasMore, nextCursor, loadingMessages, typing, activeId } = useChat();
  const listRef = useRef(null);
  const endRef = useRef(null);
  const didInit = useRef(false);
  const shouldStick = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const chat = useChat();

  const listRaw = messages[conversationId] || [];

  const list = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (let i = listRaw.length - 1; i >= 0; i--) {
      const m = listRaw[i];
      if (m && m.id && !seen.has(m.id)) {
        seen.add(m.id);
        out.push(m);
      }
    }
    return out.reverse();
  }, [listRaw]);

  const lastMessageId = list.length ? list[list.length - 1].id : null;

  const scrollToBottom = (behavior = "auto") => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  };

  // Scroll-to-bottom via the sentinel element, run on the next paint so the
  // latest message is actually rendered in the DOM before we scroll.
  const scrollEndIntoView = () => {
    requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  };

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  useEffect(() => {
    if (!didInit.current && conversationId) {
      didInit.current = true;
      chat.openConversation(conversationId);
    }
  }, [conversationId]);

  // When the conversation is (re)opened, mark that we want to land at the
  // bottom as soon as its messages render (covers the page-refresh race where
  // the history loads asynchronously after mount).
  useEffect(() => {
    if (conversationId !== activeId) return;
    shouldStick.current = true;
  }, [conversationId, activeId]);

  // Core scroll policy:
  //  - After an async history load / open completes, force to the bottom.
  //  - On new or replaced messages, stick to the bottom only if the user is
  //    already near it; otherwise just reveal the "scroll down" button.
  // Note: we early-return while the list is empty so `shouldStick` survives the
  // spinner-only render and is consumed only once actual messages render.
  useEffect(() => {
    if (!list.length) return;
    if (shouldStick.current || isNearBottom()) {
      shouldStick.current = false;
      setShowScrollDown(false);
      scrollEndIntoView();
    } else if (list.length) {
      setShowScrollDown(true);
    }
  }, [list.length, lastMessageId, loadingMessages]);

  useEffect(() => {
    if (isNearBottom()) scrollEndIntoView();
  }, [typing]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    setShowScrollDown(!isNearBottom());
    if (el.scrollTop < 80 && hasMore[conversationId] && nextCursor[conversationId] && !loadingMessages) {
      const prevHeight = el.scrollHeight;
      const prevTop = el.scrollTop;
      loadMessages(conversationId, { before: nextCursor[conversationId] }).then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight + prevTop;
        });
      });
    }
  };

  const typingList = typing[conversationId] || {};
  const typingNames = Object.values(typingList);

  return (
    <div className="message-area">
      <div className="messages-scroll" ref={listRef} onScroll={onScroll}>
        <div className="messages-padding-top" />
        {loadingMessages && !list.length ? <Spinner /> : null}
        {hasMore[conversationId] && (
          <button className="load-more" onClick={() => loadMessages(conversationId, { before: nextCursor[conversationId] })}>
            Load older messages
          </button>
        )}
        {list.map((m, i) => {
          const prev = i > 0 ? list[i - 1] : null;
          const next = i < list.length - 1 ? list[i + 1] : null;
          const showDate = !prev || !isSameDay(prev.createdAt, m.createdAt);
          const isFirstInGroup = !prev || prev.senderId !== m.senderId || !isSameMessageGroup(m, prev) || showDate;
          const isLastInGroup = !next || next.senderId !== m.senderId || !isSameMessageGroup(next, m) || !isSameDay(m.createdAt, next.createdAt);
          const showSender = isFirstInGroup;

          return (
            <div key={m.id}>
              {showDate && <DateDivider date={m.createdAt} />}
              <MessageBubble
                m={m}
                showSender={showSender}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                onReply={(msg, action, extra) => onAction({ message: msg, action, extra })}
              />
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="msg-row theirs group-first group-last">
            <div className="avatar-spacer" />
            <div className="bubble theirs">
              <div className="typing-indicator">
                {typingNames[0]} is typing…
                <span className="typing-dots">
                  <i /><i /><i />
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="messages-padding-bottom" />
        <div ref={endRef} />
      </div>

      {showScrollDown && (
        <button className="scroll-to-bottom" onClick={() => { scrollToBottom("smooth"); setShowScrollDown(false); }}>
          <ArrowDown size={20} />
        </button>
      )}
    </div>
  );
};
