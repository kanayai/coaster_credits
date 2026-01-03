
# CoasterCount Pro - Ultimate Deployment Guide

This guide details how to take **CoasterCount Pro** from a local development project to a globally available application on the Web, Apple App Store, and Google Play Store.

---

## Phase 1: Preparation (Critical)

Before deploying anywhere, you must address two critical areas: **Data Storage** and **API Security**.

### 1. Data Persistence (The "Local Storage" Problem)
*   **Current State:** The app uses `localStorage`. Data lives **only** on the user's phone browser. If they clear cache, uninstall the app, or switch phones, **their data is lost**.
*   **Production Requirement:** To launch on App Stores, you strongly should implement a Cloud Backend.
*   **Recommended Stack:**
    *   **Firebase (Google):** Easiest integration. Provides Authentication (Google/Apple Sign-in) and Firestore (Database) for free.
    *   **Supabase:** Excellent open-source alternative to Firebase.
    *   *Why?* This allows users to "Log In" and restore their credits on any device.

### 2. API Key Security
*   **Current State:** The `API_KEY` is in the frontend code.
*   **The Risk:** If you publish this to the App Store, hackers can extract your key and use your quota.
*   **Solution:** Create a simple "Proxy Server" (using Vercel Functions or Cloudflare Workers). The app calls your server, and your server calls Gemini. This keeps the key hidden on the server.

---

## Phase 2: Web Deployment (Free & Immediate)

This makes your app accessible via a URL (e.g., `coastercount.com`) and installable as a PWA (Progressive Web App).

### 1. Hosting Providers
*   **Vercel (Recommended):** Zero config for React.
*   **Netlify:** Excellent alternative.

### 2. Steps to Deploy
1.  Push your code to **GitHub**.
2.  Log in to Vercel/Netlify and import the repository.
3.  **Environment Variables:** In the dashboard settings, add your `API_KEY`.
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

```bash
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
```

---

## Phase 4: Apple App Store (iOS)

### Costs & Requirements
*   **Apple Developer Program:** $99 / year (Recurring).
*   **Hardware:** You MUST have a Mac to compile the final `.ipa` file.

### Steps
1.  **Open Xcode:** Run `npx cap open ios`.
2.  **Signing:** In Xcode, go to the "Signing & Capabilities" tab and select your paid Apple Developer Team.
3.  **Permissions:**
    *   Update `Info.plist`. You must explain *why* you need permissions.
    *   `NSLocationWhenInUseUsageDescription`: "We use your location to find nearby theme parks."
    *   `NSCameraUsageDescription`: "Used to take photos of your ride credits."
4.  **Assets:** Use a tool like `@capacitor/assets` to generate all required icon sizes automatically.
5.  **Archive:** In Xcode, go to `Product` -> `Archive`.
6.  **Upload:** Once archived, use the "Distribute App" button to upload to **App Store Connect**.
7.  **Review:** Fill out the listing details (screenshots, description) in App Store Connect and submit for review.
    *   *Review Time:* Usually 24-48 hours.

---

## Phase 5: Google Play Store (Android)

### Costs & Requirements
*   **Google Play Developer Account:** $25 (One-time fee).
*   **Hardware:** PC or Mac.

### Steps
1.  **Open Android Studio:** Run `npx cap open android`.
2.  **Permissions:** Ensure `AndroidManifest.xml` includes:
    ```xml
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    ```
3.  **Signing:** Generate a Keystore file (keep this safe! If you lose it, you can never update your app again).
4.  **Build Bundle:** Go to `Build` -> `Generate Signed Bundle / APK` -> Select `Android App Bundle (.aab)`.
5.  **Upload:** Create a release in the **Google Play Console** and upload the `.aab` file.
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

