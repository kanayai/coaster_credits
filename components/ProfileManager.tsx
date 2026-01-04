import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, CheckCircle2, Smartphone, Share2, QrCode, Edit2, Save, X, FileSpreadsheet, Database, Download, Cloud, PaintBucket, Sparkles, Loader2, Copy, ExternalLink, Camera, ImageDown, Upload, Wrench, Share, FileJson, Trophy, FileText, Code2, Calendar } from 'lucide-react';
import { User } from '../types';

const ActivityHeatmap = () => {
    const { credits, activeUser } = useAppContext();
    
    // Calculate last 365 days
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const activityMap = useMemo(() => {
        const map = new Map<string, number>();
        credits.filter(c => c.userId === activeUser.id).forEach(c => {
            const dateStr = c.date; // YYYY-MM-DD from input
            map.set(dateStr, (map.get(dateStr) || 0) + 1);
        });
        return map;
    }, [credits, activeUser.id]);

    const weeks = useMemo(() => {
        const weeksArray = [];
        let currentDate = new Date(oneYearAgo);
        // Align to previous Sunday
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
        if (count === 1) return 'bg-emerald-900';
        if (count <= 3) return 'bg-emerald-700';
        if (count <= 6) return 'bg-emerald-500';
        return 'bg-emerald-300';
    };

    return (
        <div key={`heatmap-${credits.length}`} className="bg-slate-900 rounded-xl p-4 border border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Calendar size={14} /> Ride History (Last Year)
            </div>
            <div className="flex gap-[3px] min-w-max">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                        {week.map((day) => {
                             const year = day.getFullYear();
                             const month = String(day.getMonth() + 1).padStart(2, '0');
                             const date = String(day.getDate()).padStart(2, '0');
                             const dateStr = `${year}-${month}-${date}`;
                             
                             const count = activityMap.get(dateStr) || 0;
                             return (
                                 <div 
                                    key={dateStr} 
                                    className={`w-3 h-3 rounded-sm ${getIntensityColor(count)}`}
                                    title={`${dateStr}: ${count} rides`}
                                 />
                             );
                        })}
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-3 text-[10px] text-slate-500 font-medium">
                <span>Less</span>
                <div className="flex gap-[2px]">
                    <div className="w-2 h-2 rounded-sm bg-slate-800" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-900" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-700" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-500" />
                    <div className="w-2 h-2 rounded-sm bg-emerald-300" />
                </div>
                <span>More</span>
            </div>
        </div>
    );
};

const DEPLOYMENT_GUIDE_CONTENT = `# CoasterCount Pro - Ultimate Deployment Guide

This guide details how to take **CoasterCount Pro** from a local development project to a globally available application on the Web, Apple App Store, and Google Play Store.

---

## Phase 1: Preparation (Critical)

Before deploying anywhere, you must address two critical areas: **Data Storage** and **API Security**.

### 1. Data Persistence (The "Local Storage" Problem)
*   **Current State:** The app uses \`localStorage\`. Data lives **only** on the user's phone browser. If they clear cache, uninstall the app, or switch phones, **their data is lost**.
*   **Production Requirement:** To launch on App Stores, you strongly should implement a Cloud Backend.
*   **Recommended Stack:**
    *   **Firebase (Google):** Easiest integration. Provides Authentication (Google/Apple Sign-in) and Firestore (Database) for free.
    *   **Supabase:** Excellent open-source alternative to Firebase.
    *   *Why?* This allows users to "Log In" and restore their credits on any device.

### 2. API Key Security
*   **Current State:** The \`API_KEY\` is in the frontend code.
*   **The Risk:** If you publish this to the App Store, hackers can extract your key and use your quota.
*   **Solution:** Create a simple "Proxy Server" (using Vercel Functions or Cloudflare Workers). The app calls your server, and your server calls Gemini. This keeps the key hidden on the server.

---

## Phase 2: Web Deployment (Free & Immediate)

This makes your app accessible via a URL (e.g., \`coastercount.com\`) and installable as a PWA (Progressive Web App).

### 1. Hosting Providers
*   **Vercel (Recommended):** Zero config for React.
*   **Netlify:** Excellent alternative.

### 2. Steps to Deploy
1.  Push your code to **GitHub**.
2.  Log in to Vercel/Netlify and import the repository.
3.  **Environment Variables:** In the dashboard settings, add your \`API_KEY\`.
4.  Click **Deploy**.
5.  **Result:** You now have a live URL. Users can open it on Safari (iOS) or Chrome (Android) and tap "Add to Home Screen" to install it.

---

## Phase 3: Native Mobile App (App Store & Play Store)

To get into the actual stores, you cannot simply upload a website. You need to wrap your code in a "Native Container".

**Tool of Choice: Capacitor**
We will use **CapacitorJS**. It takes your existing React build and wraps it into an Xcode project (iOS) and Android Studio project (Android).

### 1. Prerequisites
*   **Node.js** installed.
*   **CocoaPods** (for iOS).
*   **Xcode** (Mac required for iOS builds).
*   **Android Studio** (PC or Mac for Android builds).

### 2. Converting React to Native
Run these commands in your project terminal:

\`\`\`bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android

# 2. Initialize Capacitor
npx cap init "CoasterCount Pro" com.yourname.coastercount

# 3. Build your React App
npm run build

# 4. Add Mobile Platforms
npx cap add ios
npx cap add android

# 5. Sync your code to the native projects
npx cap sync
\`\`\`

---

## Phase 4: Apple App Store (iOS)

### Costs & Requirements
*   **Apple Developer Program:** $99 / year (Recurring).
*   **Hardware:** You MUST have a Mac to compile the final \`.ipa\` file.

### Steps
1.  **Open Xcode:** Run \`npx cap open ios\`.
2.  **Signing:** In Xcode, go to the "Signing & Capabilities" tab and select your paid Apple Developer Team.
3.  **Permissions:**
    *   Update \`Info.plist\`. You must explain *why* you need permissions.
    *   \`NSLocationWhenInUseUsageDescription\`: "We use your location to find nearby theme parks."
    *   \`NSCameraUsageDescription\`: "Used to take photos of your ride credits."
4.  **Assets:** Use a tool like \`@capacitor/assets\` to generate all required icon sizes automatically.
5.  **Archive:** In Xcode, go to \`Product\` -> \`Archive\`.
6.  **Upload:** Once archived, use the "Distribute App" button to upload to **App Store Connect**.
7.  **Review:** Fill out the listing details (screenshots, description) in App Store Connect and submit for review.
    *   *Review Time:* Usually 24-48 hours.

---

## Phase 5: Google Play Store (Android)

### Costs & Requirements
*   **Google Play Developer Account:** $25 (One-time fee).
*   **Hardware:** PC or Mac.

### Steps
1.  **Open Android Studio:** Run \`npx cap open android\`.
2.  **Permissions:** Ensure \`AndroidManifest.xml\` includes:
    \`\`\`xml
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    \`\`\`
3.  **Signing:** Generate a Keystore file (keep this safe! If you lose it, you can never update your app again).
4.  **Build Bundle:** Go to \`Build\` -> \`Generate Signed Bundle / APK\` -> Select \`Android App Bundle (.aab)\`.
5.  **Upload:** Create a release in the **Google Play Console** and upload the \`.aab\` file.
6.  **Review:** Fill out the store listing.
    *   *Review Time:* Can take 3-7 days for new accounts.

---

## Phase 6: Legal & Compliance (Required for Stores)

Both Apple and Google **require** the following links on your store listing:

1.  **Privacy Policy:** A webpage explaining what you do with user data (Location, Photos). Since you use Gemini AI and Google Maps, you must disclose this data usage.
2.  **Terms of Service:** Standard legal disclaimer.
3.  **Support URL:** A way for users to contact you.

## Summary Checklist

| Action | Cost | Difficulty | Time to Live |
| :--- | :--- | :--- | :--- |
| **Web / PWA** | Free | Easy | Minutes |
| **Google Play** | $25 (One-time) | Medium | ~1 Week |
| **Apple App Store** | $99 / Year | Hard | ~1 Week |
`;

const ProfileManager: React.FC = () => {
  const { users, activeUser, switchUser, addUser, updateUser, credits, wishlist, coasters, generateIcon, enrichDatabaseImages, importData, standardizeDatabase, changeView, showNotification } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

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
    showNotification("CSV Exported", "success");
  };

  const handleDownloadDeploymentGuide = () => {
      const blob = new Blob([DEPLOYMENT_GUIDE_CONTENT], { type: 'text/markdown' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'DEPLOYMENT.md';
      link.click();
      showNotification("Deployment Guide Downloaded", "success");
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
                        {isEditing ? (
                            <form onClick={e => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); updateUser(user.id, editName); setEditingUserId(null); }} className="flex gap-2">
                                <input 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                    className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm w-full"
                                    autoFocus
                                />
                                <button type="submit" className="bg-emerald-600 p-1.5 rounded text-white"><Save size={14} /></button>
                                <button type="button" onClick={() => setEditingUserId(null)} className="bg-slate-700 p-1.5 rounded text-white"><X size={14} /></button>
                            </form>
                        ) : (
                            <div className="flex justify-between items-center w-full">
                                <h3 className={`font-semibold text-lg truncate ${user.id === activeUser.id ? 'text-white' : 'text-slate-200'}`}>{user.name}</h3>
                                <button onClick={(e) => { e.stopPropagation(); startEditing(user); }} className="p-2 text-slate-500 hover:text-white"><Edit2 size={16} /></button>
                            </div>
                        )}
                        {!isEditing && <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{user.id === activeUser.id ? 'Active Rider' : 'Switch Profile'}</p>}
                    </div>
                </div>
             );
          })}
        </div>

        {/* Add User */}
        {isAdding ? (
            <form onSubmit={(e) => { e.preventDefault(); if(newUserName) { addUser(newUserName); setIsAdding(false); setNewUserName(''); } }} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex gap-3 animate-fade-in">
                <input 
                    placeholder="Rider Name" 
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-2 text-white"
                    autoFocus
                />
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl font-bold">Save</button>
                <button type="button" onClick={() => setIsAdding(false)} className="bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-bold">Cancel</button>
            </form>
        ) : (
            <button onClick={() => setIsAdding(true)} className="w-full py-4 rounded-xl border border-dashed border-slate-600 text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-colors">
                <UserPlus size={20} /> Add New Profile
            </button>
        )}
      </div>

      {/* Heatmap */}
      <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Ride Activity</h3>
          <ActivityHeatmap />
      </div>

      {/* Data Management */}
      <div>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">Data & Settings</h3>
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportCSV} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750 transition-colors">
                <FileSpreadsheet size={24} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-300">Export CSV</span>
            </button>
            
            <label className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750 transition-colors cursor-pointer">
                <Upload size={24} className="text-blue-500" />
                <span className="text-xs font-bold text-slate-300">Import JSON</span>
                <input type="file" accept=".json" className="hidden" onChange={(e) => {
                    if (e.target.files?.[0]) {
                        const reader = new FileReader();
                        reader.onload = (ev) => importData(JSON.parse(ev.target?.result as string));
                        reader.readAsText(e.target.files[0]);
                    }
                }} />
            </label>

            <button onClick={() => { setIsEnriching(true); enrichDatabaseImages().finally(() => setIsEnriching(false)); }} disabled={isEnriching} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750 transition-colors">
                {isEnriching ? <Loader2 size={24} className="animate-spin text-primary" /> : <ImageDown size={24} className="text-primary" />}
                <span className="text-xs font-bold text-slate-300">Fetch Photos</span>
            </button>
            
             <button onClick={standardizeDatabase} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-750 transition-colors">
                <Wrench size={24} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-300">Clean DB</span>
            </button>
        </div>
      </div>

       {/* Deployment Guide */}
       <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
           <div className="flex items-start justify-between relative z-10">
               <div className="space-y-2">
                   <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                       <Smartphone size={14} /> Mobile App
                   </div>
                   <h3 className="text-xl font-bold text-white">Turn this into a Real App</h3>
                   <p className="text-sm text-slate-400 max-w-xs">
                       Download the comprehensive guide to deploying CoasterCount Pro to the iOS App Store and Google Play Store.
                   </p>
                   <button onClick={handleDownloadDeploymentGuide} className="mt-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
                       <Download size={14} /> Download Guide
                   </button>
               </div>
               <Code2 size={80} className="text-indigo-500/10 absolute -right-4 -bottom-4 rotate-12" />
           </div>
       </div>
       
       <div className="text-center text-[10px] text-slate-600 font-medium pt-8">
           CoasterCount Pro v2.1 • Built with React & Gemini
       </div>
    </div>
  );
};

export default ProfileManager;