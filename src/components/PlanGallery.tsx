import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { db } from '../firebase';
import { clsx } from 'clsx';
import { format } from 'date-fns';

// --- ICONS ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const FolderIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>
);
const BackIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m15 18-6-6 6-6"/></svg>
);
const CameraIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
);
const PaletteIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
);
const UploadIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);

// --- CONSTANTS ---

const BACKGROUND_PATTERNS: Record<string, string> = {
  plain: "bg-skin-base",
  dots: "bg-[#f0f0f0] bg-[radial-gradient(#cbd5e1_3px,transparent_3px)] [background-size:24px_24px]",
  grid: "bg-white bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:32px_32px]",
  cork: "bg-[#e8dcc5] bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] bg-blend-multiply",
  paper: "bg-[#fffbf0] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]",
  dark: "bg-[#1a1a1a] bg-[radial-gradient(#333_2px,transparent_2px)] [background-size:20px_20px]"
};

const TAPE_STYLES = [
  "bg-yellow-200/90 rotate-[-2deg]",
  "bg-red-200/90 rotate-[1deg]",
  "bg-blue-200/90 rotate-[-1deg]",
  "bg-green-200/90 rotate-[2deg]",
  "bg-purple-200/90 rotate-[-3deg]",
  "bg-pink-200/90 rotate-[3deg]",
  "bg-orange-200/90 rotate-[-1deg]",
];

const ASPECT_RATIOS = [
  "aspect-square", // 1:1
  "aspect-[3/4]",  // Portrait
  "aspect-[4/3]",  // Landscape
];

const MAX_CAPTION_LENGTH = 50;

// --- HELPERS ---

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1000; // Increased slightly for backgrounds
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); 
      };
    };
  });
};

const getDeterministicRandom = (id: string, range: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % range;
};

interface Props {
  planId: string;
  currentUser: string;
}

