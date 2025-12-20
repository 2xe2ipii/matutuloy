import {
  useState,
  useEffect,
  useRef,
} from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "../firebase";
import { format, isSameDay } from "date-fns";
import { clsx } from "clsx";
import logo from "../assets/logo.png";

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

// --- ICONS ---
const PinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>
);
const UnpinIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="2" y1="2" x2="22" y2="22" /><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h9" /><path d="M15 4h-3c-.6 0-1.1.2-1.5.6" /></svg>
);
const ReplyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const AddReactionIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
);
const SendIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const HashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
);

const EMOJIS = ["👍", "❤️", "😆", "😮", "😢", "😡"];

export default function GroupChat({ currentUser, userAvatars }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Interaction State
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null); // Mobile tap
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null); // Desktop hover
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [showPinned, setShowPinned] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messagesRef = ref(db, "messages");
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: any) => ({
          id: key,
          ...value,
        }));
        setMessages(list);
      } else {
        setMessages([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!showPinned) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, showPinned]);

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
        text: replyingTo.text,
      };
    }

    push(ref(db, "messages"), payload);
    setNewMessage("");
    setReplyingTo(null);
  };

  const toggleReaction = (msgId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const currentReaction = msg.reactions?.[currentUser];
    if (currentReaction === emoji) {
      remove(ref(db, `messages/${msgId}/reactions/${currentUser}`));
    } else {
      update(ref(db, `messages/${msgId}/reactions`), { [currentUser]: emoji });
    }
    setActiveMessageId(null);
    setIsEmojiPickerOpen(false);
  };

  const togglePin = (msg: Message) => {
    update(ref(db, `messages/${msg.id}`), { isPinned: !msg.isPinned });
    setActiveMessageId(null);
  };

  const deleteMessage = (msgId: string) => {
    if (window.confirm("Delete this message?")) {
      remove(ref(db, `messages/${msgId}`));
    }
  };

  const formatTime = (timestamp: number) => {
    if (isSameDay(timestamp, new Date())) return `Today at ${format(timestamp, "h:mm aa")}`;
    return format(timestamp, "MM/dd/yyyy");
  };

  // Filter messages for display
  const displayedMessages = showPinned ? messages.filter(m => m.isPinned) : messages;

  const renderMessageRow = (msg: Message, index: number) => {
    const prevMsg = displayedMessages[index - 1];
    
    // Grouping Logic
    const isSameSender = prevMsg && prevMsg.sender === msg.sender;
    const isCloseInTime = prevMsg && (msg.timestamp - prevMsg.timestamp < 5 * 60 * 1000);
    const shouldGroup = isSameSender && isCloseInTime && !showPinned; // Don't group in pinned view

    const isActive = activeMessageId === msg.id;
    const isHovered = hoveredMessageId === msg.id;
    const showActions = isActive || isHovered;

    return (
      <div 
        key={msg.id}
        className={clsx(
          "relative pl-16 pr-4 py-0.5 hover:bg-black/5 dark:hover:bg-white/5 group transition-colors border-l-2 border-transparent",
          shouldGroup ? "mt-0" : "mt-4",
          isActive && "bg-black/5 dark:bg-white/5 border-skin-primary",
          msg.isPinned && !showPinned && "bg-yellow-500/5"
        )}
        onMouseEnter={() => setHoveredMessageId(msg.id)}
        onMouseLeave={() => setHoveredMessageId(null)}
        onClick={() => setActiveMessageId(isActive ? null : msg.id)}
      >
        {/* AVATAR */}
        {!shouldGroup && (
          <div className="absolute left-4 top-0.5 w-10 h-10 rounded-full bg-skin-base border border-skin-muted/20 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
            {userAvatars[msg.sender] ? (
              <img src={userAvatars[msg.sender]} alt={msg.sender} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-skin-muted">{msg.sender[0]}</div>
            )}
          </div>
        )}

        {/* TIMESTAMP ON HOVER */}
        {shouldGroup && (
          <div className="absolute left-0 w-[60px] text-[10px] text-skin-muted/50 text-right opacity-0 group-hover:opacity-100 top-1 select-none">
            {format(msg.timestamp, "h:mm aa")}
          </div>
        )}

        <div className="flex flex-col">
          {/* HEADER */}
          {!shouldGroup && (
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-skin-text cursor-pointer hover:underline">
                {msg.sender}
              </span>
              <span className="text-[10px] text-skin-muted select-none">
                {formatTime(msg.timestamp)}
              </span>
              {msg.isPinned && !showPinned && (
                <span className="text-[9px] bg-skin-muted/20 text-skin-muted px-1 rounded flex items-center gap-0.5">
                  <PinIcon className="w-3 h-3" /> Pinned
                </span>
              )}
            </div>
          )}

          {/* REPLY CONTEXT */}
          {msg.replyTo && (
            <div className="flex items-center gap-2 mb-1 opacity-75">
              <div className="w-8 h-3 border-t-2 border-l-2 border-skin-muted/30 rounded-tl-md -ml-6 mt-1.5" />
              <div className="text-xs text-skin-muted flex gap-1 items-center bg-skin-base/50 px-1 rounded truncate max-w-xs">
                <span className="font-bold">@{msg.replyTo.sender}</span>
                <span className="truncate">{msg.replyTo.text}</span>
              </div>
            </div>
          )}

          {/* TEXT */}
          <p className={clsx(
            "text-[15px] leading-relaxed text-skin-text/90 whitespace-pre-wrap break-words",
          )}>
            {msg.text}
          </p>

          {/* REACTIONS */}
          {msg.reactions && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(
                Object.entries(msg.reactions).reduce((acc, [user, emoji]) => {
                  if (!acc[emoji]) acc[emoji] = [];
                  acc[emoji].push(user);
                  return acc;
                }, {} as Record<string, string[]>)
              ).map(([emoji, users]) => {
                const iReacted = users.includes(currentUser);
                return (
                  <button
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                    className={clsx(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border text-xs transition-colors",
                      iReacted 
                        ? "bg-skin-primary/10 border-skin-primary/40" 
                        : "bg-skin-base border-skin-muted/20 hover:border-skin-muted/50"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className={clsx("font-bold", iReacted ? "text-skin-primary" : "text-skin-muted")}>
                      {users.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FLOATING ACTIONS */}
        <div className={clsx(
          "absolute right-4 -top-3 bg-skin-card shadow-lg border border-skin-muted/20 rounded-lg flex items-center p-0.5 z-20 transition-all duration-200",
          showActions ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        )}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsEmojiPickerOpen(!isEmojiPickerOpen); setActiveMessageId(msg.id); }}
            className="p-1.5 hover:bg-skin-base rounded text-skin-muted hover:text-skin-text"
            title="Add Reaction"
          >
            <AddReactionIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
            className="p-1.5 hover:bg-skin-base rounded text-skin-muted hover:text-skin-text"
            title="Reply"
          >
            <ReplyIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); togglePin(msg); }}
            className={clsx(
              "p-1.5 hover:bg-skin-base rounded transition-colors",
              msg.isPinned ? "text-skin-primary" : "text-skin-muted hover:text-skin-text"
            )}
            title={msg.isPinned ? "Unpin" : "Pin"}
          >
             {msg.isPinned ? <UnpinIcon className="w-4 h-4"/> : <PinIcon className="w-4 h-4"/>}
          </button>
          {msg.sender === currentUser && (
             <button 
               onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
               className="p-1.5 hover:bg-skin-base rounded text-skin-muted hover:text-red-500"
               title="Delete"
             >
               <TrashIcon className="w-4 h-4" />
             </button>
          )}

          {/* Emoji Popover */}
          {isEmojiPickerOpen && isActive && (
            <div className="absolute right-0 top-full mt-2 bg-skin-card border border-skin-muted/20 shadow-xl rounded-lg p-2 flex gap-1 z-30 animate-in fade-in zoom-in-95">
               {EMOJIS.map(emoji => (
                 <button
                   key={emoji}
                   onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); }}
                   className="p-2 hover:bg-skin-base rounded text-xl hover:scale-125 transition-transform"
                 >
                   {emoji}
                 </button>
               ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-skin-card relative">
      
      {/* CHANNEL HEADER (Consistent Top Bar) */}
      <div className="h-12 border-b border-skin-muted/10 flex justify-between items-center px-4 shrink-0 bg-skin-card z-10 shadow-sm">
         <div className="flex items-center gap-2 text-skin-text font-bold">
            <HashIcon className="w-5 h-5 text-skin-muted" />
            <span>general</span>
         </div>
         <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowPinned(prev => !prev)}
              className={clsx(
                "flex items-center gap-1 text-sm font-medium transition-colors",
                showPinned ? "text-skin-primary" : "text-skin-muted hover:text-skin-text"
              )}
              title="Pinned Messages"
            >
               <PinIcon className="w-4 h-4" />
               <span className="hidden sm:inline">Pinned</span>
            </button>
         </div>
      </div>

      {/* MESSAGE LIST */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-skin-base/30"
      >
        {!showPinned ? (
          <>
            {/* WELCOME BANNER */}
            <div className="px-6 pt-8 pb-8 flex flex-col items-start border-b border-skin-muted/10 mb-2">
               <div className="w-16 h-16 bg-skin-base rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-skin-muted/10">
                  <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
               </div>
               <h2 className="text-3xl font-black text-skin-text mb-2">Welcome to #general!</h2>
               <p className="text-skin-muted text-sm max-w-md">
                 This is the start of the <span className="font-bold text-skin-text">Free Ka Ba?</span> chat history.
               </p>
            </div>
            <div className="pb-4">
              {displayedMessages.map((msg, index) => renderMessageRow(msg, index))}
            </div>
            <div ref={bottomRef} />
          </>
        ) : (
          <div className="p-4">
             <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-skin-text">Pinned Messages</h3>
                <button onClick={() => setShowPinned(false)} className="text-xs text-skin-muted hover:text-skin-primary">Back to chat</button>
             </div>
             {displayedMessages.length === 0 ? (
                <div className="text-center text-skin-muted py-10">No pinned messages yet.</div>
             ) : (
                displayedMessages.map((msg, index) => renderMessageRow(msg, index))
             )}
          </div>
        )}
      </div>

      {/* REPLY INDICATOR */}
      {replyingTo && (
        <div className="px-4 py-2 bg-skin-base/50 border-t border-skin-muted/10 flex justify-between items-center text-xs text-skin-muted shrink-0 backdrop-blur-sm">
          <span className="flex items-center gap-1.5 overflow-hidden">
            <ReplyIcon className="w-3 h-3" />
            <span>Replying to <span className="font-bold text-skin-text">@{replyingTo.sender}</span></span>
          </span>
          <button onClick={() => setReplyingTo(null)} className="hover:text-skin-text px-2 py-1">✕</button>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-4 bg-skin-card shrink-0 z-40">
        <form
          onSubmit={sendMessage}
          className="flex gap-2 bg-skin-base/60 p-2 rounded-xl border border-skin-muted/20 focus-within:border-skin-primary/50 focus-within:ring-1 focus-within:ring-skin-primary/50 transition-all items-end"
        >
          <button type="button" className="w-10 h-10 flex items-center justify-center rounded-lg text-skin-muted hover:text-skin-text hover:bg-skin-muted/10 transition-colors shrink-0">
            <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center text-[10px] font-bold">+</div>
          </button>

          <textarea
            value={newMessage}
            maxLength={500}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder={`Message #${currentUser ? 'general' : 'chat'}`}
            className="flex-1 bg-transparent text-sm text-skin-text placeholder-skin-muted focus:outline-none py-2.5 resize-none max-h-32 min-h-[40px]"
            rows={1}
          />
          
          <div className="pb-1">
             <button
               type="submit"
               disabled={!newMessage.trim()}
               className={clsx(
                 "p-2 rounded-lg transition-all",
                 newMessage.trim() 
                   ? "text-skin-primary hover:bg-skin-primary/10" 
                   : "text-skin-muted cursor-not-allowed"
               )}
             >
               <SendIcon className="w-5 h-5" />
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}