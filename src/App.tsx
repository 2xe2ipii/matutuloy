import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { db } from "./firebase";
import AvailabilityHeatmap from "./components/AvailabilityHeatmap";
import ProfileSelector from "./components/ProfileSelector";
import GroupChat from "./components/GroupChat"; 
import logo from "./assets/logo.png";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from './canvasUtils';
import { clsx } from 'clsx';
import { format } from "date-fns";

const FRIEND_GROUP = ["Cassey", "Drex", "Glad", "King", "Marielle", "Rhed", "Roan", "Ryan", "Teya"];

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  
  // Mobile Calendar Toggle
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  // Header Dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  // Who's Free Tooltip/Modal
  const [attendeeModalData, setAttendeeModalData] = useState<{ date: Date, names: string[] } | null>(null);

  // Photo Upload State (Duplicate logic from ProfileSelector, kept simple here)
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // 1. Fetch User Data (Avatars)
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

  // 2. Change Icon Logic
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result as string));
      reader.readAsDataURL(file);
      setShowPhotoUpload(true);
      setIsMenuOpen(false);
    }
  };

  const saveNewIcon = async () => {
    if (!imageSrc || !croppedAreaPixels || !currentUser) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // This saves the Base64 string to the DB
      await set(ref(db, `users/${currentUser}/avatar`), croppedImage);
      
      // Reset states
      setShowPhotoUpload(false);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 }); // Optional: Reset crop position
      setZoom(1);              // Optional: Reset zoom
    } catch (e) {
      console.error("Failed to save icon:", e);
      alert("Failed to save image. Try a smaller file.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 relative">
      
      {/* HEADER */}
      {currentUser && (
        <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-4 sticky top-0 z-30 bg-slate-50/90 backdrop-blur-sm py-2">
           <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">Free Ka Ba?</h1>
                <p className="text-[10px] md:text-xs text-slate-400 font-medium">Trip Planner</p>
              </div>
           </div>
           
           {/* NEW HEADER ACTION: Avatar Dropdown */}
           <div className="relative">
             <button 
               onClick={() => setIsMenuOpen(!isMenuOpen)}
               className="flex items-center gap-2 focus:outline-none transition-transform active:scale-95"
             >
               {userAvatars[currentUser] ? (
                 <img src={userAvatars[currentUser]} alt="Me" className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover" />
               ) : (
                 <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shadow-md">
                   {currentUser[0]}
                 </div>
               )}
             </button>

             {isMenuOpen && (
               <>
                 <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                 <div className="absolute right-0 top-12 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                   <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                      <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                      <p className="font-bold text-gray-800">{currentUser}</p>
                   </div>
                   <label className="block w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors">
                      Change Icon
                      <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                   </label>
                   <button 
                     onClick={() => { setCurrentUser(null); setIsMenuOpen(false); }}
                     className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 font-medium transition-colors"
                   >
                     Switch Profile
                   </button>
                 </div>
               </>
             )}
           </div>
        </div>
      )}

      {/* CHANGE ICON MODAL */}
      {showPhotoUpload && imageSrc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
              <h3 className="font-bold text-gray-800">Crop your new icon</h3>
              <div className="relative w-full h-64 bg-slate-900 rounded-xl overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                  onZoomChange={setZoom}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowPhotoUpload(false)} className="px-4 py-2 text-sm text-gray-500">Cancel</button>
                <button onClick={saveNewIcon} className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold">Save Icon</button>
              </div>
           </div>
        </div>
      )}

      {/* WHO IS FREE MODAL (Mobile/Desktop Popup) */}
      {attendeeModalData && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAttendeeModalData(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Availability</p>
                 <h3 className="text-xl font-black text-gray-800">{format(attendeeModalData.date, 'MMMM d')}</h3>
               </div>
               <button onClick={() => setAttendeeModalData(null)} className="text-gray-400 hover:text-gray-600">✕</button>
             </div>
             
             {attendeeModalData.names.length > 0 ? (
               <div className="space-y-3">
                 <p className="text-sm text-green-600 font-medium">{attendeeModalData.names.length} people are free!</p>
                 <div className="grid grid-cols-4 gap-2">
                    {attendeeModalData.names.map(name => (
                      <div key={name} className="flex flex-col items-center gap-1">
                         {userAvatars[name] ? (
                           <img src={userAvatars[name]} alt={name} className="w-10 h-10 rounded-full border border-gray-100 object-cover" />
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                             {name[0]}
                           </div>
                         )}
                         <span className="text-[10px] text-gray-500 truncate w-full text-center">{name}</span>
                      </div>
                    ))}
                 </div>
               </div>
             ) : (
               <p className="text-sm text-gray-400 py-4 text-center">No one is free on this day yet. 😢</p>
             )}
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center">
            <ProfileSelector 
              friends={FRIEND_GROUP} 
              onSelect={(name) => setCurrentUser(name)} 
            />
        </div>
      ) : (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative">
           
           {/* Left Column: Calendar */}
           <div className="lg:col-span-2 flex flex-col gap-4">
              
              {/* Mobile Toggle for Calendar */}
              <div className="lg:hidden flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                 <span className="text-sm font-bold text-gray-700">Calendar</span>
                 <button 
                    onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
                    className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-medium"
                 >
                   {isCalendarExpanded ? "Hide" : "Show"}
                 </button>
              </div>

              {/* The Calendar Component */}
              <div className={clsx(
                "transition-all duration-300 overflow-hidden",
                // Mobile: animate height or block. Desktop: always block
                isCalendarExpanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0 lg:max-h-none lg:opacity-100"
              )}>
                <AvailabilityHeatmap 
                  currentUser={currentUser} 
                  friends={FRIEND_GROUP}
                  onDateInteract={(date, names) => setAttendeeModalData({ date, names })}
                />
              </div>
           </div>

           {/* Right Column: Chat */}
           <div className={clsx(
             "h-full lg:col-span-1 transition-transform duration-300",
             // If calendar is hidden on mobile, chat slides up visually
             !isCalendarExpanded && "-mt-4" 
           )}>
              <GroupChat currentUser={currentUser} userAvatars={userAvatars} />
           </div>

        </div>
      )}
    </div>
  );
}