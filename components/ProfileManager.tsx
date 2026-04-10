
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Edit2, Save, X, FileSpreadsheet, Database, Cloud, Loader2, FileJson, Trophy, Calendar, Gamepad2, Ticket, Info, AlertCircle, ShieldAlert } from 'lucide-react';
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
  const { 
    users, 
    activeUser, 
    switchUser, 
    addUser, 
    updateUser, 
    credits, 
    coasters, 
    exportData,
    changeView, 
    showNotification, 
    appTheme, 
    setAppTheme,
    currentUser,
    signIn,
    logout,
    isAuthLoading,
    isSyncing,
    getLocalDataStats,
    forceMigrateLocalData
  } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [localStats, setLocalStats] = useState<{ users: number, credits: number, wishlist: number, coasters: number } | null>(null);
  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const isAdmin = currentUser?.email === 'k.anaya.izquierdo@gmail.com';

  useEffect(() => {
    const checkLocal = async () => {
      setIsCheckingLocal(true);
      const stats = await getLocalDataStats();
      setLocalStats(stats);
      setIsCheckingLocal(false);
    };
    checkLocal();
  }, []);

  const handleExportCSV = () => {
    if (!activeUser) return;
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
    <div className="animate-fade-in space-y-10 pb-8">
      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Account</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Cloud Sync</h2>
        </div>

      {/* Cloud Account Section */}
      <div className={clsx(
        "rounded-3xl p-6 border shadow-xl transition-all duration-500",
        currentUser ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-900 border-slate-800"
      )}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            <Cloud size={14} className={currentUser ? "text-emerald-400" : "text-primary"} /> 
            {currentUser ? "Cloud Connected" : "Local Mode"}
          </div>
          {currentUser && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className={clsx("w-1.5 h-1.5 rounded-full", isSyncing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">
                {isSyncing ? "Syncing..." : "Synced"}
              </span>
            </div>
          )}
        </div>
        
        {currentUser ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={currentUser.photoURL || ''} 
                  alt="Account" 
                  className="w-12 h-12 rounded-full border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full border-2 border-slate-900">
                  <CheckCircle2 size={10} />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-white tracking-tight">{currentUser.displayName}</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currentUser.email}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-[10px] font-black uppercase tracking-widest transition-all border border-slate-700 hover:border-red-500/30 active:scale-95"
            >
              <X size={14} /> Sign Out
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-400 mb-4 italic font-medium leading-relaxed">Sign in to sync your credits across devices and never lose your data.</p>
            <button 
              onClick={signIn}
              disabled={isAuthLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isAuthLoading ? <Loader2 size={18} className="animate-spin" /> : (
                <>
                  <Cloud size={18} />
                  Sign In with Google
                </>
              )}
            </button>
          </div>
        )}
      </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Profiles</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">Rider Profiles</h2>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {users.map(user => (
                <div key={user.id} onClick={() => editingUserId !== user.id && switchUser(user.id)} className={`flex items-center p-4 rounded-xl border transition-all cursor-pointer ${user.id === activeUser?.id ? 'bg-primary/10 border-primary' : 'bg-slate-800 border-slate-700'}`}>
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
                        {editingUserId !== user.id && <p className="text-xs text-slate-500 font-bold uppercase">{user.id === activeUser?.id ? 'Active Rider' : 'Switch Profile'}</p>}
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
      </section>

      <section className="space-y-3">
         <div>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Appearance</p>
           <h3 className="text-2xl font-bold text-white tracking-tight">Theme</h3>
         </div>
         <div className="grid grid-cols-5 gap-3">
             {THEME_OPTIONS.map((theme) => (
                 <button key={theme.id} onClick={() => setAppTheme(theme.id)} className={clsx("flex flex-col items-center gap-2 p-2 rounded-xl border transition-all", appTheme === theme.id ? "bg-slate-800 border-white/30" : "border-transparent opacity-60")}>
                     <div className={`w-10 h-10 rounded-full ${theme.color} shadow-lg flex items-center justify-center`}>{appTheme === theme.id && <CheckCircle2 size={20} className="text-white" />}</div>
                     <span className="text-[10px] font-bold text-slate-300 uppercase">{theme.label}</span>
                 </button>
             ))}
         </div>
      </section>

      {activeUser && (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Activity</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">Ride History</h3>
          </div>
          <ActivityHeatmap />
        </section>
      )}

      {/* Sync & Restore */}
      <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800/50">
        <div className="flex items-center gap-2 mb-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          <Info size={14} className="text-primary" /> Sync & Restore
        </div>

        <div className="mb-6 p-5 bg-slate-950/50 border border-slate-800 rounded-3xl">
          {!currentUser ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Sign in above to sync your data across devices. Until then, everything stays only in this browser.
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                If you used another phone or browser before, sign in there first to upload that device&apos;s local data.
              </p>
            </div>
          ) : isCheckingLocal || !localStats ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <div>
                <p className="text-xs font-bold text-white">Checking this browser for unsynced local data</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Please wait</p>
              </div>
            </div>
          ) : localStats.credits > 0 || localStats.users > 0 || localStats.coasters > 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-amber-200 uppercase tracking-widest">Local data found on this browser</h4>
                  <p className="text-xs text-amber-100/70 leading-relaxed mt-1">
                    {localStats.credits} credits, {localStats.users} profiles, and {localStats.coasters} custom coasters can be restored to your cloud account.
                  </p>
                </div>
              </div>
              <button 
                onClick={forceMigrateLocalData}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Cloud size={16} /> Restore Local Data to Cloud
              </button>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                This only restores data stored in this browser. Data from another device must be uploaded from that device first.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-bold text-emerald-300">No unsynced local data found on this browser.</p>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                If something is missing, first confirm you are using the same Google account and the correct rider profile.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">1</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Use the same Google account</strong> on every device where you want your data to appear.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0 mt-0.5">2</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-200">Check the active rider profile.</strong> Credits can exist in the account but belong to a different profile.
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Data Audit */}
      {currentUser && isAdmin && (
        <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800/50 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              <Database size={14} className="text-primary" /> Admin Account Summary
            </div>
            <div className="px-2 py-0.5 rounded bg-primary/10 text-[8px] font-black text-primary uppercase tracking-widest">Live</div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-black/20 rounded-2xl border border-white/5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Total Cloud Credits</span>
                <span className="text-sm font-black text-white">{credits.length}</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: '100%' }} />
              </div>
            </div>

            {(() => {
              const userIds = new Set(users.map(u => u.id));
              const orphanedCount = credits.filter(c => !userIds.has(c.userId)).length;
              if (orphanedCount > 0) {
                return (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-pulse">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-amber-500 uppercase">Credits Without a Profile</span>
                      <span className="text-sm font-black text-amber-400">{orphanedCount}</span>
                    </div>
                    <p className="text-[9px] text-amber-200/60 mb-3 italic">These credits exist in the account but are not attached to any rider profile yet.</p>
                    <button 
                      onClick={async () => {
                        const orphanedUserIds = [...new Set(credits.filter(c => !users.some(u => u.id === c.userId)).map(c => c.userId))];
                        for (const uid of orphanedUserIds) {
                          await addUser(`Recovered Profile (${uid.slice(-4)})`, undefined, uid);
                        }
                        showNotification("Profiles recovered!", "success");
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-[9px] font-bold rounded-lg transition-all"
                    >
                      Recover Profiles
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            <div className="space-y-2">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1">Breakdown by Profile</p>
              {users.map(u => {
                const count = credits.filter(c => c.userId === u.id).length;
                return (
                  <div key={u.id} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-xl border border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: u.avatarColor }}>
                        {u.name[0]}
                      </div>
                      <span className="text-xs font-bold text-slate-300">{u.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{count}</span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase">Credits</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[9px] text-slate-500 italic leading-relaxed px-1">
              If the total count here looks right but the dashboard is empty, switch to the rider profile that already owns those credits.
            </p>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Exports</h3>
          <button 
            onClick={() => changeView('DATA_RECOVERY')}
            className="flex items-center gap-1.5 text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
          >
            <ShieldAlert size={12} /> Backups & Tools
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportCSV} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750"><FileSpreadsheet size={24} className="text-emerald-500" /><span className="text-xs font-bold text-slate-300">Export CSV</span></button>
            <button onClick={exportData} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750"><FileJson size={24} className="text-blue-500" /><span className="text-xs font-bold text-slate-300">Backup JSON</span></button>
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed mt-3 px-1">
          Restore, import, photo tools, and cleanup are grouped under <span className="text-slate-300 font-bold">Backups & Tools</span>.
        </p>
      </section>

      {activeUser && (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Extras</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">Queue Hub</h3>
          </div>
          <div onClick={() => changeView('QUEUE_HUB')} className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-[24px] p-5 border border-pink-500/30 relative overflow-hidden group cursor-pointer shadow-xl">
              <div className="absolute top-0 right-0 p-6 opacity-20"><Ticket size={84} /></div>
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2"><div className="bg-white/20 p-1.5 rounded-lg text-white backdrop-blur"><Gamepad2 size={16} /></div><span className="text-[10px] font-bold text-pink-300 uppercase tracking-widest">Optional</span></div>
                  <h3 className="text-xl font-black text-white italic">Queue Hub</h3>
                  <p className="text-xs text-pink-200 mt-1">Mini-games and downtime extras while you wait in line.</p>
                  <div className="mt-4 flex items-center gap-3"><div className="bg-black/30 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2"><Trophy size={14} className="text-yellow-400" /><span className="text-sm font-bold text-white font-mono">{activeUser.highScore || 0}</span></div><button className="bg-white text-purple-900 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-pink-100">Open</button></div>
              </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProfileManager;
