import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 
  'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'
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
    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
      <h1 className="text-3xl font-black text-skin-text mb-8 tracking-tight">Sino ka?</h1>
      {loading ? (
         <div className="text-skin-muted">Loading profiles...</div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          {friends.map((friend, index) => (
            <button
              key={friend}
              onClick={() => handleProfileClick(friend)}
              className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95"
            >
              <div className={clsx(
                "w-24 h-24 rounded-2xl shadow-md flex items-center justify-center text-4xl font-bold text-skin-primary-fg mb-1 relative overflow-hidden",
                userAvatars[friend] ? "bg-skin-card" : AVATAR_COLORS[index % AVATAR_COLORS.length]
              )}>
                {userAvatars[friend] ? (
                  <img src={userAvatars[friend]} alt={friend} className="w-full h-full object-cover" />
                ) : (
                  friend[0].toUpperCase()
                )}
              </div>
              <span className="text-lg font-medium text-skin-text group-hover:text-skin-primary">
                {friend}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}