import { useState, useEffect } from "react";
import { ref, onValue, set } from "firebase/database";
import { 
  ref as storageRef, 
  uploadBytes, 
  getDownloadURL 
} from "firebase/storage"; // <--- NEW IMPORTS
import { db, storage } from "./firebase"; // <--- Import storage
import AvailabilityHeatmap from "./components/AvailabilityHeatmap";
import ProfileSelector from "./components/ProfileSelector";
import ThemeSelector from "./components/ThemeSelector";
import logo from "./assets/logo.png";
import Cropper from 'react-easy-crop';
import { getCroppedImg, dataURLtoBlob } from './canvasUtils'; // <--- Import helper
import { format } from "date-fns";

const FRIEND_GROUP = ["Cassey", "Drex", "Glad", "King", "Marielle", "Rhed", "Roan", "Ryan", "Teya"];

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});
  
  // NAVIGATION STATE

  // Header Dropdown
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  // Who's Free Tooltip/Modal
  const [attendeeModalData, setAttendeeModalData] = useState<{ date: Date, names: string[] } | null>(null);

  // Photo Upload State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false); // <--- Loading state

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

  // --- UPDATED SAVE FUNCTION ---
  const saveNewIcon = async () => {
    if (!imageSrc || !croppedAreaPixels || !currentUser) return;
    
    setIsUploading(true);
    try {
      // 1. Get the cropped image as Base64 string
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      // 2. Convert to Blob for Storage
      const blob = dataURLtoBlob(croppedBase64);

      // 3. Create Storage Reference (avatars/username_timestamp.jpg)
      const fileRef = storageRef(storage, `avatars/${currentUser}_${Date.now()}.jpg`);
      
      // 4. Upload
      await uploadBytes(fileRef, blob);
      const downloadURL = await getDownloadURL(fileRef);

      // 5. Save the *URL* to Realtime Database
      await set(ref(db, `users/${currentUser}/avatar`), downloadURL);
      
      setShowPhotoUpload(false);
      setImageSrc(null);
      setCrop({ x: 0, y: 0 }); 
      setZoom(1);              
    } catch (e) {
      console.error("Failed to save icon:", e);
      alert("Failed to save image. Try a smaller file.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-skin-base text-skin-text flex flex-col overflow-hidden">
      
      {/* HEADER */}
      {currentUser && (
        <div className="flex-none w-full flex justify-between items-center z-30 bg-skin-base/90 backdrop-blur-md px-4 py-3 border-b border-skin-muted/10">
           
           <div className="flex items-center gap-2 md:gap-3">
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
              
              <div className="hidden md:block">
                <h1 className="text-lg font-black text-skin-text tracking-tight leading-none">Free Ka Ba?</h1>
              </div>
           </div>
           
           <div className="flex items-center gap-2 md:gap-3">
             <ThemeSelector />
             
             <div className="relative">
               <button 
                 onClick={() => setIsMenuOpen(!isMenuOpen)}
                 className="flex items-center gap-2 focus:outline-none transition-transform active:scale-95"
               >
                 {userAvatars[currentUser] ? (
                   <img src={userAvatars[currentUser]} alt="Me" className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover" />
                 ) : (
                   <div className="w-10 h-10 rounded-full bg-skin-primary flex items-center justify-center text-skin-primary-fg font-bold shadow-md">
                     {currentUser[0]}
                   </div>
                 )}
               </button>

               {isMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                   <div className="absolute right-0 top-12 w-48 bg-skin-card rounded-xl shadow-xl border border-skin-muted/20 z-20 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top-right">
                     <div className="px-4 py-3 border-b border-skin-muted/10 bg-skin-base/50">
                        <p className="text-xs text-skin-muted font-medium">Signed in as</p>
                        <p className="font-bold text-skin-text">{currentUser}</p>
                     </div>
                     <label className="block w-full text-left px-4 py-3 text-sm text-skin-text hover:bg-skin-primary hover:text-skin-primary-fg cursor-pointer transition-colors">
                        Change Icon
                        <input type="file" onChange={handleFileChange} accept="image/*" className="hidden" />
                     </label>
                     <button 
                       onClick={() => { setCurrentUser(null); setIsMenuOpen(false); }}
                       className="block w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50/20 font-medium transition-colors"
                     >
                       Switch Profile
                     </button>
                   </div>
                 </>
               )}
             </div>
           </div>
        </div>
      )}

      {/* MODALS & OVERLAYS */}
      {showPhotoUpload && imageSrc && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-md rounded-2xl p-4 shadow-2xl flex flex-col gap-4">
              <h3 className="font-bold text-skin-text">Crop your new icon</h3>
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
                <button onClick={() => setShowPhotoUpload(false)} className="px-4 py-2 text-sm text-skin-muted">Cancel</button>
                <button 
                  onClick={saveNewIcon} 
                  disabled={isUploading}
                  className="px-4 py-2 bg-skin-primary text-skin-primary-fg rounded-full text-sm font-bold disabled:opacity-50"
                >
                  {isUploading ? "Saving..." : "Save Icon"}
                </button>
              </div>
           </div>
        </div>
      )}

      {attendeeModalData && (
        <div 
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setAttendeeModalData(null)}
        >
          <div className="bg-skin-card rounded-2xl shadow-2xl p-6 max-w-xs w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
             <div className="flex justify-between items-start mb-4">
               <div>
                 <p className="text-xs text-skin-muted font-bold uppercase tracking-wider">Availability</p>
                 <h3 className="text-xl font-black text-skin-text">{format(attendeeModalData.date, 'MMMM d')}</h3>
               </div>
               <button onClick={() => setAttendeeModalData(null)} className="text-skin-muted hover:text-skin-text">✕</button>
             </div>
             
             {attendeeModalData.names.length > 0 ? (
               <div className="space-y-3">
                 <p className="text-sm text-green-600 font-medium">{attendeeModalData.names.length} people are free!</p>
                 <div className="grid grid-cols-4 gap-2">
                    {attendeeModalData.names.map(name => (
                      <div key={name} className="flex flex-col items-center gap-1">
                         {userAvatars[name] ? (
                           <img src={userAvatars[name]} alt={name} className="w-10 h-10 rounded-full border border-skin-muted/20 object-cover" />
                         ) : (
                           <div className="w-10 h-10 rounded-full bg-skin-primary/20 text-skin-primary flex items-center justify-center font-bold text-xs">
                             {name[0]}
                           </div>
                         )}
                         <span className="text-[10px] text-skin-muted truncate w-full text-center">{name}</span>
                      </div>
                    ))}
                 </div>
               </div>
             ) : (
               <p className="text-sm text-skin-muted py-4 text-center">No one is free on this day yet. 😢</p>
             )}
          </div>
        </div>
      )}

      {/* LOGIN SCREEN */}
      {!currentUser ? (
        <div className="flex-1 flex items-start md:items-center justify-center p-4 pt-20 md:pt-4 overflow-y-auto">
            <ProfileSelector 
              friends={FRIEND_GROUP} 
              onSelect={(name) => setCurrentUser(name)} 
            />
        </div>
      ) : (
        <div className="flex-1 relative w-full overflow-hidden">
           <main className="absolute inset-0 overflow-y-auto transition-all duration-300 p-4 md:p-8">
             <div className="max-w-7xl mx-auto">
               <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="max-w-4xl mx-auto">
                     <AvailabilityHeatmap 
                       currentUser={currentUser} 
                       friends={FRIEND_GROUP}
                       onDateInteract={(date, names) => setAttendeeModalData({ date, names })}
                     />
                  </div>
               </div>
             </div>
           </main>
        </div>
      )}
    </div>
  );
}