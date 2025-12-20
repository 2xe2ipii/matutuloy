import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, remove } from 'firebase/database';
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

// --- HELPER: Compress Image for Realtime DB (Max 800px) ---
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 800;
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
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality JPEG
      };
    };
  });
};

// --- HELPER: Deterministic Random Rotation ---
// Generates a consistent rotation angle based on the ID string
const getRotation = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Return a number between -6 and 6
  return (hash % 12) - 6;
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
  
  // Create Album State
  const [newAlbumName, setNewAlbumName] = useState('');

  // Upload Photo State
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Lightbox State
  const [lightboxPhoto, setLightboxPhoto] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    });
    setNewAlbumName('');
    setShowCreateModal(false);
  };

  const handleUploadPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile || !activeAlbumId) return;
    
    setIsUploading(true);
    try {
      const compressedBase64 = await compressImage(photoFile);
      push(ref(db, `plans/${planId}/gallery/albums/${activeAlbumId}/photos`), {
        url: compressedBase64,
        caption: photoCaption,
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

  const activeAlbum = albums.find(a => a.id === activeAlbumId);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 min-h-[400px]">
      
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
                  className="group relative aspect-square bg-skin-card rounded-2xl border border-skin-muted/20 p-3 flex flex-col cursor-pointer hover:border-skin-primary/50 hover:shadow-lg transition-all"
                >
                  {/* Album Cover Preview (Collage of up to 4 photos) */}
                  <div className="flex-1 rounded-xl bg-skin-base overflow-hidden relative mb-3 grid grid-cols-2 gap-0.5">
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
                    <div>
                      <h3 className="font-bold text-skin-text text-sm truncate max-w-[120px]">{album.name}</h3>
                      <p className="text-[10px] text-skin-muted">{album.photos.length} photos</p>
                    </div>
                    {album.createdBy === currentUser && (
                      <button 
                        onClick={(e) => handleDeleteAlbum(e, album.id)}
                        className="text-skin-muted hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
        /* --- VIEW 2: INSIDE ALBUM (SCRAPBOOK) --- */
        <>
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setActiveAlbumId(null)}
                className="w-10 h-10 rounded-full bg-skin-card border border-skin-muted/20 flex items-center justify-center hover:bg-skin-base transition-colors"
              >
                <BackIcon className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-skin-text tracking-tight">{activeAlbum.name}</h2>
                <p className="text-skin-muted text-xs">Created by {activeAlbum.createdBy}</p>
              </div>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-skin-text text-skin-base px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md"
            >
              <CameraIcon className="w-4 h-4" />
              <span>Add Photo</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 p-4">
            {activeAlbum.photos.length === 0 ? (
              <div className="col-span-full text-center py-20 text-skin-muted italic">
                No photos in this scrapbook yet.
              </div>
            ) : (
              activeAlbum.photos.map((photo: any) => {
                const rot = getRotation(photo.id);
                return (
                  <div 
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo)}
                    className="group relative bg-white p-3 pb-8 shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer ease-out hover:z-10 hover:scale-110"
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    {/* The Tape Effect */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-yellow-100/50 rotate-[-2deg] opacity-80 backdrop-blur-sm pointer-events-none" />
                    
                    <div className="aspect-square bg-gray-100 overflow-hidden mb-2">
                      <img src={photo.url} className="w-full h-full object-cover" alt="Memory" />
                    </div>
                    
                    {photo.caption && (
                      <p className="text-center font-handwriting text-gray-600 text-sm leading-tight px-1 font-medium transform -rotate-1">
                        {photo.caption}
                      </p>
                    )}
                    
                    <div className="absolute bottom-2 right-2 text-[8px] text-gray-400">
                      {format(photo.timestamp, 'MMM d')}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* MODALS */}
      
      {/* Create Album Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
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

      {/* Upload Photo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="font-black text-lg text-skin-text mb-4">Add to Scrapbook</h3>
              
              {!photoPreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 bg-skin-base border-2 border-dashed border-skin-muted/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-skin-primary transition-colors mb-4"
                >
                   <CameraIcon className="w-8 h-8 text-skin-muted mb-2" />
                   <span className="text-xs font-bold text-skin-muted">Tap to select photo</span>
                   <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} className="hidden" />
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="w-full h-48 bg-black rounded-xl overflow-hidden relative">
                      <img src={photoPreview} className="w-full h-full object-contain" alt="Preview" />
                      <button 
                        onClick={() => { setPhotoPreview(null); setPhotoFile(null); }}
                        className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full text-xs"
                      >
                        ✕
                      </button>
                   </div>
                   <div>
                      <label className="text-[10px] font-bold text-skin-muted uppercase mb-1 block">Caption (Optional)</label>
                      <input 
                        placeholder="What's happening here?"
                        value={photoCaption}
                        onChange={e => setPhotoCaption(e.target.value)}
                        className="w-full bg-skin-base border border-skin-muted/20 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-skin-primary"
                      />
                   </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                 <button type="button" onClick={() => { setShowUploadModal(false); setPhotoPreview(null); }} className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-xl">Cancel</button>
                 <button 
                   onClick={handleUploadPhoto}
                   disabled={!photoFile || isUploading}
                   className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-xl shadow-lg disabled:opacity-50"
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
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxPhoto(null)}
        >
           <div className="relative max-w-4xl w-full max-h-screen flex flex-col items-center" onClick={e => e.stopPropagation()}>
              <img src={lightboxPhoto.url} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" alt="Full size" />
              
              <div className="mt-4 text-center">
                 {lightboxPhoto.caption && <p className="text-white text-lg font-medium">{lightboxPhoto.caption}</p>}
                 <p className="text-white/50 text-sm mt-1">
                   Uploaded by {lightboxPhoto.uploadedBy} on {format(lightboxPhoto.timestamp, 'PPP p')}
                 </p>
              </div>

              {lightboxPhoto.uploadedBy === currentUser && (
                <button 
                  onClick={() => handleDeletePhoto(lightboxPhoto.id)}
                  className="absolute top-4 right-4 bg-white/10 text-white p-2 rounded-full hover:bg-red-500 hover:text-white transition-colors backdrop-blur-sm"
                  title="Delete Photo"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
              
              <button 
                onClick={() => setLightboxPhoto(null)}
                className="absolute -top-12 right-0 text-white/50 hover:text-white"
              >
                Close ✕
              </button>
           </div>
        </div>
      )}

    </div>
  );
}