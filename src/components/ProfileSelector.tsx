import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ref, get, set } from 'firebase/database';
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
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState<'create' | 'enter' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // OTP STATE: Array of 4 strings
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Handle Profile Click
  const handleProfileClick = async (name: string) => {
    setLoading(true);
    setSelectedFriend(name);
    setPinDigits(['', '', '', '']); // Reset PIN
    setError('');

    const snapshot = await get(ref(db, `users/${name}/pin`));
    setPinMode(snapshot.exists() ? 'enter' : 'create');
    setLoading(false);
  };

  // 2. Focus first input when PIN mode opens
  useEffect(() => {
    if (pinMode && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [pinMode]);

  // 3. Handle Digit Change
  const handleDigitChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // Numbers only

    const newDigits = [...pinDigits];
    // Take the last char entered (if user types fast)
    newDigits[index] = value.substring(value.length - 1);
    setPinDigits(newDigits);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error when typing
    if (error) setError('');
  };

  // 4. Handle Backspace
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // 5. Handle Paste (e.g., pasting "1234")
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 4).split('');
    if (pasteData.every(char => !isNaN(Number(char)))) {
      const newDigits = [...pinDigits];
      pasteData.forEach((char, i) => {
        if (i < 4) newDigits[i] = char;
      });
      setPinDigits(newDigits);
      // Focus last filled
      inputRefs.current[Math.min(pasteData.length, 3)]?.focus();
    }
  };

  // 6. Submit Logic
  const handleSubmit = async () => {
    const pin = pinDigits.join('');
    if (pin.length !== 4) return;

    setLoading(true);
    
    if (pinMode === 'create') {
      await set(ref(db, `users/${selectedFriend}/pin`), pin);
      onSelect(selectedFriend!);
    } 
    else if (pinMode === 'enter') {
      const snapshot = await get(ref(db, `users/${selectedFriend}/pin`));
      if (pin === snapshot.val()) {
        onSelect(selectedFriend!);
      } else {
        setError("Incorrect PIN");
        setPinDigits(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (pinDigits.every(d => d !== '')) {
      handleSubmit();
    }
  }, [pinDigits]);

  if (selectedFriend && pinMode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {pinMode === 'create' ? `Create PIN for ${selectedFriend}` : `Welcome back, ${selectedFriend}`}
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          {pinMode === 'create' ? "Set a 4-digit security code." : "Enter your security code."}
        </p>

        <div className="flex flex-col items-center gap-6">
          {/* OTP INPUTS */}
          <div className="flex gap-4">
            {pinDigits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={clsx(
                  "w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all",
                  digit 
                    ? "border-blue-500 bg-blue-50 text-blue-900" 
                    : "border-slate-200 bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
                  error && "border-red-300 bg-red-50"
                )}
              />
            ))}
          </div>

          {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}
          
          <button 
            onClick={() => {
              setSelectedFriend(null);
              setPinMode(null);
            }}
            className="text-slate-400 text-sm hover:text-slate-600 mt-4 underline decoration-slate-300 underline-offset-4"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // RENDER: PROFILE SELECTOR
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-300">
      <h1 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">
        Who's planning?
      </h1>
      
      {loading ? (
         <div className="text-slate-400">Loading profiles...</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          {friends.map((friend, index) => (
            <button
              key={friend}
              onClick={() => handleProfileClick(friend)}
              className="group flex flex-col items-center gap-3 transition-transform hover:scale-105 active:scale-95"
            >
              <div className={clsx(
                "w-24 h-24 rounded-md shadow-md flex items-center justify-center text-4xl font-bold text-white mb-1 relative overflow-hidden",
                AVATAR_COLORS[index % AVATAR_COLORS.length], 
                "group-hover:ring-4 ring-slate-200 transition-all"
              )}>
                {friend[0].toUpperCase()}
              </div>
              <span className="text-lg font-medium text-slate-600 group-hover:text-slate-900">
                {friend}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}