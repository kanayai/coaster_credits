
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { 
  Database, 
  Cloud, 
  Download, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert,
  Search,
  HardDrive,
  FileJson,
  History
} from 'lucide-react';
import { db } from '../firebase';
import clsx from 'clsx';

const DataRecoveryHub: React.FC = () => {
  const { 
    currentUser, 
    credits, 
    users, 
    changeView, 
    getLocalDataStats, 
    forceMigrateLocalData, 
    repairDatabase,
    reconstructMissingProfiles,
    nuclearReset,
    manualRefresh, 
    scanAllCredits,
    importData,
    exportData,
    isSyncing,
    showNotification
  } = useAppContext();

  const [localStats, setLocalStats] = useState<{ users: number, credits: number, wishlist: number } | null>(null);
  const [isCheckingLocal, setIsCheckingLocal] = useState(false);
  const isAdmin = currentUser?.email === "k.anaya.izquierdo@gmail.com";

  const [manualUserId, setManualUserId] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);

  useEffect(() => {
    const checkLocal = async () => {
      setIsCheckingLocal(true);
      const stats = await getLocalDataStats();
      setLocalStats(stats);
      setIsCheckingLocal(false);
    };
    checkLocal();
  }, []);

  const [storageAudit, setStorageAudit] = useState<{ key: string, size: number, type: 'local' | 'db' }[]>([]);

  useEffect(() => {
    const audit: { key: string, size: number, type: 'local' | 'db' }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        audit.push({ key, size: val.length, type: 'local' });
      }
    }

    // Check IndexedDB
    const checkDB = async () => {
      try {
        const dbName = 'CoasterCloudDB';
        const request = indexedDB.open(dbName);
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          const stores = Array.from(db.objectStoreNames);
          stores.forEach((storeName: any) => {
            audit.push({ key: `DB: ${storeName}`, size: 0, type: 'db' });
          });
          setStorageAudit([...audit].sort((a, b) => b.size - a.size));
        };
      } catch (err) {
        setStorageAudit([...audit].sort((a, b) => b.size - a.size));
      }
    };
    checkDB();
  }, []);

  const handleManualRepair = async () => {
    if (!manualUserId.trim()) {
      showNotification("Please enter a User ID", "error");
      return;
    }
    setIsRepairing(true);
    try {
      // We'll use the repairDatabase logic but for a specific ID
      const { getDocs, query, where, collection, writeBatch, doc } = await import('firebase/firestore');
      const q = query(collection(db, 'credits'), where('userId', '==', manualUserId.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showNotification("No credits found for this User ID", "info");
      } else {
        const batch = writeBatch(db);
        snap.docs.forEach(docSnap => {
          batch.update(docSnap.ref, { ownerId: currentUser?.uid });
        });
        await batch.commit();
        showNotification(`Successfully reclaimed ${snap.size} credits!`, "success");
        manualRefresh();
      }
    } catch (err) {
      showNotification("Repair failed", "error");
    } finally {
      setIsRepairing(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          importData(json);
        } catch (err) {
          showNotification("Invalid JSON file", "error");
        }
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => changeView('PROFILE')}
          className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">DATA RECOVERY HUB</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Advanced Tools & Troubleshooting</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Status Card */}
        <div className={clsx(
          "p-6 rounded-[32px] border shadow-xl transition-all duration-500",
          currentUser ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"
        )}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
              {currentUser ? <Cloud size={14} className="text-emerald-400" /> : <HardDrive size={14} className="text-amber-400" />}
              Current Mode: {currentUser ? "Cloud Synchronized" : "Local Storage Only"}
            </div>
            {currentUser && (
              <button 
                onClick={manualRefresh}
                disabled={isSyncing}
                className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-center">
              <span className="block text-2xl font-black text-white font-mono">{users.length}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Profiles</span>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-center">
              <span className="block text-2xl font-black text-white font-mono">{credits.length}</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Credits</span>
            </div>
            <div className="p-4 bg-black/20 rounded-2xl border border-white/5 text-center">
              <span className="block text-2xl font-black text-white font-mono">100%</span>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Integrity</span>
            </div>
          </div>
        </div>

        {/* Disaster Recovery Section */}
        {currentUser && (
          <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={120} />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                <AlertCircle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Disaster Recovery</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fix missing or orphaned data</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-black text-white uppercase mb-1">Repair Data Links</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  If you can see your profiles but your credits are missing, this tool will scan the cloud for any credits that match your profile IDs and re-link them to your account.
                </p>
                <button 
                  onClick={repairDatabase}
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Run Deep Link Repair
                </button>
              </div>

              <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                <h3 className="text-xs font-black text-red-400 uppercase mb-1">Nuclear Option</h3>
                <p className="text-[10px] text-red-200/40 leading-relaxed mb-4">
                  Wipe local cache and force a complete fresh pull from the cloud. Use this if your app state feels "stuck" or corrupted.
                </p>
                <button 
                  onClick={nuclearReset}
                  className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30 flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={14} /> Trigger Nuclear Reset
                </button>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-black text-white uppercase mb-1">Manual Profile Claim</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  If you know the old User ID (e.g. "u1" or a random string), you can manually claim all credits associated with it.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={manualUserId}
                    onChange={(e) => setManualUserId(e.target.value)}
                    placeholder="Enter User ID (e.g. u1)"
                    className="flex-1 bg-black/40 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-primary/50"
                  />
                  <button 
                    onClick={handleManualRepair}
                    disabled={isRepairing}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all disabled:opacity-50"
                  >
                    {isRepairing ? <RefreshCw size={14} className="animate-spin" /> : "Claim"}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-black text-white uppercase mb-1">Browser Storage Audit</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  These are the raw keys currently in your browser's local storage.
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {storageAudit.length > 0 ? storageAudit.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-black/20 rounded-lg border border-slate-800">
                      <span className="text-[10px] font-mono text-slate-300 truncate max-w-[150px]">{item.key}</span>
                      <span className="text-[10px] font-mono text-slate-500">{(item.size / 1024).toFixed(2)} KB</span>
                    </div>
                  )) : (
                    <div className="text-[10px] text-slate-600 text-center py-4 italic">No local storage keys found.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Local Data Recovery Section */}
        {currentUser && (
          <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/20 rounded-xl text-primary">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Local Data Recovery</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Restore data from this browser</p>
              </div>
            </div>

            {localStats && (localStats.credits > 0 || localStats.users > 0) ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2 text-amber-400">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Unsynced Data Found</span>
                  </div>
                  <p className="text-xs text-amber-100/70 leading-relaxed mb-4">
                    We found {localStats.credits} credits and {localStats.users} profiles stored locally on this device that are not yet in your cloud account.
                  </p>
                  <button 
                    onClick={forceMigrateLocalData}
                    className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Cloud size={18} /> Push Local Data to Cloud
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 bg-black/20 rounded-2xl border border-white/5 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600">
                  <CheckCircle2 size={24} />
                </div>
                <p className="text-sm font-bold text-slate-400">No unsynced local data detected.</p>
                <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest">Your device is clean!</p>
              </div>
            )}
          </div>
        )}

        {/* JSON Import/Export Section */}
        <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
              <FileJson size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">JSON Backup & Restore</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Universal Data Portability</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={exportData}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all group"
            >
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 group-hover:scale-110 transition-transform">
                <Download size={24} />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white uppercase tracking-tight">Export JSON</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Full Backup</span>
              </div>
            </button>

            <label className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all group cursor-pointer">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                <Upload size={24} />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white uppercase tracking-tight">Import JSON</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Restore Backup</span>
              </div>
              <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
          </div>

          <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
            <div className="flex gap-3">
              <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-blue-200/60 leading-relaxed italic">
                Use JSON backups to move your data between different Google accounts or to keep a permanent offline copy of your credits.
              </p>
            </div>
          </div>
        </div>

        {/* Admin Tools Section */}
        {isAdmin && (
          <div className="bg-red-500/5 rounded-[32px] p-6 border border-red-500/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-red-200 uppercase tracking-tight">Admin Recovery Tools</h2>
                <p className="text-[10px] font-bold text-red-500/60 uppercase tracking-widest">Danger Zone / Global Scan</p>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={scanAllCredits}
                disabled={isSyncing}
                className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Search size={18} /> Perform Global Database Scan
              </button>

              <button 
                onClick={reconstructMissingProfiles}
                disabled={isSyncing || credits.length === 0}
                className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-red-400 border border-red-500/30 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Database size={18} /> Reconstruct Missing Profiles
              </button>
            </div>
            
            <p className="text-[9px] text-red-400/60 mt-3 text-center italic">
              Global Scan fetches ALL credits. Reconstruction creates profiles for orphaned credits.
            </p>
          </div>
        )}

        {/* Help & Support */}
        <div className="p-6 text-center">
          <p className="text-xs text-slate-500 font-medium mb-2">Still having issues with your data?</p>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Contact support at k.anaya.izquierdo@gmail.com</p>
        </div>
      </div>
    </div>
  );
};

export default DataRecoveryHub;
