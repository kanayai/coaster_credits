
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
    }, [today, oneYearAgo]);

    const getIntensityColor = (count: number) => {
        if (count === 0) return 'bg-slate-800';
        if (count === 1) return 'bg-emerald-900';
        if (count <= 3) return 'bg-emerald-700';
        if (count <= 6) return 'bg-emerald-500';
        return 'bg-emerald-300';
    };

    return (
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <Calendar size={14} /> Ride History (Last Year)
            </div>
            <div className="flex gap-[3px] min-w-max">
                {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                        {week.map((day, dIdx) => {
                             // Use local date string construction to match YYYY-MM-DD format regardless of UTC offset
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

      {/* Activity Heatmap */}
      <div className="border-t border-slate-800 pt-8 space-y-6">
        <h2 className="text-xl font-bold">Riding Activity</h2>
        <ActivityHeatmap />
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
        <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExportCSV} className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center hover:bg-slate-700 transition-colors">
                <FileSpreadsheet className="mx-auto mb-2 text-green-500" /> <span className="text-xs font-bold">CSV Export</span>
            </button>
            <button onClick={() => showNotification("Coming soon to Cloud!", "info")} className="bg-slate-800 border border-slate-700 p-4 rounded-xl text-center hover:bg-slate-700 transition-colors opacity-50">
                <Database className="mx-auto mb-2 text-primary" /> <span className="text-xs font-bold">JSON Backup</span>
            </button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-8">
        <div className="flex items-center gap-2 mb-4 text-white"><Code2 className="text-blue-400" size={24} /><h2 className="text-xl font-bold">Developer Resources</h2></div>
        <button onClick={handleDownloadDeploymentGuide} className="w-full bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-700 transition-colors group">
            <div className="bg-blue-500/20 p-2 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <FileText size={20} className="text-blue-400"/>
            </div>
            <div className="text-left">
                <span className="block font-bold text-slate-200">Download Deployment Guide</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Instructions for App Store & Play Store</span>
            </div>
            <Download size={16} className="text-slate-500 ml-auto" />
        </button>
      </div>
    </div>
  );
};

export default ProfileManager;
