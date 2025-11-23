import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Smartphone, Share2, QrCode, Edit2, Save, X } from 'lucide-react';
import { User } from '../types';

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser, updateUserName } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  
  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim());
      setNewUserName('');
      setIsAdding(false);
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditName('');
  };

  const saveName = (userId: string) => {
    if (editName.trim()) {
      updateUserName(userId, editName.trim());
      setEditingUserId(null);
    }
  };

  return (
    <div className="animate-fade-in space-y-8 pb-8">
      
      {/* Profile Management Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Rider Profiles</h2>
        
        <div className="grid grid-cols-1 gap-3">
          {users.map(user => (
            <div
              key={user.id}
              onClick={() => !editingUserId && switchUser(user.id)}
              className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${
                user.id === activeUser.id 
                  ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <div className={`w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center text-lg font-bold shadow-lg mr-4 shrink-0`}>
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1 text-left min-w-0">
                {editingUserId === user.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white w-full focus:ring-2 focus:ring-primary focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveName(user.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <button 
                      onClick={() => saveName(user.id)} 
                      className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20"
                      title="Save"
                    >
                      <Save size={18} />
                    </button>
                    <button 
                      onClick={cancelEditing} 
                      className="p-2 bg-slate-700/50 text-slate-400 rounded-lg hover:text-white"
                      title="Cancel"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full">
                    <div className="min-w-0">
                      <h3 className={`font-semibold text-lg truncate ${user.id === activeUser.id ? 'text-white' : 'text-slate-200'}`}>
                        {user.name}
                      </h3>
                      {user.id === activeUser.id && (
                        <span className="text-xs text-primary font-medium flex items-center mt-1">
                            <CheckCircle2 size={12} className="mr-1"/> Active Rider
                        </span>
                      )}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); startEditing(user); }}
                      className="p-2 text-slate-500 hover:text-white hover:bg-slate-600/50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Rename User"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 transition flex items-center justify-center gap-2"
          >
            <UserPlus size={20} />
            Add Family Member
          </button>
        ) : (
          <form onSubmit={handleAdd} className="bg-slate-800 p-4 rounded-xl border border-slate-700 animate-fade-in-down">
              <label className="block text-sm text-slate-400 mb-2 font-medium">New Rider Name</label>
              <div className="flex gap-2">
                  <input 
                      type="text" 
                      autoFocus
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Enter name..."
                      className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <button 
                      type="submit"
                      disabled={!newUserName.trim()}
                      className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                      Add
                  </button>
                  <button 
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="text-slate-400 px-3 hover:text-white transition-colors"
                  >
                      Cancel
                  </button>
              </div>
          </form>
        )}
      </div>

      {/* Mobile Install Section */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white">
            <Smartphone className="text-primary" size={24} />
            <h2 className="text-xl font-bold">Get Mobile App</h2>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* QR Code */}
                <div className="bg-white p-3 rounded-xl shadow-lg flex-none">
                    {currentUrl && (
                        <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}&bgcolor=ffffff`}
                            alt="Scan to open on mobile"
                            className="w-32 h-32 md:w-40 md:h-40"
                        />
                    )}
                </div>

                {/* Instructions */}
                <div className="flex-1 space-y-4">
                    <div>
                        <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                            <QrCode size={16} className="text-slate-400"/> 
                            1. Scan with Phone
                        </h3>
                        <p className="text-sm text-slate-400">
                            Open your phone's camera and scan the QR code to open CoasterCount Pro on your device.
                        </p>
                    </div>

                    <div className="space-y-3 pt-2">
                         <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                            <Share2 size={16} className="text-slate-400"/> 
                            2. Add to Home Screen
                        </h3>
                        
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1">iPhone (Safari)</p>
                            <p className="text-xs text-slate-400">
                                Tap the <span className="text-blue-400 font-bold">Share</span> icon (box with arrow) → Scroll down → Tap <span className="text-white font-bold">Add to Home Screen</span>.
                            </p>
                        </div>
                        
                        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                            <p className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-1">Android (Chrome)</p>
                            <p className="text-xs text-slate-400">
                                Tap the <span className="text-white font-bold">Three Dots</span> menu → Select <span className="text-white font-bold">Add to Home screen</span> or <span className="text-white font-bold">Install App</span>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
      
      <div className="p-4 rounded-xl text-xs text-slate-600 text-center">
          <p>CoasterCount Pro v1.1.0</p>
          <p>Built for Enthusiasts</p>
      </div>
    </div>
  );
};

export default ProfileManager;