export default function PlanGallery({ planId, currentUser }: Props) {
  const [albums, setAlbums] = useState<any[]>([]);
  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  
  const [newAlbumName, setNewAlbumName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // Load Albums
  useEffect(() => {
    const albumsRef = ref(db, `plans/${planId}/gallery/albums`);
    const unsubscribe = onValue(albumsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({
          id,
          ...val,
          photos: val.photos ? Object.entries(val.photos).map(([pid, pval]: any) => ({ id: pid, ...pval })) : []
        }));
        setAlbums(list.reverse());
      } else {
        setAlbums([]);
      }
    });
    return () => unsubscribe();
  }, [planId]);

  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlbumName.trim()) return;
    push(ref(db, `plans/${planId}/gallery/albums`), {
      name: newAlbumName,
      createdBy: currentUser,
      createdAt: Date.now(),
      theme: 'paper' // Default theme
    });
    setNewAlbumName('');
    setShowCreateModal(false);
  };

  const handleUpdateTheme = (themeValue: string) => {
    if (activeAlbumId) {
      update(ref(db, `plans/${planId}/gallery/albums/${activeAlbumId}`), { theme: themeValue });
      // Don't close picker immediately if setting color, but close for presets
      if (!themeValue.startsWith('#')) setShowThemePicker(false);
    }
  };

  const handleUploadBgImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeAlbumId) {
      try {
        const bgBase64 = await compressImage(e.target.files[0]);
        update(ref(db, `plans/${planId}/gallery/albums/${activeAlbumId}`), { theme: bgBase64 });
        setShowThemePicker(false);
      } catch (err) {
        console.error("BG Upload failed", err);
      }
    }
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !activeAlbumId) return;
    
    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(photoFile);
      push(ref(db, `plans/${planId}/gallery/albums/${activeAlbumId}/photos`), {
        url: compressedBase64,
        caption: photoCaption.slice(0, MAX_CAPTION_LENGTH), // Ensure limit on submit
        uploadedBy: currentUser,
        timestamp: Date.now()
      });
      setShowUploadModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoCaption('');
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload photo. Try a smaller one.");
    } finally {
      setIsUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteAlbum = (e: React.MouseEvent, albumId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this entire album and all photos?")) {
      remove(ref(db, `plans/${planId}/gallery/albums/${albumId}`));
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    if (window.confirm("Delete this photo?")) {
      remove(ref(db, `plans/${planId}/gallery/albums/${activeAlbumId}/photos/${photoId}`));
      setLightboxPhoto(null);
    }
  };

  // Determine Background Style
  const activeAlbum = albums.find(a => a.id === activeAlbumId);
  let bgStyle: React.CSSProperties = {};
  let bgClassName = "bg-skin-base";

  if (activeAlbum?.theme) {
    if (activeAlbum.theme.startsWith('#')) {
      bgStyle = { backgroundColor: activeAlbum.theme };
      bgClassName = "";
    } else if (activeAlbum.theme.startsWith('data:')) {
      bgStyle = { backgroundImage: `url(${activeAlbum.theme})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      bgClassName = "";
    } else if (BACKGROUND_PATTERNS[activeAlbum.theme]) {
      bgClassName = BACKGROUND_PATTERNS[activeAlbum.theme];
    }
  } else {
    bgClassName = BACKGROUND_PATTERNS['paper'];
  }

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[500px]">
      
      {/* --- VIEW 1: ALBUMS GRID --- */}
      {!activeAlbumId ? (
        <>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-skin-text tracking-tight">Gallery</h2>
              <p className="text-skin-muted text-sm">Memories & Snapshots</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-skin-text text-skin-base px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Album</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {albums.length === 0 ? (
              <div className="col-span-full text-center py-20 border-2 border-dashed border-skin-muted/10 rounded-2xl">
                <div className="flex justify-center mb-2 text-skin-muted"><FolderIcon className="w-8 h-8" /></div>
                <p className="text-skin-muted font-bold text-sm">No albums yet.</p>
              </div>
            ) : (
              albums.map(album => (
                <div 
                  key={album.id} 
                  onClick={() => setActiveAlbumId(album.id)}
                  className="group relative aspect-square bg-skin-card rounded-2xl border border-skin-muted/20 p-3 flex flex-col cursor-pointer hover:border-skin-primary/50 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  {/* Cover Collage */}
                  <div className="flex-1 rounded-xl bg-skin-base overflow-hidden relative mb-3 grid grid-cols-2 gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    {album.photos.length > 0 ? (
                      album.photos.slice(0, 4).map((p: any, i: number) => (
                        <img 
                          key={i} 
                          src={p.url} 
                          className={clsx(
                            "w-full h-full object-cover",
                            album.photos.length === 1 && "col-span-2 row-span-2",
                            album.photos.length === 2 && "col-span-2 row-span-1",
                            album.photos.length === 3 && i === 0 && "col-span-2"
                          )} 
                          alt="" 
                        />
                      ))
                    ) : (
                      <div className="col-span-2 row-span-2 flex items-center justify-center text-skin-muted/30">
                        <FolderIcon className="w-12 h-12" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <div className="overflow-hidden">
                      <h3 className="font-bold text-skin-text text-sm truncate">{album.name}</h3>
                      <p className="text-[10px] text-skin-muted">{album.photos.length} photos</p>
                    </div>
                    {album.createdBy === currentUser && (
                      <button 
                        onClick={(e) => handleDeleteAlbum(e, album.id)}
                        className="text-skin-muted hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Album"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        /* --- VIEW 2: SCRAPBOOK VIEW --- */
        <div 
          className={clsx("relative rounded-3xl min-h-[600px] border border-skin-muted/10 transition-colors duration-500 overflow-hidden shadow-inner", bgClassName)}
          style={bgStyle}
        >
          
          {/* Scrapbook Header */}
          <div className="flex justify-between items-center p-6 backdrop-blur-md bg-white/70 sticky top-0 z-20 border-b border-white/20">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveAlbumId(null)}
                className="w-10 h-10 rounded-full bg-white/80 border border-black/5 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
              >
                <BackIcon className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none drop-shadow-sm">{activeAlbum.name}</h2>
                <p className="text-gray-600 text-xs font-medium">by {activeAlbum.createdBy}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <button 
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                  title="Change Background"
                >
                  <PaletteIcon className="w-5 h-5 text-gray-700" />
                </button>
                {showThemePicker && (
                  <div className="absolute right-0 top-12 bg-white p-3 rounded-2xl shadow-xl border border-gray-100 flex flex-col gap-3 w-48 z-30 animate-in fade-in zoom-in duration-200">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Patterns</p>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(BACKGROUND_PATTERNS).map(t => (
                          <button
                            key={t}
                            onClick={() => handleUpdateTheme(t)}
                            className={clsx(
                              "w-full aspect-square rounded-lg border hover:scale-105 transition-transform",
                              BACKGROUND_PATTERNS[t]
                            )}
                            title={t}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Solid Color</p>
                      <div className="flex gap-2 items-center">
                        <input 
                          type="color" 
                          className="w-full h-8 cursor-pointer rounded-lg border-0 p-0"
                          onChange={(e) => handleUpdateTheme(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Custom Image</p>
                      <label className="flex items-center justify-center gap-2 w-full p-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 cursor-pointer hover:bg-gray-200 transition-colors">
                        <UploadIcon className="w-3 h-3" /> Upload
                        <input 
                          type="file" 
                          ref={bgFileInputRef}
                          accept="image/*" 
                          onChange={handleUploadBgImage}
                          className="hidden" 
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-all shadow-md"
              >
                <CameraIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Photo</span>
              </button>
            </div>
          </div>

          {/* Photos Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-8 pb-32">
            {activeAlbum.photos.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500/50">
                <CameraIcon className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-handwriting text-xl">This page is empty...</p>
              </div>
            ) : (
              activeAlbum.photos.map((photo: any) => {
                const rot = (getDeterministicRandom(photo.id, 10) - 5); // -5 to 5
                const tapeStyle = TAPE_STYLES[getDeterministicRandom(photo.id, TAPE_STYLES.length)];
                const aspectClass = ASPECT_RATIOS[getDeterministicRandom(photo.id, ASPECT_RATIOS.length)];
                
                return (
                  <div 
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo)}
                    className="group relative bg-white p-3 pb-8 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer ease-out hover:z-10 hover:scale-105 hover:rotate-0 self-center"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    {/* Washi Tape */}
                    <div className={clsx(
                      "absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-7 opacity-90 shadow-sm pointer-events-none transition-transform group-hover:scale-110",
                      tapeStyle
                    )} />
                    
                    {/* Photo Content */}
                    <div className={clsx("bg-gray-100 overflow-hidden mb-2 border border-gray-100", aspectClass)}>
                      <img src={photo.url} className="w-full h-full object-cover filter contrast-[1.05]" alt="Memory" />
                    </div>
                    
                    {/* Caption */}
                    {photo.caption ? (
                      <p className="text-center font-handwriting text-gray-700 text-sm leading-tight px-1 font-bold opacity-80">
                        {photo.caption}
                      </p>
                    ) : (
                      <div className="h-4" /> 
                    )}
                    
                    <div className="absolute bottom-2 right-2 text-[8px] text-gray-400 font-mono tracking-tighter opacity-50">
                      {format(photo.timestamp, 'MM.dd')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      
      {/* Create Album */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-skin-muted/10">
              <h3 className="font-black text-lg text-skin-text mb-4">New Album</h3>
              <form onSubmit={handleCreateAlbum} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Album Name</label>
                    <input 
                      required
                      autoFocus
                      placeholder="e.g. Food Trip 🍔"
                      value={newAlbumName}
                      onChange={e => setNewAlbumName(e.target.value)}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-xl px-4 py-3 text-sm font-bold text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary"
                    />
                 </div>
                 <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-xl shadow-lg">Create</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Upload Photo */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-skin-muted/10">
              <h3 className="font-black text-lg text-skin-text mb-4">Add to Scrapbook</h3>
              
              {!photoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 bg-skin-base border-2 border-dashed border-skin-muted/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-skin-primary transition-colors mb-4 group"
                >
                   <CameraIcon className="w-8 h-8 text-skin-muted mb-2 group-hover:text-skin-primary transition-colors" />
                   <span className="text-xs font-bold text-skin-muted group-hover:text-skin-text">Tap to select photo</span>
                   <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="w-full h-48 bg-black/5 rounded-xl overflow-hidden relative flex items-center justify-center">
                      <img src={photoPreview} className="max-w-full max-h-full object-contain shadow-sm" alt="Preview" />
                      <button 
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full text-xs hover:bg-black/70"
                      >
                        ✕
                      </button>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Caption</label>
                      <div className="relative">
                        <input 
                          placeholder="Scribble a note..."
                          value={photoCaption}
                          maxLength={MAX_CAPTION_LENGTH}
                          onChange={e => setPhotoCaption(e.target.value)}
                          className="w-full bg-skin-base border border-skin-muted/20 rounded-xl px-4 py-2 text-sm font-handwriting text-lg focus:outline-none focus:ring-2 focus:ring-skin-primary placeholder:font-sans placeholder:text-sm pr-10"
                        />
                        <span className={clsx(
                          "absolute right-3 top-2.5 text-[10px]",
                          photoCaption.length === MAX_CAPTION_LENGTH ? "text-red-500 font-bold" : "text-skin-muted"
                        )}>
                          {photoCaption.length}/{MAX_CAPTION_LENGTH}
                        </span>
                      </div>
                   </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                 <button type="button" onClick={() => { setShowUploadModal(false); setPhotoPreview(null); }} className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-xl">Cancel</button>
                 <button 
                   onClick={handleUploadPhoto}
                   disabled={!photoFile || isUploading}
                   className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none"
                 >
                   {isUploading ? 'Gluing...' : 'Stick it!'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
           <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img src={lightboxPhoto.url} className="max-w-full max-h-[70vh] rounded-lg shadow-2xl border-4 border-white" alt="Full size" />
              
              <div className="mt-6 text-center">
                 {lightboxPhoto.caption && <p className="text-white text-2xl font-handwriting transform -rotate-1">{lightboxPhoto.caption}</p>}
                 <div className="flex items-center justify-center gap-2 mt-2 text-white/50 text-xs uppercase tracking-widest font-bold">
                   <span>{lightboxPhoto.uploadedBy}</span>
                   <span>•</span>
                   <span>{format(lightboxPhoto.timestamp, 'PPP p')}</span>
                 </div>
              </div>

              {lightboxPhoto.uploadedBy === currentUser && (
                <button 
                  onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                  className="absolute top-4 right-4 bg-white/10 text-white p-3 rounded-full hover:bg-red-500 hover:text-white transition-colors backdrop-blur-md"
                  title="Delete Photo"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
              
              <button 
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white p-2"
              >
                Close ✕
              </button>
           </div>
        </div>
      )}

    </div>
  );
}