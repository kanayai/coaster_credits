
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Smartphone, Share2, QrCode, Edit2, Save, X, FileSpreadsheet, Database, Download, Cloud, PaintBucket, Sparkles, Loader2, Copy, ExternalLink, Camera, ImageDown, Upload, Wrench, Share, FileJson, Trophy, FileText, Code2, Calendar, Gamepad2, Ticket } from 'lucide-react';
import { User } from '../types';
import { AppTheme } from '../context/AppContext';
import clsx from 'clsx';

const ActivityHeatmap = () => {
    const { credits, activeUser } = useAppContext();
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const activityMap = useMemo(() => {
        const map = new Map<string, number>();
        credits.filter(c => c.userId === activeUser.id).forEach(c => {
            const dateStr = c.date; 
            map.set(dateStr, (map.get(dateStr) || 0) + 1);
        });
        return map;
    }, [credits, activeUser.id]);

    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentDate = new Date(oneYearAgo);
        currentDate.setDate(currentDate.getDate() - currentDate.getDay());
        while (currentDate <= today) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                week.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            weeksArray.push(week);
        }
        return weeksArray;
    }, [today.toDateString(), oneYearAgo.toDateString()]);

    const getIntensityColor = (count: number) => {
        if (count === 0) return 'bg-slate-800';
        if (count === 1) return 'bg-primary/30';
        if (count <= 3) return 'bg-primary/50';
        if (count <= 6) return 'bg-primary/70';
        return 'bg-primary';
    };

    return (
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest"><Calendar size={14} /> Ride History (Last Year)</div>
            <div className="flex gap-[3px] min-w-max pb-6">
                {weeks.map((week, wIdx) => {
                    const firstDay = week[0];
                    const prevWeek = weeks[wIdx - 1];
                    const isNewMonth = !prevWeek || prevWeek[0].getMonth() !== firstDay.getMonth();
                    const monthName = firstDay.toLocaleString('default', { month: 'short' });
                    return (
                        <div key={wIdx} className="flex flex-col gap-[3px] relative">
                            {week.map((day) => {
                                 const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                                 return <div key={dateStr} className={`w-3 h-3 rounded-sm ${getIntensityColor(activityMap.get(dateStr) || 0)}`} title={`${dateStr}: ${activityMap.get(dateStr) || 0} rides`} />;
                            })}
                            {isNewMonth && <span className="absolute top-full mt-2 left-0 text-[9px] text-slate-500 font-bold whitespace-nowrap">{monthName}</span>}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser, updateUser, credits, coasters, enrichDatabaseImages, importData, standardizeDatabase, changeView, showNotification, appTheme, setAppTheme } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    link.download = `CoasterCount_${activeUser.name}.csv`;
    link.click();
    showNotification("CSV Exported", "success");
  };

  const THEME_OPTIONS: { id: AppTheme; label: string; color: string }[] = [
      { id: 'sky', label: 'Sky', color: 'bg-sky-500' },
      { id: 'emerald', label: 'Emerald', color: 'bg-emerald-500' },
      { id: 'violet', label: 'Violet', color: 'bg-violet-500' },
      { id: 'rose', label: 'Rose', color: 'bg-rose-500' },
      { id: 'amber', label: 'Amber', color: 'bg-amber-500' },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-8">
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Rider Profiles</h2>
        <div className="grid grid-cols-1 gap-3">
          {users.map(user => (
                <div key={user.id} onClick={() => editingUserId !== user.id && switchUser(user.id)} className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${user.id === activeUser.id ? 'bg-primary/10 border-primary' : 'bg-slate-800 border-slate-700'}`}>
                    <div className={`w-12 h-12 rounded-full ${user.avatarUrl ? 'bg-transparent' : user.avatarColor} flex items-center justify-center text-lg font-bold shadow-lg overflow-hidden mr-4`}>{user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : user.name.substring(0, 2).toUpperCase()}</div>
                    <div className="flex-1 text-left min-w-0">
                        {editingUserId === user.id ? (
                            <form onClick={e => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); updateUser(user.id, editName); setEditingUserId(null); }} className="flex gap-2">
                                <input value={editName} onChange={e => setEditName(e.target.value)} className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full" autoFocus />
                                <button type="submit" className="bg-emerald-600 p-1.5 rounded text-white"><Save size={14} /></button>
                            </form>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <h3 className="font-semibold text-lg truncate">{user.name}</h3>
                                <button onClick={(e) => { e.stopPropagation(); setEditingUserId(user.id); setEditName(user.name); }} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16} /></button>
                            </div>
                        )}
                        {editingUserId !== user.id && <p className="text-xs text-slate-500 font-bold uppercase">{user.id === activeUser.id ? 'Active Rider' : 'Switch Profile'}</p>}
                    </div>
                </div>
          ))}
        </div>
        {isAdding ? (
            <form onSubmit={(e) => { e.preventDefault(); if(newUserName) { addUser(newUserName); setIsAdding(false); setNewUserName(''); } }} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-3">
                <input placeholder="Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white" autoFocus />
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl font-bold">Save</button>
            </form>
        ) : (
            <button onClick={() => setIsAdding(true)} className="w-full py-4 rounded-xl border border-dashed border-slate-600 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-800"><UserPlus size={20} /> Add New Profile</button>
        )}
      </div>

      <div onClick={() => changeView('QUEUE_HUB')} className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-[24px] p-6 border border-pink-500/30 relative overflow-hidden group cursor-pointer shadow-xl">
          <div className="absolute top-0 right-0 p-8 opacity-20"><Ticket size={100} /></div>
          <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2"><div className="bg-white/20 p-1.5 rounded-lg text-white backdrop-blur"><Gamepad2 size={16} /></div><span className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">Queue Hub</span></div>
              <h3 className="text-2xl font-black text-white italic">WAITING IN LINE?</h3>
              <p className="text-xs text-pink-200 mt-1">Games, trivia & jokes to kill time!</p>
              <div className="mt-4 flex items-center gap-3"><div className="bg-black/30 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" /><span className="text-sm font-bold text-white font-mono">{activeUser.highScore || 0}</span></div><button className="bg-white text-purple-900 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-pink-100">Enter Hub</button></div>
          </div>
      </div>

      <div>
         <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">App Appearance</h3>
         <div className="grid grid-cols-5 gap-3">
             {THEME_OPTIONS.map((theme) => (
                 <button key={theme.id} onClick={() => setAppTheme(theme.id)} className={clsx("flex flex-col items-center gap-2 p-2 rounded-xl border transition-all", appTheme === theme.id ? "bg-slate-800 border-white/30" : "border-transparent opacity-60")}>
                     <div className={`w-10 h-10 rounded-full ${theme.color} shadow-lg flex items-center justify-center`}>{appTheme === theme.id && <CheckCircle2 size={20} className="text-white" />}</div>
                     <span className="text-[10px] font-bold text-slate-300 uppercase">{theme.label}</span>
                 </button>
             ))}
         </div>
      </div>

      <div><h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Ride Activity</h3><ActivityHeatmap /></div>

      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Data & Settings</h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportCSV} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750"><FileSpreadsheet size={24} className="text-emerald-500" /><span className="text-xs font-bold text-slate-300">Export CSV</span></button>
            <label className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750 cursor-pointer"><Upload size={24} className="text-blue-500" /><span className="text-xs font-bold text-slate-300">Import JSON</span><input type="file" accept=".json" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { const reader = new FileReader(); reader.onload = (ev) => importData(JSON.parse(ev.target?.result as string)); reader.readAsText(e.target.files[0]); } }} /></label>
            <button onClick={() => { setIsEnriching(true); enrichDatabaseImages().finally(() => setIsEnriching(false)); }} disabled={isEnriching} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750">{isEnriching ? <Loader2 size={24} className="animate-spin text-primary" /> : <ImageDown size={24} className="text-primary" />}<span className="text-xs font-bold text-slate-300">Fetch Photos</span></button>
             <button onClick={standardizeDatabase} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750"><Wrench size={24} className="text-amber-500" /><span className="text-xs font-bold text-slate-300">Clean DB</span></button>
        </div>
      </div>
    </div>
  );
};

export default ProfileManager;
