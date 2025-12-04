import { useEffect, useState } from 'react';
import { 
  format, 
  eachDayOfInterval, 
  startOfMonth, 
  endOfMonth, 
  getDay,
  isToday 
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// Firebase Imports
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../firebase'; // Import your DB instance

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
// Data is now stored as { "2025-10-01": { "Jep": true, "Ken": true } }
type AvailabilityMap = Record<string, Record<string, boolean>>;

interface Props {
  currentMonth?: Date;
  currentUser: string;
  friends: string[];
}

export default function AvailabilityHeatmap({ currentMonth = new Date(), currentUser, friends }: Props) {
  const totalUsers = friends.length;

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  // 1. STATE: Now just holds the data from Firebase
  const [availability, setAvailability] = useState<AvailabilityMap>({});

  // 2. EFFECT: Subscribe to Firebase Realtime Database
  useEffect(() => {
    // Listen to the 'availability' node
    const availabilityRef = ref(db, 'availability');
    
    // onValue triggers every time data changes in the DB
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAvailability(data);
      } else {
        setAvailability({});
      }
    });

    // Cleanup listener when component unmounts
    return () => unsubscribe();
  }, []);

  // 3. ACTION: Write to Firebase (No local state setting needed!)
  const toggleAvailability = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availability[dateKey] || {};
    const isFree = dayData[currentUser];

    // Reference to this specific User's vote on this specific Date
    // Path: availability/2025-10-15/Jep
    const userVoteRef = ref(db, `availability/${dateKey}/${currentUser}`);

    if (isFree) {
      // If already free, remove the entry (delete the key)
      remove(userVoteRef);
    } else {
      // If not free, set it to true
      // We use 'update' on the parent or 'set' on the child. 
      // Setting the specific node is safest.
      // We can just write "true" to this path.
      update(ref(db), { [`availability/${dateKey}/${currentUser}`]: true });
    }
  };

  // 4. HELPER: Calculate Intensity
  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-gray-50 text-gray-400 hover:bg-gray-100";
    const percentage = count / totalUsers;
    if (percentage <= 0.25) return "bg-emerald-200 text-emerald-800";
    if (percentage <= 0.50) return "bg-emerald-400 text-white";
    if (percentage <= 0.75) return "bg-emerald-600 text-white";
    return "bg-emerald-900 text-white font-bold ring-2 ring-emerald-400 shadow-lg scale-105 z-10";
  };

  const startingDayIndex = getDay(startOfMonth(currentMonth));

  return (
    <div className="w-full max-w-lg mx-auto p-6 bg-white rounded-2xl shadow-xl border border-gray-100">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex flex-col items-end">
             <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Live Sync</span>
             <span className="text-[10px] text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> Online
             </span>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-3 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
          <div key={day} className="text-xs font-bold text-gray-400">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          
          // Get object of users for this day (e.g. { Jep: true, Ken: true })
          const dayData = availability[dateKey] || {};
          
          // Count keys (number of people free)
          const count = Object.keys(dayData).length;
          
          // Check if current user is in that object
          const isSelectedByMe = !!dayData[currentUser];
          
          const isTodayDate = isToday(date);

          return (
            <button
              key={dateKey}
              onClick={() => toggleAvailability(date)}
              className={cn(
                "h-12 w-full rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative",
                getIntensityClass(count),
                isSelectedByMe && "ring-2 ring-offset-2 ring-blue-500",
                isTodayDate && !count && "border-2 border-blue-200"
              )}
            >
              <span className="text-sm font-medium leading-none">{format(date, 'd')}</span>
              {count > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {/* Map the keys (names) to dots */}
                  {Object.keys(dayData).slice(0, 4).map((name, i) => (
                     <div key={i} title={name} className="w-1 h-1 rounded-full bg-white/60" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-100 flex justify-center gap-6 text-xs text-gray-500 font-medium">
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-gray-100 rounded-sm border border-gray-200"></div> None
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-emerald-400 rounded-sm"></div> Some
        </div>
        <div className="flex items-center gap-2">
           <div className="w-3 h-3 bg-emerald-900 rounded-sm"></div> Everyone
        </div>
      </div>
    </div>
  );
}