import {
  useState,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "../firebase";
import { format } from "date-fns";
import { clsx } from "clsx";

interface Props {
  currentUser: string;
}

interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
  reactions?: Record<string, string>;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const MAX_CHARS = 500;
const LONG_PRESS_MS = 450;

export default function GroupChat({ currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const [activeReactMenuId, setActiveReactMenuId] = useState<string | null>(
    null
  );
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [showPinnedView, setShowPinnedView] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  const longPressTimeoutRef = useRef<number | null>(null);

  // 1. Listen for messages
  useEffect(() => {
    const messagesRef = ref(db, "messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messageList = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        setMessages(messageList);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Smart scroll
  useEffect(() => {
    if (shouldAutoScroll && !showPinnedView) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldAutoScroll, showPinnedView]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShouldAutoScroll(isNearBottom);
  };

  // 3. Long-press handlers (for mobile)
  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handlePointerDownOnMessage =
    (msgId: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
      // Mouse uses hover; touch/pen uses long press
      if (e.pointerType === "mouse") return;

      clearLongPressTimer();
      longPressTimeoutRef.current = window.setTimeout(() => {
        setActiveActionId(msgId);
      }, LONG_PRESS_MS);
    };

  const handlePointerUpOnMessage = () => {
    clearLongPressTimer();
  };

  const handlePointerLeaveOnMessage = () => {
    clearLongPressTimer();
  };

  // 4. Send message
  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const payload: any = {
      sender: currentUser,
      text: newMessage,
      timestamp: Date.now(),
    };

    if (replyingTo) {
      payload.replyTo = {
        id: replyingTo.id,
        sender: replyingTo.sender,
        text:
          replyingTo.text.substring(0, 120) +
          (replyingTo.text.length > 120 ? "..." : ""),
      };
    }

    push(ref(db, "messages"), payload);
    setNewMessage("");
    setReplyingTo(null);
    setShouldAutoScroll(true);
    setActiveActionId(null);
  };

  // 5. Actions
  const toggleReaction = (msgId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const currentReaction = msg.reactions?.[currentUser];

    if (currentReaction === emoji) {
      remove(ref(db, `messages/${msgId}/reactions/${currentUser}`));
    } else {
      update(ref(db, `messages/${msgId}/reactions`), {
        [currentUser]: emoji,
      });
    }
    setActiveReactMenuId(null);
  };

  const togglePin = (msg: Message) => {
    update(ref(db, `messages/${msg.id}`), { isPinned: !msg.isPinned });
    setActiveActionId(null);
  };

  const getGroupedReactions = (reactions: Record<string, string>) => {
    const groups: Record<string, string[]> = {};
    Object.entries(reactions).forEach(([user, emoji]) => {
      if (!groups[emoji]) groups[emoji] = [];
      groups[emoji].push(user);
    });
    return Object.entries(groups);
  };

  const pinnedMessages = messages.filter((m) => m.isPinned);

  // 6. Render helper
  const renderMessage = (
    msg: Message,
    opts?: {
      isPinnedView?: boolean;
      isFirstInGroup?: boolean;
      isLastInGroup?: boolean;
    }
  ) => {
    const { isPinnedView = false, isLastInGroup = true } =
      opts || {};

    const isMe = msg.sender === currentUser;
    const groupedReactions = msg.reactions ? getGroupedReactions(msg.reactions) : [];

    // Name + avatar should sit with the LAST message in a streak, or in pinned view
    const showSenderLabel = !isMe && (isPinnedView || isLastInGroup);
    const showAvatar = !isMe && (isPinnedView || isLastInGroup);

    // Only last message in a streak shows time (or pinned view)
    const showTimestamp = isPinnedView || isLastInGroup;

    const outerMarginClass = isLastInGroup ? "mb-5" : "mb-1";

    return (
      <div
        key={msg.id}
        className={clsx(
          "group flex flex-col relative",
          isMe ? "items-end" : "items-start",
          outerMarginClass
        )}
        onPointerDown={handlePointerDownOnMessage(msg.id)}
        onPointerUp={handlePointerUpOnMessage}
        onPointerLeave={handlePointerLeaveOnMessage}
        onPointerCancel={handlePointerLeaveOnMessage}
      >
        {showSenderLabel && (
          <span className="text-[10px] text-gray-400 ml-9 mb-1">{msg.sender}</span>
        )}

        <div
          className={clsx(
            "flex items-end gap-2 max-w-[80%]",
            isMe ? "justify-end" : ""
          )}
        >
          {/* Avatar on the left side only for non-me messages */}
          {!isMe && (
            <div
              className={clsx(
                "shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold mb-1",
                isPinnedView ? "bg-slate-200 text-slate-500" : "",
                !showAvatar && !isPinnedView && "opacity-0"
              )}
            >
              {showAvatar ? msg.sender[0] : ""}
            </div>
          )}

          {/* Wrapper: content-based width */}
          <div className={clsx("flex flex-col relative w-fit max-w-full")}>
            {/* Bubble */}
            <div
              className={clsx(
                "px-4 py-2 text-sm shadow-sm break-words relative",
                isMe
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-200 text-gray-700",
                isMe ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm",
                msg.isPinned && "ring-2 ring-yellow-400 ring-offset-1"
              )}
            >
              {/* Reply preview (Messenger-style nested bubble) */}
              {msg.replyTo && (
                <div
                  className={clsx(
                    "mb-2 px-3 py-1 rounded-2xl text-[11px] leading-snug truncate",
                    isMe
                      ? "bg-white/20 text-blue-50"
                      : "bg-gray-100 text-gray-600"
                  )}
                >
                  <span className="block text-[10px] opacity-80 mb-0.5">
                    Replying to <b>{msg.replyTo.sender}</b>
                  </span>
                  <span className="block truncate">{msg.replyTo.text}</span>
                </div>
              )}

              <span>{msg.text}</span>

              {/* Reactions summary below bubble */}
              {groupedReactions.length > 0 && (
                <div className="absolute -bottom-3 right-0 flex bg-white rounded-full shadow-sm border border-gray-100 px-1 py-0.5 scale-90 gap-1 z-10">
                  {groupedReactions.map(([emoji, users]) => (
                    <div
                      key={emoji}
                      title={`Reacted by: ${users.join(", ")}`}
                      className="flex items-center gap-0.5 cursor-help"
                    >
                      <span className="text-[10px]">{emoji}</span>
                      {users.length > 1 && (
                        <span className="text-[9px] text-gray-500 font-bold">
                          {users.length}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action bar (Reply / React / Pin) */}
            {!isPinnedView && (
              <div
                className={clsx(
                  "absolute transition-opacity flex gap-1 bg-white shadow-md rounded-full p-1 z-20 border border-gray-100",
                  "-top-8",
                  isMe ? "right-0" : "left-0",
                  activeActionId === msg.id
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <button
                  onClick={() => {
                    setReplyingTo(msg);
                    setActiveActionId(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full text-xs"
                  title="Reply"
                >
                  ↩️
                </button>
                <button
                  onClick={() => {
                    setActiveReactMenuId(msg.id);
                    setActiveActionId(null);
                  }}
                  className="p-1 hover:bg-gray-100 rounded-full text-xs"
                  title="React"
                >
                  😀
                </button>
                <button
                  onClick={() => togglePin(msg)}
                  className="p-1 hover:bg-gray-100 rounded-full text-xs"
                  title={msg.isPinned ? "Unpin" : "Pin"}
                >
                  {msg.isPinned ? "🚫" : "📌"}
                </button>
              </div>
            )}

            {/* Emoji reaction menu */}
            {activeReactMenuId === msg.id && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setActiveReactMenuId(null)}
                />
                <div
                  className={clsx(
                    "absolute top-full z-50 bg-white shadow-xl rounded-full p-1 flex gap-1 border border-gray-100 animate-in fade-in zoom-in duration-200 mt-2",
                    isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
                  )}
                >
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => toggleReaction(msg.id, emoji)}
                      className="hover:scale-125 transition-transform p-1 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {showTimestamp && (
          <span className="text-[9px] text-gray-300 mt-1 px-1">
            {format(msg.timestamp, "h:mm a")}
          </span>
        )}
      </div>
    );
  };

  // 7. Render
  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div>
          <h2 className="font-bold text-gray-700">Group Chat</h2>
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedView(true)}
              className="text-[10px] text-blue-500 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              📌 {pinnedMessages.length} pinned (Click to view)
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">{messages.length} msgs</span>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50/50"
      >
        {messages.map((msg, index) => {
          const prev = messages[index - 1];
          const next = messages[index + 1];

          const isPrevSameSender = !!prev && prev.sender === msg.sender;
          const isNextSameSender = !!next && next.sender === msg.sender;

          const isFirstInGroup = !isPrevSameSender;
          const isLastInGroup = !isNextSameSender;

          return renderMessage(msg, {
            isPinnedView: false,
            isFirstInGroup,
            isLastInGroup,
          });
        })}
        <div ref={bottomRef} />
      </div>

      {showPinnedView && (
        <div className="absolute inset-0 z-50 bg-slate-50/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
            <h3 className="font-bold text-gray-800">📌 Pinned Messages</h3>
            <button
              onClick={() => setShowPinnedView(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕ Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pinnedMessages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-10">
                No pinned messages yet.
              </p>
            ) : (
              pinnedMessages.map((msg) => (
                <div key={msg.id} className="relative group">
                  {renderMessage(msg, {
                    isPinnedView: true,
                    isFirstInGroup: true,
                    isLastInGroup: true,
                  })}
                  <button
                    onClick={() => togglePin(msg)}
                    className="absolute top-2 right-2 text-xs bg-white border border-gray-200 px-2 py-1 rounded-full shadow-sm text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Unpin 🚫
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 shrink-0">
          <span className="truncate max-w-[80%]">
            Replying to <b>{replyingTo.sender}</b>: {replyingTo.text}
          </span>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-red-500 font-bold hover:bg-red-50 rounded p-1"
          >
            ✕
          </button>
        </div>
      )}

      <form
        onSubmit={sendMessage}
        className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0"
      >
        <div className="relative flex-1">
          <input
            type="text"
            value={newMessage}
            maxLength={MAX_CHARS}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
          />
          <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">
            {newMessage.length}/{MAX_CHARS}
          </span>
        </div>
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="bg-blue-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 transition-all shadow-md"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
