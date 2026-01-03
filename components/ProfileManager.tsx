
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Smartphone, Share2, QrCode, Edit2, Save, X, FileSpreadsheet, Database, Download, Cloud, PaintBucket, Sparkles, Loader2, Copy, ExternalLink, Camera, ImageDown, Upload, Wrench, Share, FileJson, Trophy } from 'lucide-react';
import { User } from '../types';

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser, updateUser, credits, wishlist, coasters, generateIcon, enrichDatabaseImages, importData, standardizeDatabase, changeView } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhoto, setNewUserPhoto] = useState<File | undefined>(undefined);
  const [isEnriching, setIsEnriching] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhoto, setEditPhoto] = useState<File | undefined>(undefined);

  const startEditing = (user: User) => {
    setEditingUserId(user.id);
    setEditName(user.name);
  };

  const handleExportCSV = () => {
    const userCredits = credits.filter(c => c.userId === activeUser.id);
    const headers = ['Coaster Name', 'Park', 'Country', 'Manufacturer', 'Type', 'Date Ridden', 'Notes'];
    const rows = userCredits.map(credit => {
      const c = coasters.find(item => item.id === credit.coasterId);
      if (!c) return null;
      const escape = (t: string) => `"${(t || '').replace(/"/g, '""')}"`;
      return [escape(c.name), escape(c.park), escape(c.country), escape(c.manufacturer), escape(c.type), escape(credit.date), escape(credit.notes || '')].join(',');
    }).filter(r => r !== null);
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CoasterCount_${activeUser.name.replace(/\s+/g, '_')}.csv`;
    link.click();
  };

  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Rider Profiles</h2>
        
        <div className="grid grid-cols-1 gap-3">
          {users.map(user => {
             const isEditing = editingUserId === user.id;
             return (
                <div key={user.id} onClick={() => !isEditing && switchUser(user.id)} className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${user.id === activeUser.id ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="relative mr-4 shrink-0">
                        <div className={`w-12 h-12 rounded-full ${user.avatarUrl ? 'bg-transparent' : user.avatarColor} flex items-center justify-center text-lg font-bold shadow-lg overflow-hidden`}>{user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}</div>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <div className="flex justify-between items-center w-full">
                            <h3 className={`font-semibold text-lg truncate ${user.id === activeUser.id ? 'text-white' : 'text-slate-200'}`}>{user.name}</h3>
                            <button onClick={(e) => { e.stopPropagation(); startEditing(user); }} className="p-2 text-slate-500"><Edit2 size={16} /></button>
                        </div>
                    </div>
                </div>
             );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-8 space-y-6">
        <div className="flex items-center gap-2 mb-4 text-white"><Database className="text-pink-500" size={24} /><h2 className="text-xl font-bold">Database Management</h2></div>
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-xl space-y-4">
             <button onClick={enrichDatabaseImages} className="w-full bg-pink-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-pink-500/20"><Sparkles size={18} /> Fetch Real Photos</button>
             <button onClick={standardizeDatabase} className="w-full bg-indigo-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"><Wrench size={18} /> Fix & Standardize Names</button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white"><Cloud size={24} className="text-primary"/><h2 className="text-xl font-bold">Backups</h2></div>
        <div className="grid grid-cols-2 gap-3"><button onClick={handleExportCSV} className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"><FileSpreadsheet className="mx-auto mb-2 text-green-500" /> <span className="text-xs font-bold">CSV</span></button><button className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center"><Database className="mx-auto mb-2 text-primary" /> <span className="text-xs font-bold">JSON</span></button></div>
      </div>
    </div>
  );
};

export default ProfileManager;
