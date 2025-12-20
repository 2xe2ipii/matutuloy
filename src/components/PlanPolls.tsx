import { useState, useEffect, useRef } from 'react';
import { ref, push, onValue, update, remove } from 'firebase/database';
import { db } from '../firebase';
import { clsx } from 'clsx';

// --- ICONS ---
const PlusIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const TrashIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const CheckIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="20 6 9 17 4 12"/></svg>
);
const ImageIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
const EyeOffIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
);

interface Props {
  planId: string;
  currentUser: string;
}

interface PollOption {
  id: string;
  text: string;
  votes?: Record<string, boolean>; // userId -> true
}

interface Poll {
  id: string;
  question: string;
  image?: string; // Optional context image
  isAnonymous: boolean;
  allowMultiple: boolean;
  createdBy: string;
  createdAt: number;
  options: Record<string, PollOption>;
}

export default function PlanPolls({ planId, currentUser }: Props) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Create Form State
  const [question, setQuestion] = useState('');
  const [pollImage, setPollImage] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(true);
  const [options, setOptions] = useState<string[]>(['', '']); // Start with 2 empty options
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const pollsRef = ref(db, `plans/${planId}/polls`);
    const unsubscribe = onValue(pollsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]: any) => ({
          id,
          ...val,
          // Normalize options to array-like for easier mapping later if needed, but keeping as Record for DB
        }));
        setPolls(list.reverse()); // Newest first
      } else {
        setPolls([]);
      }
    });
    return () => unsubscribe();
  }, [planId]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOptionField = () => {
    setOptions([...options, '']);
  };

  const removeOptionField = (index: number) => {
    if (options.length <= 2) return; // Minimum 2 options
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) setPollImage(ev.target.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim() !== '');
    if (!question.trim() || validOptions.length < 2) return;

    // Convert options array to object for Firebase
    const optionsMap: Record<string, any> = {};
    validOptions.forEach((opt, idx) => {
      const optId = `opt_${Date.now()}_${idx}`;
      optionsMap[optId] = { id: optId, text: opt };
    });

    const newPoll = {
      question,
      image: pollImage || null,
      isAnonymous,
      allowMultiple,
      createdBy: currentUser,
      createdAt: Date.now(),
      options: optionsMap
    };

    await push(ref(db, `plans/${planId}/polls`), newPoll);
    
    // Reset
    setShowModal(false);
    setQuestion('');
    setPollImage(null);
    setIsAnonymous(false);
    setAllowMultiple(true);
    setOptions(['', '']);
  };

  const handleDeletePoll = (pollId: string) => {
    if (window.confirm("Delete this poll?")) {
      remove(ref(db, `plans/${planId}/polls/${pollId}`));
    }
  };

  const toggleVote = (poll: Poll, optionId: string) => {
    const option = poll.options[optionId];
    const hasVoted = option.votes?.[currentUser];

    if (hasVoted) {
      // Remove vote
      remove(ref(db, `plans/${planId}/polls/${poll.id}/options/${optionId}/votes/${currentUser}`));
    } else {
      // Add vote
      // If NOT multiple choice, remove vote from other options first
      if (!poll.allowMultiple) {
        Object.keys(poll.options).forEach(otherOptId => {
          if (poll.options[otherOptId].votes?.[currentUser]) {
             remove(ref(db, `plans/${planId}/polls/${poll.id}/options/${otherOptId}/votes/${currentUser}`));
          }
        });
      }
      update(ref(db, `plans/${planId}/polls/${poll.id}/options/${optionId}/votes`), {
        [currentUser]: true
      });
    }
  };

  // Helper to calculate percentages
  const getPollStats = (poll: Poll) => {
    let totalVotes = 0;
    const stats: Record<string, { count: number; percent: number; voters: string[] }> = {};

    Object.values(poll.options || {}).forEach((opt: any) => {
      const voters = opt.votes ? Object.keys(opt.votes) : [];
      stats[opt.id] = { count: voters.length, percent: 0, voters };
      totalVotes += voters.length;
    });

    if (totalVotes > 0) {
      Object.keys(stats).forEach(id => {
        stats[id].percent = Math.round((stats[id].count / totalVotes) * 100);
      });
    }

    return { totalVotes, stats };
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-skin-text tracking-tight">Polls</h2>
          <p className="text-skin-muted text-sm">Help the group decide!</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-skin-text text-skin-base px-4 py-2 rounded-full text-sm font-bold hover:opacity-90 transition-all shadow-md"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Poll</span>
        </button>
      </div>

      {/* POLLS LIST */}
      <div className="space-y-6">
        {polls.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-skin-muted/10 rounded-2xl bg-skin-base/30">
            <p className="text-skin-muted font-bold text-sm">No polls active.</p>
            <p className="text-skin-muted/50 text-xs mt-1">Create one to start voting.</p>
          </div>
        ) : (
          polls.map(poll => {
            const { totalVotes, stats } = getPollStats(poll);
            
            return (
              <div key={poll.id} className="bg-skin-card border border-skin-muted/20 rounded-2xl p-5 shadow-sm">
                
                {/* Poll Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {/* Poll Image if available */}
                    {poll.image && (
                      <div className="mb-3 rounded-xl overflow-hidden h-32 w-full object-cover border border-skin-muted/10">
                        <img src={poll.image} alt="Context" className="w-full h-full object-cover" />
                      </div>
                    )}
                    
                    <h3 className="font-bold text-lg text-skin-text leading-snug">{poll.question}</h3>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-skin-muted font-bold uppercase tracking-wider">
                      <span>By {poll.createdBy}</span>
                      {poll.isAnonymous && (
                        <span className="flex items-center gap-1 bg-skin-base px-1.5 py-0.5 rounded text-skin-text/70">
                          <EyeOffIcon className="w-3 h-3" /> Anonymous
                        </span>
                      )}
                      <span>• {poll.allowMultiple ? 'Multiple Choice' : 'Single Choice'}</span>
                    </div>
                  </div>
                  
                  {poll.createdBy === currentUser && (
                    <button 
                      onClick={() => handleDeletePoll(poll.id)}
                      className="text-skin-muted hover:text-red-500 p-2 -mr-2 -mt-2 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Options List */}
                <div className="space-y-2">
                  {Object.values(poll.options || {}).map((option: any) => {
                    const isSelected = option.votes?.[currentUser];
                    const { count, percent, voters } = stats[option.id];
                    
                    return (
                      <div 
                        key={option.id}
                        onClick={() => toggleVote(poll, option.id)}
                        className={clsx(
                          "relative group overflow-hidden rounded-xl border transition-all cursor-pointer select-none",
                          isSelected 
                            ? "border-skin-primary bg-skin-primary/5" 
                            : "border-skin-muted/20 bg-skin-base hover:border-skin-primary/30"
                        )}
                      >
                        {/* Progress Bar Background */}
                        <div 
                          className="absolute inset-0 bg-skin-primary/10 transition-all duration-500 ease-out"
                          style={{ width: `${percent}%` }}
                        />

                        <div className="relative p-3 flex justify-between items-center z-10">
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              isSelected 
                                ? "border-skin-primary bg-skin-primary text-skin-primary-fg" 
                                : "border-skin-muted/40 text-transparent"
                            )}>
                              <CheckIcon className="w-3 h-3" />
                            </div>
                            <span className="text-sm font-bold text-skin-text">{option.text}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* Avatar Pile (if not anonymous) */}
                            {!poll.isAnonymous && voters.length > 0 && (
                              <div className="flex -space-x-1.5 mr-1">
                                {voters.slice(0, 3).map((voter, i) => (
                                  <div key={i} className="w-5 h-5 rounded-full bg-skin-card border border-skin-muted/10 flex items-center justify-center text-[8px] font-bold text-skin-muted shadow-sm">
                                    {voter[0]}
                                  </div>
                                ))}
                                {voters.length > 3 && (
                                  <div className="w-5 h-5 rounded-full bg-skin-muted text-skin-base flex items-center justify-center text-[8px] font-bold shadow-sm">
                                    +{voters.length - 3}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <span className="text-xs font-bold text-skin-muted">{count}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-3 text-right text-xs text-skin-muted/50 font-medium">
                  Total votes: {totalVotes}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-skin-card w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh] border border-skin-muted/10">
              <h3 className="font-black text-xl text-skin-text mb-4">Create Poll</h3>
              
              <form onSubmit={handleCreatePoll} className="space-y-4 overflow-y-auto pr-1">
                 
                 {/* Poll Image */}
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="w-full h-32 bg-skin-base/50 border-2 border-dashed border-skin-muted/20 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-skin-primary/50 transition-colors overflow-hidden relative group"
                 >
                    {pollImage ? (
                      <img src={pollImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-skin-muted group-hover:text-skin-primary">
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase">Add Photo (Optional)</span>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                 </div>

                 {/* Question */}
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-1.5 block ml-1">Question</label>
                    <input 
                      required
                      autoFocus
                      placeholder="e.g. Where should we stay?"
                      value={question}
                      onChange={e => setQuestion(e.target.value)}
                      className="w-full bg-skin-base border border-skin-muted/20 rounded-xl px-4 py-3 text-sm font-bold text-skin-text focus:outline-none focus:ring-2 focus:ring-skin-primary/20 focus:border-skin-primary transition-all"
                    />
                 </div>

                 {/* Options */}
                 <div>
                    <label className="text-[10px] font-bold text-skin-muted uppercase mb-2 block ml-1">Options</label>
                    <div className="space-y-2">
                      {options.map((opt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input 
                            placeholder={`Option ${idx + 1}`}
                            value={opt}
                            onChange={e => handleOptionChange(idx, e.target.value)}
                            className="flex-1 bg-skin-base border border-skin-muted/20 rounded-lg px-3 py-2 text-sm focus:border-skin-primary outline-none"
                          />
                          {options.length > 2 && (
                            <button 
                              type="button" 
                              onClick={() => removeOptionField(idx)}
                              className="text-skin-muted hover:text-red-500 p-2"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      onClick={addOptionField}
                      className="mt-2 text-xs font-bold text-skin-primary hover:underline flex items-center gap-1"
                    >
                      <PlusIcon className="w-3 h-3" /> Add another option
                    </button>
                 </div>

                 {/* Settings */}
                 <div className="flex flex-col gap-2 pt-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-skin-base border border-skin-muted/10 cursor-pointer hover:bg-skin-base/80">
                       <input 
                         type="checkbox" 
                         checked={isAnonymous} 
                         onChange={e => setIsAnonymous(e.target.checked)}
                         className="w-4 h-4 rounded border-skin-muted text-skin-primary focus:ring-skin-primary"
                       />
                       <div className="flex-1">
                         <span className="block text-sm font-bold text-skin-text">Anonymous Voting</span>
                         <span className="block text-[10px] text-skin-muted">Hide who voted for what</span>
                       </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-skin-base border border-skin-muted/10 cursor-pointer hover:bg-skin-base/80">
                       <input 
                         type="checkbox" 
                         checked={allowMultiple} 
                         onChange={e => setAllowMultiple(e.target.checked)}
                         className="w-4 h-4 rounded border-skin-muted text-skin-primary focus:ring-skin-primary"
                       />
                       <div className="flex-1">
                         <span className="block text-sm font-bold text-skin-text">Allow Multiple Answers</span>
                         <span className="block text-[10px] text-skin-muted">Voters can select more than one option</span>
                       </div>
                    </label>
                 </div>

                 <div className="flex gap-3 pt-4 border-t border-skin-muted/10">
                    <button 
                      type="button" 
                      onClick={() => setShowModal(false)} 
                      className="flex-1 py-2.5 text-sm font-bold text-skin-muted hover:bg-skin-base rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="flex-1 py-2.5 text-sm font-bold bg-skin-text text-skin-base rounded-xl shadow-lg hover:opacity-90 transition-all"
                    >
                      Launch Poll
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}