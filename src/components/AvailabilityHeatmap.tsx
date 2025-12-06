import { useEffect, useState, useRef } from 'react';
import { 
  format, eachDayOfInterval, startOfMonth, endOfMonth, getDay, isToday 
} from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ref, onValue, update, remove } from 'firebase/database';
import { db } from '../firebase';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AvailabilityMap = Record<string, Record<string, boolean>>;

interface Props {
  currentMonth?: Date;
  currentUser: string;
  friends: string[];
  // New Prop to communicate back to App
  onDateInteract: (date: Date, names: string[]) => void;
}

export default function AvailabilityHeatmap({ 
  currentMonth = new Date(), 
  currentUser, 
  friends,
  onDateInteract
}: Props) {
  const totalUsers = friends.length;
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const [availability, setAvailability] = useState<AvailabilityMap>({});
  const longPressTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const availabilityRef = ref(db, 'availability');
    const unsubscribe = onValue(availabilityRef, (snapshot) => {
      const data = snapshot.val();
      setAvailability(data || {});
    });
    return () => unsubscribe();
  }, []);

  const toggleAvailability = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = availability[dateKey] || {};
    const isFree = dayData[currentUser];
    const userVoteRef = ref(db, `availability/${dateKey}/${currentUser}`);

    if (isFree) {
      remove(userVoteRef);
    } else {
      update(ref(db), { [`availability/${dateKey}/${currentUser}`]: true });
    }
  };

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-skin-base text-skin-muted hover:bg-skin-card";
    const percentage = count / totalUsers;
    if (percentage <= 0.25) return "bg-emerald-200 text-emerald-800";
    if (percentage <= 0.50) return "bg-emerald-400 text-white";
    if (percentage <= 0.75) return "bg-emerald-600 text-white";
    return "bg-emerald-900 text-white font-bold ring-2 ring-emerald-400 shadow-lg scale-105 z-10";
  };

  const startingDayIndex = getDay(startOfMonth(currentMonth));

  // INTERACTION HANDLERS
  const handlePointerDown = (date: Date, names: string[]) => (e: React.PointerEvent) => {
    // If mobile (touch), wait for long press
    if (e.pointerType !== 'mouse') {
      longPressTimeoutRef.current = window.setTimeout(() => {
        onDateInteract(date, names);
      }, 500); 
    }
  };

  const handlePointerUp = () => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  // For Desktop: Right click context menu to show details
  const handleContextMenu = (e: React.MouseEvent, date: Date, names: string[]) => {
    e.preventDefault();
    onDateInteract(date, names);
  };

  return (
    <div className="w-full p-6 bg-skin-card rounded-2xl shadow-xl border border-skin-muted/20">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-2xl font-bold text-skin-text">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex flex-col items-end">
             <span className="text-xs font-medium text-skin-muted uppercase tracking-wider">Live Sync</span>
             <span className="text-[10px] text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/> Online
             </span>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-3 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
          <div key={day} className="text-xs font-bold text-skin-muted">{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startingDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {daysInMonth.map((date) => {
          const dateKey = format(date, 'yyyy-MM-dd');
          const dayData = availability[dateKey] || {};
          const attendees = Object.keys(dayData);
          const count = attendees.length;
          const isSelectedByMe = !!dayData[currentUser];
          const isTodayDate = isToday(date);

          return (
            <button
              key={dateKey}
              onClick={() => toggleAvailability(date)}
              onPointerDown={handlePointerDown(date, attendees)}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onContextMenu={(e) => handleContextMenu(e, date, attendees)}
              className={cn(
                "h-12 w-full rounded-xl flex flex-col items-center justify-center transition-all duration-200 relative select-none touch-manipulation",
                getIntensityClass(count),
                isSelectedByMe && "ring-2 ring-offset-2 ring-skin-primary",
                isTodayDate && !count && "border-2 border-skin-primary/30"
              )}
            >
              <span className="text-sm font-medium leading-none">{format(date, 'd')}</span>
              {count > 0 && (
                <div className="flex gap-0.5 mt-1">
                  {attendees.slice(0, 3).map((_, i) => (
                     <div key={i} className="w-1 h-1 rounded-full bg-white/60" />
                  ))}
                  {count > 3 && <div className="w-1 h-1 rounded-full bg-white/60" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-skin-muted/50 text-center mt-6">
        Tip: Long press (mobile) or Right click (desktop) a date to see who is free.
      </p>
    </div>
  );
}