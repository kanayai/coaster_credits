
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Smartphone, Share2, QrCode, Edit2, Save, X, FileSpreadsheet, Database, Download, Cloud, PaintBucket, Sparkles, Loader2, Copy, ExternalLink, Camera, ImageDown, Upload, Wrench, Share, FileJson } from 'lucide-react';
import { User } from '../types';

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser, updateUser, credits, wishlist, coasters, generateIcon, enrichDatabaseImages, importData, standardizeDatabase } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhoto, setNewUserPhoto] = useState<File | undefined>(undefined);
  const [isEnriching, setIsEnriching] = useState(false);

  const [currentUrl, setCurrentUrl] = useState('');
  
  // Edit state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<File | undefined>(undefined);

  // Icon Gen State
  const [iconPrompt, setIconPrompt] = useState('Mexican luchador wrestler with a colorful mask riding in the front row of a roller coaster with hands up screaming in joy');
  const [generatedIconUrl, setGeneratedIconUrl] = useState<string | null>(null);
  const [isGeneratingIcon, setIsGeneratingIcon] = useState(false);

  // Default Icon SVG Data URI (Matches index.html)
  const defaultIconSvg = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Ccircle cx='256' cy='256' r='240' fill='white' stroke='%230f172a' stroke-width='10'/%3E%3Cpath d='M56 320 Q 256 420 456 320' fill='none' stroke='%230ea5e9' stroke-width='20' stroke-linecap='round'/%3E%3Cpath d='M56 320 L 56 480 M 156 350 L 156 480 M 256 370 L 256 480 M 356 350 L 356 480 M 456 320 L 456 480' stroke='%230ea5e9' stroke-width='10'/%3E%3Crect x='156' y='240' width='200' height='100' rx='20' fill='%23facc15' stroke='%23b45309' stroke-width='5'/%3E%3Cpath d='M196 240 L 196 340 M 236 240 L 236 340 M 276 240 L 276 340 M 316 240 L 316 340' stroke='%23ef4444' stroke-width='10'/%3E%3Ccircle cx='180' cy='340' r='25' fill='%23334155'/%3E%3Ccircle cx='330' cy='340' r='25' fill='%23334155'/%3E%3Cpath d='M170 180 Q 140 100 160 60' fill='none' stroke='%23f8c8dc' stroke-width='20' stroke-linecap='round'/%3E%3Cpath d='M342 180 Q 372 100 352 60' fill='none' stroke='%23f8c8dc' stroke-width='20' stroke-linecap='round'/%3E%3Cpath d='M210 240 L 210 150 Q 256 140 302 150 L 302 240 Z' fill='%23f8c8dc'/%3E%3Cpath d='M216 160 Q 216 70 256 70 Q 296 70 296 160 Q 256 180 216 160' fill='%230ea5e9' stroke='%230f172a' stroke-width='3'/%3E%3Cpath d='M236 110 Q 256 100 276 110 L 270 140 Q 256 150 242 140 Z' fill='%23f43f5e'/%3E%3Ccircle cx='242' cy='120' r='4' fill='white'/%3E%3Ccircle cx='270' cy='120' r='4' fill='white'/%3E%3Cpath id='textCurve' d='M 110 390 Q 256 440 402 390' fill='none'/%3E%3Ctext width='512' font-family='sans-serif' font-weight='900' font-size='50' text-anchor='middle' fill='%23ef4444' stroke='white' stroke-width='2'%3E%3CtextPath href='%23textCurve' startOffset='50%25'%3E¡LUCHA RIDE!%3C/textPath%3E%3C/text%3E%3C/svg%3E";

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserName.trim()) {
      addUser(newUserName.trim(), newUserPhoto);
      setNewUserName('');
      setNewUserPhoto(undefined);
      setIsAdding(false);
    }
  };

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
    setEditPhoto(undefined);
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditName('');
    setEditPhoto(undefined);
  };

  const saveUser = (userId: string) => {
    if (editName.trim()) {
      updateUser(userId, editName.trim(), editPhoto);
      setEditingUserId(null);
      setEditPhoto(undefined);
    }
  };

  const handleGenerateIcon = async () => {
    if (!iconPrompt) return;
    setIsGeneratingIcon(true);
    const url = await generateIcon(iconPrompt);
    setIsGeneratingIcon(false);
    if (url) {
      setGeneratedIconUrl(url);
    }
  };

  const handleEnrichImages = async () => {
      setIsEnriching(true);
      await enrichDatabaseImages();
      setIsEnriching(false);
  };

  const handleExportCSV = () => {
    // Filter credits for active user
    const userCredits = credits.filter(c => c.userId === activeUser.id);
    
    // Header row
    const headers = ['Coaster Name', 'Park', 'Country', 'Manufacturer', 'Type', 'Date Ridden', 'Notes'];
    
    // Data rows
    const rows = userCredits.map(credit => {
      const coaster = coasters.find(c => c.id === credit.coasterId);
      if (!coaster) return null;
      
      // Escape field content for CSV (handle commas and quotes)
      const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
      
      return [
        escape(coaster.name),
        escape(coaster.park),
        escape(coaster.country),
        escape(coaster.manufacturer),
        escape(coaster.type),
        escape(credit.date),
        escape(credit.notes || '')
      ].join(',');
    }).filter(row => row !== null);
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CoasterCount_${activeUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCoastersOnly = () => {
      const data = {
          coasters: coasters,
          exportDate: new Date().toISOString(),
          type: 'COASTER_DB_ONLY'
      };
      
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `CoasterDB_Shared_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const data = {
      user: activeUser,
      credits: credits.filter(c => c.userId === activeUser.id),
      wishlist: wishlist.filter(w => w.userId === activeUser.id),
      coasters: coasters, // Export complete coaster DB to preserve custom ones
      exportDate: new Date().toISOString(),
      appVersion: '1.2.0',
      type: 'FULL_BACKUP'
    };
    
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CoasterCount_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const json = JSON.parse(e.target?.result as string);
              const isDbOnly = json.type === 'COASTER_DB_ONLY';
              
              const message = isDbOnly 
                ? "Importing this file will merge new coasters into your database. Your personal credits will NOT be affected. Continue?"
                : "This is a full backup. Importing will merge credits, wishlist items, and coasters into your current profile. Continue?";

              if (window.confirm(message)) {
                  importData(json);
              }
          } catch (err) {
              alert("Invalid JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input
      e.target.value = '';
  };

  return (
    <div className="animate-fade-in space-y-8 pb-8">
      
      {/* Profile Management Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Rider Profiles</h2>
        
        <div className="grid grid-cols-1 gap-3">
          {users.map(user => {
             const isEditing = editingUserId === user.id;
             
             return (
                <div
                key={user.id}
                onClick={() => !isEditing && switchUser(user.id)}
                className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer group ${
                    user.id === activeUser.id 
                    ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]' 
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                }`}
                >
                <div className="relative group/avatar mr-4 shrink-0">
                    <div className={`w-12 h-12 rounded-full ${user.avatarUrl ? 'bg-transparent' : user.avatarColor} flex items-center justify-center text-lg font-bold shadow-lg overflow-hidden`}>
                         {user.avatarUrl ? (
                             <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                         ) : (
                             user.name.substring(0, 2).toUpperCase()
                         )}
                    </div>
                    {isEditing && (
                        <>
                            <input 
                                type="file" 
                                accept="image/*" 
                                id={`edit-avatar-${user.id}`} 
                                className="hidden"
                                onChange={(e) => setEditPhoto(e.target.files?.[0])}
                            />
                            <label 
                                htmlFor={`edit-avatar-${user.id}`}
                                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center cursor-pointer opacity-100 hover:bg-black/70 transition-colors"
                            >
                                <Camera size={20} className="text-white" />
                            </label>
                            {editPhoto && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800" />}
                        </>
                    )}
                </div>
                
                <div className="flex-1 text-left min-w-0">
                    {isEditing ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <input 
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-white w-full focus:ring-2 focus:ring-primary focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveUser(user.id);
                            if (e.key === 'Escape') cancelEditing();
                        }}
                        />
                        <button 
                        onClick={() => saveUser(user.id)} 
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
                        title="Edit User"
                        >
                        <Edit2 size={16} />
                        </button>
                    </div>
                    )}
                </div>
                </div>
             );
          })}
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
              <label className="block text-sm text-slate-400 mb-2 font-medium">New Rider Details</label>
              <div className="flex gap-2">
                  {/* Photo Upload for New User */}
                  <div className="shrink-0 relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        id="new-user-photo" 
                        className="hidden" 
                        onChange={(e) => setNewUserPhoto(e.target.files?.[0])}
                      />
                      <label 
                        htmlFor="new-user-photo" 
                        className={`w-10 h-10 rounded-lg flex items-center justify-center border border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors ${newUserPhoto ? 'bg-primary/20 border-primary' : 'bg-slate-900'}`}
                        title="Add Photo"
                      >
                          <Camera size={20} className={newUserPhoto ? 'text-primary' : 'text-slate-400'} />
                      </label>
                  </div>

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
                      onClick={() => { setIsAdding(false); setNewUserPhoto(undefined); }}
                      className="text-slate-400 px-3 hover:text-white transition-colors"
                  >
                      Cancel
                  </button>
              </div>
          </form>
        )}
      </div>

      {/* Database Management / Image Enrichment */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white">
            <Database className="text-pink-500" size={24} />
            <h2 className="text-xl font-bold">Database Management</h2>
        </div>
        
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-6">
             {/* Section 1: Maintenance */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-3">
                     <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Enhance Photos</p>
                     <p className="text-xs text-slate-500">
                        Fetch real photos from Wikipedia for coasters with placeholders.
                     </p>
                    <button 
                        onClick={handleEnrichImages}
                        disabled={isEnriching}
                        className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-pink-500/20"
                    >
                        {isEnriching ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} />}
                        {isEnriching ? "Searching..." : "Fetch Real Photos"}
                    </button>
                 </div>

                 <div className="space-y-3">
                     <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">Data Cleanup</p>
                     <p className="text-xs text-slate-500">
                        Fix inconsistent naming (e.g. "Arrow" vs "Arrow Dynamics", spaces in park names).
                     </p>
                     <button 
                        onClick={standardizeDatabase}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        <Wrench size={18} />
                        Fix & Standardize Names
                    </button>
                 </div>
             </div>

             <div className="h-px bg-slate-700/50 w-full" />

             {/* Section 2: Sync & Share */}
             <div className="space-y-3">
                 <div className="flex items-center gap-2 text-white">
                    <Share className="text-emerald-400" size={18} />
                    <p className="text-sm font-bold uppercase tracking-wider">Sync / Share Database</p>
                 </div>
                 <p className="text-xs text-slate-500 leading-relaxed">
                    This app stores data on your device. To add custom coasters to another device (e.g. tablet), export the database here and import it on the other device.
                 </p>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                     <button 
                        onClick={handleExportCoastersOnly}
                        className="flex items-center justify-center gap-2 p-3 bg-slate-900 border border-slate-600 rounded-xl hover:bg-slate-700 hover:border-emerald-500/50 transition"
                    >
                        <FileJson size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold text-white">Export Coaster List</span>
                    </button>

                     <div className="relative">
                        <input 
                            type="file" 
                            accept=".json" 
                            id="import-db-only" 
                            className="hidden"
                            onChange={handleImportJSON}
                        />
                        <label 
                            htmlFor="import-db-only"
                            className="flex items-center justify-center gap-2 p-3 bg-slate-900 border border-slate-600 border-dashed rounded-xl hover:bg-slate-700 hover:border-emerald-500/50 transition cursor-pointer h-full"
                        >
                            <Upload size={18} className="text-emerald-400" />
                            <span className="text-xs font-bold text-white">Merge Coaster List</span>
                        </label>
                     </div>
                 </div>
             </div>
        </div>
      </div>

      {/* App Icon Generator */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white">
            <PaintBucket className="text-accent" size={24} />
            <h2 className="text-xl font-bold">Icon Generator</h2>
        </div>
        
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
            <p className="text-sm text-slate-400">
               Want a different icon? Generate a unique one using Gemini AI!
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Icon Idea</label>
                <textarea 
                  value={iconPrompt}
                  onChange={(e) => setIconPrompt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-accent mt-1 h-20"
                />
              </div>
              <button 
                onClick={handleGenerateIcon}
                disabled={isGeneratingIcon}
                className="w-full bg-accent hover:bg-violet-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isGeneratingIcon ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18} />}
                {isGeneratingIcon ? "Creating Magic..." : "Generate Custom Icon"}
              </button>
            </div>

            {generatedIconUrl && (
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-600 flex flex-col items-center animate-fade-in mt-4">
                <p className="text-xs text-green-400 font-bold mb-3 uppercase flex items-center gap-1">
                  <CheckCircle2 size={12}/> Generated Successfully!
                </p>
                <img src={generatedIconUrl} alt="Generated Icon" className="w-32 h-32 rounded-2xl shadow-lg mb-3 bg-white object-cover" />
                <p className="text-center text-xs text-slate-400 mb-4">
                  Long press or right-click to save image. Use a Shortcut app to set as icon.
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Export Section */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white">
            <Cloud className="text-primary" size={24} />
            <h2 className="text-xl font-bold">Full Profile Backup</h2>
        </div>
        
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
            <p className="text-sm text-slate-400">
                Download your coaster credits to back them up or view them in spreadsheet software. 
                You can upload these files to <strong>Google Drive</strong> for safe keeping.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                    onClick={handleExportCSV}
                    className="flex items-center justify-center gap-3 p-4 bg-slate-900 border border-slate-600 rounded-xl hover:bg-slate-700 hover:border-slate-500 transition group"
                >
                    <div className="bg-green-500/10 p-2 rounded-lg group-hover:bg-green-500/20">
                        <FileSpreadsheet className="text-green-500" size={24} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white text-sm">Download CSV</div>
                        <div className="text-[10px] text-slate-400">For Excel / Google Sheets</div>
                    </div>
                </button>

                <button 
                    onClick={handleExportJSON}
                    className="flex items-center justify-center gap-3 p-4 bg-slate-900 border border-slate-600 rounded-xl hover:bg-slate-700 hover:border-slate-500 transition group"
                >
                    <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20">
                        <Database className="text-primary" size={24} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white text-sm">Full Backup</div>
                        <div className="text-[10px] text-slate-400">JSON Format</div>
                    </div>
                </button>
                
                {/* Import Button */}
                <div className="sm:col-span-2 relative">
                    <input 
                        type="file" 
                        accept=".json" 
                        id="import-json" 
                        className="hidden"
                        onChange={handleImportJSON}
                    />
                    <label 
                        htmlFor="import-json"
                        className="flex items-center justify-center gap-3 p-4 bg-slate-900 border border-slate-600 border-dashed rounded-xl hover:bg-slate-800 hover:border-slate-400 transition group cursor-pointer"
                    >
                         <div className="bg-amber-500/10 p-2 rounded-lg group-hover:bg-amber-500/20">
                            <Upload className="text-amber-500" size={24} />
                        </div>
                        <div className="text-left">
                            <div className="font-bold text-white text-sm">Import Profile</div>
                            <div className="text-[10px] text-slate-400">Restore from Full Backup</div>
                        </div>
                    </label>
                </div>
            </div>
        </div>
      </div>

      {/* Install App & Icon Section */}
      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white">
            <Smartphone className="text-primary" size={24} />
            <h2 className="text-xl font-bold">Install App & Get Icon</h2>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl">
            {/* Icon Preview */}
            <div className="flex items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <img src={defaultIconSvg} alt="App Icon" className="w-16 h-16 rounded-xl shadow-lg bg-slate-950" />
                <div>
                    <h3 className="font-bold text-white">Get the Luchador Icon</h3>
                    <p className="text-xs text-slate-400 mt-1">Add to home screen to get this icon and fullscreen mode.</p>
                </div>
            </div>

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
                            Open your phone's camera and scan the QR code to open CoasterCount Pro.
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
          <p>CoasterCount Pro v1.2.0</p>
          <p>Built for Enthusiasts</p>
      </div>
    </div>
  );
};

export default ProfileManager;
