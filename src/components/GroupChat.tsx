import { useState, useEffect, useRef } from "react";
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

export default function GroupChat({ currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const [activeReactMenuId, setActiveReactMenuId] = useState<string | null>(null);
  const [showPinnedView, setShowPinnedView] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // 1. Listen for Messages
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

  // 2. Smart Scroll
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

  // 3. Send Message
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
        text: replyingTo.text.substring(0, 50) + (replyingTo.text.length > 50 ? "..." : ""),
      };
    }

    push(ref(db, "messages"), payload);
    setNewMessage("");
    setReplyingTo(null);
    setShouldAutoScroll(true);
  };

  // 4. Actions
  const toggleReaction = (msgId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    const currentReaction = msg.reactions?.[currentUser];
    
    if (currentReaction === emoji) {
      remove(ref(db, `messages/${msgId}/reactions/${currentUser}`));
    } else {
      update(ref(db, `messages/${msgId}/reactions`), {
        [currentUser]: emoji
      });
    }
    setActiveReactMenuId(null);
  };

  const togglePin = (msg: Message) => {
    update(ref(db, `messages/${msg.id}`), { isPinned: !msg.isPinned });
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

  // RENDER ITEM HELPER
  const renderMessage = (msg: Message, isPinnedView = false) => {
    const isMe = msg.sender === currentUser;
    const groupedReactions = msg.reactions ? getGroupedReactions(msg.reactions) : [];

    return (
      <div
        key={msg.id}
        className={`group flex flex-col ${isMe ? "items-end" : "items-start"} relative mb-8`}
      >
        {!isMe && <span className="text-[10px] text-gray-400 ml-9 mb-1">{msg.sender}</span>}

        <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "justify-end" : ""}`}>
          {!isMe && (
            <div className="shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 mb-1">
              {msg.sender[0]}
            </div>
          )}
          
          {/* WRAPPER:
             - min-w-[120px]: Ensures "Ok" isn't too small to show a reply header.
             - mt-9: Creates vertical space for the absolute reply header.
          */}
          <div className={clsx("flex flex-col relative min-w-[120px]", msg.replyTo && "mt-9")}>
            
            {/* REPLY PREVIEW (Absolute):
               - bottom-full: Sits on top of the bubble.
               - left-0 right-0: Matches width of the bubble (doesn't stretch it).
               - REMOVED -z-10: Fixes invisibility issue.
            */}
            {msg.replyTo && (
              <div className="absolute bottom-full left-0 right-0 mb-[-2px] text-[10px] text-gray-500 bg-gray-100 p-2 rounded-t-xl rounded-b-none border-x border-t border-gray-200 opacity-90 truncate flex items-center h-9">
                <span className="truncate">Reply to <b>{msg.replyTo.sender}</b>: {msg.replyTo.text}</span>
              </div>
            )}

            <div
              className={clsx(
                "px-4 py-2 text-sm shadow-sm break-words relative",
                // Adjusted border radius to look attached to reply header if it exists
                isMe 
                  ? (msg.replyTo ? "rounded-b-2xl rounded-tl-2xl rounded-tr-sm bg-blue-500 text-white" : "rounded-2xl rounded-br-sm bg-blue-500 text-white") 
                  : (msg.replyTo ? "rounded-b-2xl rounded-tr-2xl rounded-tl-sm bg-white border border-gray-200 text-gray-700" : "rounded-2xl rounded-bl-sm bg-white border border-gray-200 text-gray-700"),
                msg.isPinned && "ring-2 ring-yellow-400 ring-offset-1"
              )}
            >
              {msg.text}

              {groupedReactions.length > 0 && (
                <div className="absolute -bottom-3 right-0 flex bg-white rounded-full shadow-sm border border-gray-100 px-1 py-0.5 scale-90 gap-1 z-10">
                  {groupedReactions.map(([emoji, users]) => (
                    <div 
                      key={emoji} 
                      title={`Reacted by: ${users.join(", ")}`}
                      className="flex items-center gap-0.5 cursor-help"
                    >
                      <span className="text-[10px]">{emoji}</span>
                      {users.length > 1 && <span className="text-[9px] text-gray-500 font-bold">{users.length}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isPinnedView && (
              <div className={clsx(
                "absolute opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white shadow-md rounded-full p-1 z-20 border border-gray-100",
                "-top-8", 
                isMe ? "right-0" : "left-0"
              )}>
                <button onClick={() => setReplyingTo(msg)} className="p-1 hover:bg-gray-100 rounded-full text-xs" title="Reply">↩️</button>
                <button onClick={() => setActiveReactMenuId(msg.id)} className="p-1 hover:bg-gray-100 rounded-full text-xs" title="React">😀</button>
                <button onClick={() => togglePin(msg)} className="p-1 hover:bg-gray-100 rounded-full text-xs" title={msg.isPinned ? "Unpin" : "Pin"}>
                  {msg.isPinned ? "🚫" : "📌"}
                </button>
              </div>
            )}

            {activeReactMenuId === msg.id && (
              <>
                <div className="fixed inset-0 z-40 cursor-default" onClick={() => setActiveReactMenuId(null)} />
                <div className={clsx(
                  "absolute top-full z-50 bg-white shadow-xl rounded-full p-1 flex gap-1 border border-gray-100 animate-in fade-in zoom-in duration-200 mt-2",
                   isMe ? "right-0 origin-top-right" : "left-0 origin-top-left"
                )}>
                  {EMOJIS.map(emoji => (
                    <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="hover:scale-125 transition-transform p-1 text-lg">
                      {emoji}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        
        <span className="text-[9px] text-gray-300 mt-1 px-1">
          {format(msg.timestamp, "h:mm a")}
        </span>
      </div>
    );
  };

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

      <div ref={containerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-slate-50/50">
        {messages.map(msg => renderMessage(msg))}
        <div ref={bottomRef} />
      </div>

      {showPinnedView && (
        <div className="absolute inset-0 z-50 bg-slate-50/95 backdrop-blur-sm flex flex-col animate-in fade-in duration-200">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white shadow-sm">
            <h3 className="font-bold text-gray-800">📌 Pinned Messages</h3>
            <button onClick={() => setShowPinnedView(false)} className="text-gray-400 hover:text-gray-600">✕ Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {pinnedMessages.length === 0 ? (
               <p className="text-center text-gray-400 text-sm mt-10">No pinned messages yet.</p>
            ) : (
               pinnedMessages.map(msg => (
                <div key={msg.id} className="relative group">
                  {renderMessage(msg, true)}
                  <button onClick={() => togglePin(msg)} className="absolute top-2 right-2 text-xs bg-white border border-gray-200 px-2 py-1 rounded-full shadow-sm text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Unpin 🚫</button>
                </div>
               ))
            )}
          </div>
        </div>
      )}

      {replyingTo && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500 shrink-0">
          <span className="truncate max-w-[80%]">Replying to <b>{replyingTo.sender}</b>: {replyingTo.text}</span>
          <button onClick={() => setReplyingTo(null)} className="text-red-500 font-bold hover:bg-red-50 rounded p-1">✕</button>
        </div>
      )}

      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 shrink-0">
        <div className="relative flex-1">
          <input
            type="text"
            value={newMessage}
            maxLength={MAX_CHARS}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Say something..."
            className="w-full bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-12"
          />
          <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">{newMessage.length}/{MAX_CHARS}</span>
        </div>
        <button type="submit" disabled={!newMessage.trim()} className="bg-blue-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center hover:bg-blue-600 disabled:opacity-50 transition-all shadow-md">➤</button>
      </form>
    </div>
  );
}