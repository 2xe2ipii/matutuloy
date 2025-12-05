import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../firebase'; // Fixed import path

const AVATAR_COLORS = [
  'bg-red-500', 'bg-blue-500', 'bg-green-500', 
  'bg-yellow-500', 'bg-purple-500', 'bg-pink-500'
];

interface Props {
  friends: string[];
  onSelect: (name: string) => void;
}

// Simple helper to resize/center-crop image without external libraries
const resizeAndCropImage = (imageSrc: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = imageSrc;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = 200; // Force 200x200
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(imageSrc); 

      // Calculate aspect ratio to center crop
      const minScale = Math.max(size / img.width, size / img.height);
      const width = img.width * minScale;
      const height = img.height * minScale;
      const x = (size - width) / 2;
      const y = (size - height) / 2;

      ctx.drawImage(img, x, y, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(imageSrc); // Fallback
  });
};

export default function ProfileSelector({ friends, onSelect }: Props) {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [mode, setMode] = useState<'create' | 'enter' | 'onboarding_photo' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Store avatars locally
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  
  // PIN State
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Image Upload State
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  // 1. Listen for Avatar Updates
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
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Profile Click
  const handleProfileClick = async (name: string) => {
    setLoading(true);
    setSelectedFriend(name);
    setPinDigits(['', '', '', '']);
    setError('');

    const snapshot = await get(ref(db, `users/${name}/pin`));
    
    // If PIN exists -> Enter PIN. If not -> Start Onboarding (Photo -> PIN)
    if (snapshot.exists()) {
      setMode('enter');
    } else {
      setMode('onboarding_photo');
    }
    setLoading(false);
  };

  // 3. Focus inputs
  useEffect(() => {
    if ((mode === 'create' || mode === 'enter') && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [mode]);

  // 4. Image Handlers
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSavePhoto = async () => {
    if (!imageSrc || !selectedFriend) return;
    try {
      setLoading(true);
      // Resize internally without external lib
      const processedImage = await resizeAndCropImage(imageSrc);
      
      // Save avatar to Firebase
      await set(ref(db, `users/${selectedFriend}/avatar`), processedImage);
      setLoading(false);
      setMode('create'); // Move to PIN creation
    } catch (e) {
      console.error(e);
      setLoading(false);
      setError("Failed to save image");
    }
  };

  const handleSkipPhoto = () => {
    setMode('create');
  };

  // 5. PIN Handlers
  const handleDigitChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newDigits = [...pinDigits];
    newDigits[index] = value.substring(value.length - 1);
    setPinDigits(newDigits);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
    if (error) setError('');
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 4).split('');
    if (pasteData.every(char => !isNaN(Number(char)))) {
      const newDigits = [...pinDigits];
      pasteData.forEach((char, i) => { if (i < 4) newDigits[i] = char; });
      setPinDigits(newDigits);
      inputRefs.current[Math.min(pasteData.length, 3)]?.focus();
    }
  };

  // 6. Submit PIN
  useEffect(() => {
    if (pinDigits.every(d => d !== '') && selectedFriend) {
      submitPin();
    }
  }, [pinDigits]);

  const submitPin = async () => {
    const pin = pinDigits.join('');
    setLoading(true);
    
    if (mode === 'create') {
      await set(ref(db, `users/${selectedFriend}/pin`), pin);
      onSelect(selectedFriend!);
    } else if (mode === 'enter') {
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

  // RENDER: PHOTO UPLOAD STEP
  if (selectedFriend && mode === 'onboarding_photo') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] w-full max-w-md mx-auto p-4 animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Upload Profile Photo</h2>
        <p className="text-slate-500 text-sm mb-6 text-center">
          Let everyone know it's you!
        </p>

        {!imageSrc ? (
          <div className="w-full flex flex-col items-center gap-4">
            <label className="w-32 h-32 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
              <span className="text-slate-400 text-xs text-center px-2">Click to upload</span>
              <input type="file" onChange={onFileChange} accept="image/*" className="hidden" />
            </label>
            <button onClick={handleSkipPhoto} className="text-slate-400 text-sm hover:underline">
              Skip for now
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full gap-4">
            <div className="relative w-40 h-40 bg-slate-100 rounded-full overflow-hidden shadow-lg border-4 border-white">
              <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-slate-400">Photo will be automatically centered</p>
            <div className="flex gap-4 w-full justify-center">
              <button 
                onClick={() => setImageSrc(null)}
                className="px-4 py-2 text-slate-500 text-sm font-medium hover:bg-slate-100 rounded-full"
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePhoto}
                disabled={loading}
                className="px-6 py-2 bg-blue-500 text-white rounded-full text-sm font-bold shadow-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Looks Good!'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // RENDER: PIN ENTRY / CREATE
  if (selectedFriend && (mode === 'create' || mode === 'enter')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {mode === 'create' ? `Create PIN for ${selectedFriend}` : `Welcome back, ${selectedFriend}`}
        </h2>
        <p className="text-slate-500 text-sm mb-8">
          {mode === 'create' ? "Set a 4-digit security code." : "Enter your security code."}
        </p>
        <div className="flex gap-4 mb-6">
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
        {error && <p className="text-red-500 text-sm font-medium animate-pulse mb-4">{error}</p>}
        <button 
          onClick={() => { setSelectedFriend(null); setMode(null); }}
          className="text-slate-400 text-sm hover:text-slate-600 underline decoration-slate-300 underline-offset-4"
        >
          Cancel
        </button>
      </div>
    );
  }

  // RENDER: PROFILE SELECTOR
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in zoom-in duration-300">
      <h1 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">Who's planning?</h1>
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
                "w-24 h-24 rounded-2xl shadow-md flex items-center justify-center text-4xl font-bold text-white mb-1 relative overflow-hidden",
                // Only apply colorful background if NO avatar
                // !userAvatars[friend] && AVATAR_COLORS[index % AVATAR_COLORS.length], 
                // "group-hover:ring-4 ring-slate-200 transition-all bg-white"
                userAvatars[friend] ? "bg-white" : AVATAR_COLORS[index % AVATAR_COLORS.length]
              )}>
                {userAvatars[friend] ? (
                  <img src={userAvatars[friend]} alt={friend} className="w-full h-full object-cover" />
                ) : (
                  friend[0].toUpperCase()
                )}
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