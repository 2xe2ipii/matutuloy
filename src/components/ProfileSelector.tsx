import { clsx } from 'clsx';

// You can replace these with real image URLs later if you want
const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 
  'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'
];

interface Props {
  friends: string[];
  onSelect: (name: string) => void;
}

export default function ProfileSelector({ friends, onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-300">
      <h1 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">
        Who's planning?
      </h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
        {friends.map((friend, index) => (
          <button
            key={friend}
            onClick={() => onSelect(friend)}
            className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95"
          >
            {/* Avatar Circle */}
            <div className={clsx(
              "w-24 h-24 rounded-md shadow-md flex items-center justify-center text-4xl font-bold text-white mb-1",
              AVATAR_COLORS[index % AVATAR_COLORS.length], // Assigns a consistent color
              "group-hover:ring-4 ring-slate-200 transition-all"
            )}>
              {friend[0].toUpperCase()}
            </div>
            
            {/* Name */}
            <span className="text-lg font-medium text-slate-600 group-hover:text-slate-900">
              {friend}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}