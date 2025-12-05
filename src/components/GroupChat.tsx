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
  userAvatars: Record<string, string>;
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

// Updated Emoji Set
const EMOJIS = ["👍", "❤️", "😆", "😮", "😢", "😡"];
const MAX_CHARS = 500;
const LONG_PRESS_MS = 450;

// Reusable Grey Pin Icon for consistency
const PinIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="17" x2="12" y2="22"/>
    <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
  </svg>
);

const UnpinIcon = ({ className }: { className?: string }) => (
  <svg 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M12 17v5" />
    <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h9" />
    <path d="M15 4h-3c-.6 0-1.1.2-1.5.6" />
  </svg>
);

export default function GroupChat({ currentUser, userAvatars }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  const [activeReactMenuId, setActiveReactMenuId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [showPinnedView, setShowPinnedView] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Interaction Refs
  const longPressTimeoutRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);

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

  // 3. Long-press handlers
  const clearLongPressTimer = () => {
    if (longPressTimeoutRef.current !== null) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handlePointerDownOnMessage =
    (msgId: string) => (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType === "mouse") return; // Mouse uses hover

      clearLongPressTimer();
      longPressTimeoutRef.current = window.setTimeout(() => {
        setActiveActionId(msgId);
        // Important: When the timer fires (menu opens), we flag to ignore 
        // the immediate "click" that happens when the user lifts their finger.
        skipNextClickRef.current = true;
        // Reset the flag after a short delay so normal clicks work again
        setTimeout(() => { skipNextClickRef.current = false; }, 400);
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
    closeAllMenus();
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
    closeAllMenus();
  };

  const togglePin = (msg: Message) => {
    update(ref(db, `messages/${msg.id}`), { isPinned: !msg.isPinned });
    closeAllMenus();
  };

  const closeAllMenus = () => {
    // If the long-press just fired, ignore the backdrop click
    if (skipNextClickRef.current) return;
    
    setActiveActionId(null);
    setActiveReactMenuId(null);
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
    const { isPinnedView = false, isLastInGroup = true } = opts || {};

    const isMe = msg.sender === currentUser;
    const groupedReactions = msg.reactions ? getGroupedReactions(msg.reactions) : [];
    const showAvatar = !isMe && (isPinnedView || isLastInGroup);
    const showTimestamp = isPinnedView || isLastInGroup;
    const outerMarginClass = isLastInGroup ? "mb-5" : "mb-1";
    const isActionOpen = activeActionId === msg.id;

    return (
      <div
        key={msg.id}
        className={clsx(
          "group flex flex-col relative select-none", 
          isMe ? "items-end" : "items-start",
          outerMarginClass
        )}
        onPointerDown={handlePointerDownOnMessage(msg.id)}
        onPointerUp={handlePointerUpOnMessage}
        onPointerLeave={handlePointerLeaveOnMessage}
        onPointerCancel={handlePointerLeaveOnMessage}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div
          className={clsx(
            "flex items-end gap-2 max-w-[85%]",
            isMe ? "justify-end" : ""
          )}
        >
          {/* Avatar Area */}
          {!isMe && (
            <div
              className={clsx(
                "shrink-0 w-10 h-10 rounded-full flex items-center justify-center mb-1 border-2 border-white shadow-sm overflow-hidden bg-gray-100",
                !showAvatar && !isPinnedView && "opacity-0"
              )}
            >
              {showAvatar || isPinnedView ? (
                 userAvatars[msg.sender] ? (
                   <img src={userAvatars[msg.sender]} alt={msg.sender} className="w-full h-full object-cover" />
                 ) : (
                   <span className="text-[10px] font-bold text-gray-500">{msg.sender[0]}</span>
                 )
              ) : ""}
            </div>
          )}

          {/* Wrapper */}
          <div className={clsx("flex flex-col relative w-fit max-w-full")}>
            
            {/* Message Bubble */}
            <div
              className={clsx(
                "px-4 py-2 text-sm shadow-sm break-words relative transition-all duration-200",
                isMe
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-gray-200 text-gray-700",
                isMe ? "rounded-2xl rounded-br-sm" : "rounded-2xl rounded-bl-sm",
                // Show yellow ring if pinned
                msg.isPinned && "ring-2 ring-yellow-400 ring-offset-1",
                // Show blue ring if menu open
                isActionOpen && "ring-2 ring-blue-300 ring-offset-1 scale-[1.02]"
              )}
            >
              {/* Reply preview */}
              {msg.replyTo && (
                <div
                  className={clsx(
                    "mb-2 px-3 py-1.5 rounded-xl text-[11px] leading-snug truncate border-l-2",
                    isMe
                      ? "bg-white/20 text-blue-50 border-white/40"
                      : "bg-gray-100 text-gray-600 border-gray-300"
                  )}
                >
                  <span className="block text-[10px] font-bold opacity-90 mb-0.5">
                     {msg.replyTo.sender}
                  </span>
                  <span className="block truncate opacity-80">{msg.replyTo.text}</span>
                </div>
              )}

              <span className="leading-relaxed">{msg.text}</span>

              {/* Reactions */}
              {groupedReactions.length > 0 && (
                <div className={clsx(
                  "absolute -bottom-3 flex bg-white rounded-full shadow-md border border-gray-100 px-1.5 py-0.5 scale-90 gap-1 z-10 items-center",
                  isMe ? "right-0" : "left-0"
                )}>
                  {groupedReactions.map(([emoji, users]) => (
                    <div
                      key={emoji}
                      title={`Reacted by: ${users.join(", ")}`}
                      className="flex items-center gap-0.5 cursor-help"
                    >
                      <span className="text-[12px]">{emoji}</span>
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

            {/* Action bar (Now appears in Pinned View too) */}
            <div
              className={clsx(
                "absolute transition-all flex items-center gap-1 bg-white shadow-xl rounded-full p-1.5 z-30 border border-gray-100",
                "-top-10",
                isMe ? "right-0" : "left-0",
                isActionOpen
                  ? "opacity-100 scale-100 translate-y-0"
                  : "opacity-0 scale-95 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 group-hover:pointer-events-auto"
              )}
            >
              {/* Reply Button (Only show if NOT in pinned view) */}
              {!isPinnedView && (
                <button
                  onClick={() => {
                    setReplyingTo(msg);
                    closeAllMenus();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-500 transition-colors"
                  title="Reply"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 14 4 9l5-5"/>
                      <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
                  </svg>
                </button>
              )}
              
              {/* React Button (Only show if NOT in pinned view) */}
              {!isPinnedView && (
                <button
                  onClick={() => {
                    setActiveReactMenuId(msg.id);
                    setActiveActionId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-yellow-500 transition-colors"
                  title="React"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
              )}

              {/* Pin Button (Standard Grey Icon) */}
              <button
                onClick={() => togglePin(msg)}
                className={clsx(
                  "p-2 hover:bg-gray-100 rounded-full transition-colors",
                  msg.isPinned ? "text-gray-900 bg-gray-100" : "text-gray-500 hover:text-gray-900"
                )}
                title={msg.isPinned ? "Unpin" : "Pin"}
              >
                  {msg.isPinned ? <UnpinIcon /> : <PinIcon />}
              </button>
            </div>

            {/* Emoji reaction menu */}
            {activeReactMenuId === msg.id && (
              <div
                className={clsx(
                  "absolute top-full z-50 bg-white shadow-xl rounded-full p-2 flex gap-2 border border-gray-100 animate-in fade-in zoom-in duration-200 mt-2",
                  isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
                )}
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => toggleReaction(msg.id, emoji)}
                    className="hover:scale-125 transition-transform text-xl active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showTimestamp && (
          <span className="text-[9px] text-gray-400 mt-1 px-1 select-none">
            {format(msg.timestamp, "h:mm a")}
          </span>
        )}
      </div>
    );
  };

  // 7. Render
  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
      
      {/* GLOBAL CLICK BACKDROP */}
      {(activeActionId || activeReactMenuId) && (
        <div 
          className="absolute inset-0 z-20 bg-transparent cursor-default"
          onClick={closeAllMenus}
          onContextMenu={(e) => { e.preventDefault(); closeAllMenus(); }}
        />
      )}

      {/* HEADER */}
      <div className="p-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-gray-700">Group Chat</h2>
          
          {/* New Clean Pin Button */}
          {pinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedView(true)}
              className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm hover:bg-gray-50 transition-colors text-xs font-semibold text-gray-600"
            >
              <PinIcon className="w-3 h-3 text-gray-500" />
              <span>{pinnedMessages.length}</span>
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">{messages.length} msgs</span>
      </div>

      {/* MESSAGE LIST */}
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

      {/* PINNED MESSAGES OVERLAY */}
      {showPinnedView && (
        <div className="absolute inset-0 z-50 bg-slate-50/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <PinIcon className="w-4 h-4" /> 
              Pinned Messages
            </h3>
            <button
              onClick={() => {
                setShowPinnedView(false);
                closeAllMenus();
              }}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Close
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
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* REPLY PREVIEW */}
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

      {/* INPUT AREA */}
      <form
        onSubmit={sendMessage}
        className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0 z-40"
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  );
}