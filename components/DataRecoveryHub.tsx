
import React, { useState, useEffect } from 'react';
import {
  STORAGE_DB_NAME,
  STORAGE_MIGRATION_KEYS,
  STORAGE_STORE_NAME,
} from '../config/clientConfig';
import { useAppContext } from '../context/AppContext';
import { 
  Database, 
  Download, 
  Upload, 
  AlertCircle, 
  Info, 
  ChevronLeft, 
  RefreshCw, 
  ShieldAlert,
  Search,
  HardDrive,
  FileJson,
  ImageDown,
  Wrench,
  Loader2
} from 'lucide-react';
import clsx from 'clsx';

const DataRecoveryHub: React.FC = () => {
  const { 
    currentUser, 
    credits, 
    users, 
    changeView, 
    repairDatabase,
    reconstructMissingProfiles,
    nuclearReset,
    manualRefresh, 
    scanAllCredits,
    enrichDatabaseImages,
    standardizeDatabase,
    importData,
    exportData,
    isSyncing,
    showNotification
  } = useAppContext();

  const isAdmin = currentUser?.email === "k.anaya.izquierdo@gmail.com";

  const [manualUserId, setManualUserId] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

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
        const request = indexedDB.open(STORAGE_DB_NAME);
        request.onsuccess = (e: any) => {
          const db = e.target.result;
          const stores = Array.from(db.objectStoreNames);
          if (!stores.includes(STORAGE_STORE_NAME)) {
            audit.push({ key: `DB: ${STORAGE_STORE_NAME} (missing)`, size: 0, type: 'db' });
          }
          stores.forEach((storeName: any) => {
            audit.push({ key: `DB: ${storeName}`, size: 0, type: 'db' });
          });
          STORAGE_MIGRATION_KEYS.forEach((key) => {
            if (!audit.some(item => item.key === key)) {
              audit.push({ key: `${key} (not present)`, size: 0, type: 'local' });
            }
          });
          setStorageAudit([...audit].sort((a, b) => b.size - a.size));
        };
      } catch (err) {
        STORAGE_MIGRATION_KEYS.forEach((key) => {
          if (!audit.some(item => item.key === key)) {
            audit.push({ key: `${key} (not present)`, size: 0, type: 'local' });
          }
        });
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
      await repairDatabase();
      showNotification(
        "Owner-scoped repair completed. Manual user-id targeting is not supported in Supabase client mode.",
        "info"
      );
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
          <h1 className="text-3xl font-black text-white italic tracking-tight">BACKUPS & ADVANCED TOOLS</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Backups, diagnostics, and admin recovery</p>
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
              {currentUser ? <Database size={14} className="text-emerald-400" /> : <HardDrive size={14} className="text-amber-400" />}
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

        {!isAdmin && (
          <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl">
            <div className="flex gap-3">
              <Info size={18} className="text-blue-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Restore Local Data</h2>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  The normal restore flow now lives in your profile screen under <span className="text-slate-200 font-bold">Sync & Restore</span>.
                </p>
                <button
                  onClick={() => changeView('PROFILE')}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/80 transition-all"
                >
                  Back to Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Recovery Section */}
        {isAdmin && (
          <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <ShieldAlert size={120} />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-500/20 rounded-xl text-red-400">
                <AlertCircle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">Admin Recovery Tools</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Repair, rebuild, and cache reset</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-black text-white uppercase mb-1">Reconnect Missing Credits</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  Use this when the rider profiles exist but some cloud credits are not showing inside the account correctly.
                </p>
                <button 
                  onClick={repairDatabase}
                  disabled={isSyncing}
                  className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} /> Repair Cloud Data Links
                </button>
              </div>

              <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/20">
                <h3 className="text-xs font-black text-red-400 uppercase mb-1">Reset Local Cache</h3>
                <p className="text-[10px] text-red-200/40 leading-relaxed mb-4">
                  Clear this device&apos;s cached copy and force a fresh download from the cloud if the app feels stuck or out of date.
                </p>
                <button 
                  onClick={nuclearReset}
                  className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/30 flex items-center justify-center gap-2"
                >
                  <ShieldAlert size={14} /> Reset Local Cache
                </button>
              </div>

              <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
                <h3 className="text-xs font-black text-white uppercase mb-1">Claim Credits by Profile ID</h3>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-4">
                  If you know an older rider profile ID, you can reassign matching cloud credits into the current account.
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button 
                  onClick={scanAllCredits}
                  disabled={isSyncing}
                  className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Search size={18} /> Scan All Cloud Credits
                </button>

                <button 
                  onClick={reconstructMissingProfiles}
                  disabled={isSyncing || credits.length === 0}
                  className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-red-400 border border-red-500/30 text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Database size={18} /> Rebuild Missing Profiles
                </button>
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

        <div className="bg-slate-900 rounded-[32px] p-6 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <Wrench size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Maintenance</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Photos and data cleanup</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => {
                setIsEnriching(true);
                enrichDatabaseImages().finally(() => setIsEnriching(false));
              }}
              disabled={isEnriching}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all group disabled:opacity-50"
            >
              <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                {isEnriching ? <Loader2 size={24} className="animate-spin" /> : <ImageDown size={24} />}
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white uppercase tracking-tight">Fetch Photos</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Fill missing coaster images</span>
              </div>
            </button>

            <button 
              onClick={standardizeDatabase}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-750 transition-all group"
            >
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
                <Wrench size={24} />
              </div>
              <div className="text-center">
                <span className="block text-sm font-black text-white uppercase tracking-tight">Clean Names</span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Standardize parks and manufacturers</span>
              </div>
            </button>
          </div>
        </div>

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
