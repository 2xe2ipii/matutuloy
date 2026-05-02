import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

const AVATAR_COLORS = [
  'bg-cyan-400/20',
  'bg-teal-400/20',
  'bg-sky-400/20',
  'bg-cyan-300/20',
  'bg-blue-400/20',
  'bg-teal-300/20',
  'bg-cyan-500/20',
  'bg-sky-300/20',
  'bg-teal-500/20',
];

interface Props {
  friends: string[];
  onSelect: (name: string) => void;
}

export default function ProfileSelector({ friends, onSelect }: Props) {
  const [loading, setLoading] = useState(true);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

  // Listen for Avatar Updates
  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const avatars: Record<string, string> = {};
        Object.keys(data).forEach(key => {
          if (data[key].avatar) avatars[key] = data[key].avatar;
        });
        setUserAvatars(avatars);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Profile Click
  const handleProfileClick = (name: string) => {
    onSelect(name);
  };

  // RENDER: PROFILE SELECTOR
  return (
    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
      <div className="relative mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-skin-text tracking-tighter text-center">
          Sino ka?
        </h1>
        {/* Decorative Wave underline */}
        <svg className="absolute -bottom-4 left-0 w-full h-2 text-skin-primary/30" viewBox="0 0 100 20" preserveAspectRatio="none">
          <path d="M0,10 Q25,0 50,10 T100,10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      {loading ? (
         <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-skin-primary/20 border-t-skin-primary rounded-full animate-spin" />
            <div className="text-skin-muted font-bold text-sm uppercase tracking-widest animate-pulse">Scanning the deep...</div>
         </div>
      ) : (
        <div className="grid grid-cols-3 gap-x-6 gap-y-10 md:gap-x-12 md:gap-y-16 max-w-2xl mx-auto px-4">
          {friends.map((friend, index) => (
            <button
              key={friend}
              onClick={() => handleProfileClick(friend)}
              className="group relative flex flex-col items-center transition-all duration-300"
              style={{ animation: `buoyancy ${3 + (index % 3)}s ease-in-out infinite alternate`, animationDelay: `${index * 0.2}s` }}
            >
              {/* The Porthole / Bubble */}
              <div className={clsx(
                "relative w-20 h-20 md:w-28 md:h-28 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500",
                "border-4 border-white/20 backdrop-blur-md overflow-hidden",
                "group-hover:border-skin-primary/50 group-hover:scale-110 group-active:scale-95",
                userAvatars[friend] ? "bg-white/10" : AVATAR_COLORS[index % AVATAR_COLORS.length]
              )}>
                {/* Glass sheen */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                
                {userAvatars[friend] ? (
                  <img src={userAvatars[friend]} alt={friend} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <span className="text-3xl md:text-4xl font-black text-skin-text/80 group-hover:text-skin-primary transition-colors">
                    {friend[0].toUpperCase()}
                  </span>
                )}
                
                {/* Bubble inner glow */}
                <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none" />
              </div>

              {/* Name Plate - "Message in a bottle" style or Floating Tag */}
              <div className="mt-4 px-3 py-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-full shadow-lg transition-colors group-hover:bg-skin-primary group-hover:border-skin-primary/50">
                <span className="text-xs md:text-sm font-bold text-skin-text group-hover:text-skin-primary-fg whitespace-nowrap">
                  {friend}
                </span>
              </div>
              
              {/* Particle trail (Subtle bubbles) visible on hover */}
              <div className="absolute -z-10 top-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-1 h-1 bg-white/40 rounded-full animate-ping mb-2" />
                <div className="w-2 h-2 bg-white/20 rounded-full animate-ping" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}