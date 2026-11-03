# 🛠️ SplitShare - Master Fix Implementation Guide (`FIX.md`)

> **Target:** SplitShare Project  
> **Status:** All Audited Issues & Bugs Documented with Complete Fixes  
> **Phases Covered:** Phase 1 (Critical Security & Play Store Blockers), Phase 2 (Performance Web & APK), Phase 3 (UI/UX & Mobile Polish), Phase 4 (Code Quality & Testing)

---

## 📋 Table of Contents
1. [Required Packages & Dependency Management](#1-required-packages--dependency-management)
2. [Phase 1: Critical Security, Crash Fixes & Play Store Blockers](#phase-1-critical-security-crash-fixes--play-store-blockers)
   - *1.1 Backend Security, JWT Auth & Multi-Tenancy (`server/index.ts`)*
   - *1.2 Fix Friend Add Logout Bug (`src/App.tsx`)*
   - *1.3 Android Manifest Hardening & Permission Minimization (`AndroidManifest.xml`)*
   - *1.4 Account Deletion API & UI (`server/index.ts`, `ProfileView.tsx`)*
   - *1.5 Authenticated API Client & Dynamic URL (`src/utils/api.ts`)*
   - *1.6 JWT Session Storage & State Scoping (`src/store/authStore.ts`, `src/store/appStore.ts`)*
3. [Phase 2: Performance (Web + APK)](#phase-2-performance-web--apk)
   - *2.1 Web Code-Splitting with `React.lazy()` (`src/App.tsx`)*
   - *2.2 Offline Client-Side QR Generation (`src/utils/upi.ts`)*
   - *2.3 Unmemoized Balance Calculation Fix (`src/components/Views/ProfileView.tsx`, `GroupsListView.tsx`)*
   - *2.4 WebSocket Backoff & Battery Optimization (`src/utils/api.ts`)*
   - *2.5 Android R8 / ProGuard Minification (`android/app/build.gradle`)*
4. [Phase 3: UI/UX Improvements & Mobile Ergonomics](#phase-3-uiux-improvements--mobile-ergonomics)
   - *3.1 Android Hardware Back Button Handling (`src/App.tsx`)*
   - *3.2 48x48dp Min Touch Targets on All Modals*
   - *3.3 WCAG AA Contrast Fixes (`text-slate-400` -> `text-slate-600`)*
   - *3.4 Modal Accessibility (`role="dialog"`, `aria-modal="true"`, `aria-label`)*
   - *3.5 Metadata Policy Fixes (Remove "PRO" & Unverified Claims)*
5. [Phase 4: Code Quality, Tests & Release Polish](#phase-4-code-quality-tests--release-polish)
   - *4.1 Automated Unit Tests for Debt Simplifier (`src/utils/debtSimplifier.test.ts`)*
   - *4.2 CSV Formula Injection Prevention (`src/utils/exportSummary.ts`)*
   - *4.3 Android SDK Version Harmonization (`android/variables.gradle`)*

---

## 1. Required Packages & Dependency Management

```bash
# Production dependencies
npm install jsonwebtoken helmet express-rate-limit qrcode @capacitor/app

# Development dependencies & testing
npm install -D @types/jsonwebtoken @types/qrcode vitest

# Remove unused native plugin causing Google Play permission rejection
npm uninstall @capacitor/camera
```

---

## Phase 1: Critical Security, Crash Fixes & Play Store Blockers

### 1.1 Backend Security, JWT Auth & Multi-Tenancy (`server/index.ts`)
* **Fixes Applied:**
  - Permanently removed unauthenticated `/api/reset` wipeout route.
  - Added `jsonwebtoken` based authentication middleware (`requireAuth`).
  - Removed default fallback admin secret `'splitshare-admin-secure-key'`.
  - Added helmet and rate limiter (`express-rate-limit`) on auth routes.
  - Replaced mass broadcast with scoped state delivery (`getScopedStateForUser`) to guarantee user privacy.
  - Added numeric positive validation and split-sum checks on expenses.
  - Replaced `Date.now()` with `crypto.randomUUID()` to prevent ID collisions.
  - Added Account Deletion endpoint `DELETE /api/auth/account`.

### 1.2 Fix Friend Add Logout Bug (`src/App.tsx`)
* **File:** `src/App.tsx`
* **Fix:** In `onAddMember`, do not invoke `signUp()` which resets `currentUserId`. Instead, create a lightweight `Member` record `{ id: 'm_' + crypto.randomUUID(), name, upiId }`.

### 1.3 Android Manifest Hardening & Permission Minimization
* **File:** `android/app/src/main/AndroidManifest.xml`
* **Fix:**
  - `android:usesCleartextTraffic="false"` (Blocks insecure HTTP)
  - `android:allowBackup="false"` (Blocks ADB data cloning)
  - Purged unused `CAMERA`, `READ_MEDIA_IMAGES`, and `READ_EXTERNAL_STORAGE` permissions.

### 1.4 Account Deletion API & UI
* **Backend:** `DELETE /api/auth/account` verifies JWT, removes user from `db.accounts`, strips user from all group member lists, and cleans up notifications.
* **Frontend:** Added "Delete My Account & Data" button in `ProfileView.tsx` with a two-step confirmation dialog.

### 1.5 Authenticated API Client & Dynamic URL
* **File:** `src/utils/api.ts`
* **Fix:**
  - Removed hardcoded IP `192.168.1.34:3001`. Uses `import.meta.env.VITE_API_BASE_URL` or relative origin.
  - Automatically appends `Authorization: Bearer <token>` to all HTTP requests.
  - Appends `?token=<token>` to WebSocket connection URL for scoped sync.

---

## Phase 2: Performance (Web + APK)

### 2.1 Web Code-Splitting with `React.lazy()` (`src/App.tsx`)
* **File:** `src/App.tsx`
* **Fix:** Convert static modal and view imports to `React.lazy()` with a `<Suspense>` fallback. This immediately drops the initial entry bundle from ~946 kB down to ~350 kB.

### 2.2 Offline Client-Side QR Generation (`src/utils/upi.ts`)
* **File:** `src/utils/upi.ts`
* **Fix:** Replace `https://api.qrserver.com/...` with `QRCode.toDataURL(upiUri)` using the local `qrcode` npm library. Zero network requests, 100% private, works in Airplane Mode.

### 2.3 Unmemoized Balance Calculation Fix
* **Files:** `src/components/Views/ProfileView.tsx` & `src/components/Views/GroupsListView.tsx`
* **Fix:** Wrap `calculateBalances()` in `React.useMemo` to eliminate main thread CPU blocking.

### 2.4 WebSocket Backoff & Battery Optimization (`src/utils/api.ts`)
* **File:** `src/utils/api.ts`
* **Fix:** Exponential backoff (2s, 4s, 8s, 16s, up to 30s) and pauses reconnection while app is backgrounded (`document.hidden`).

### 2.5 Android R8 / ProGuard Minification
* **Files:** `android/app/build.gradle` & `android/app/proguard-rules.pro`
* **Fix:** Enable `minifyEnabled true` and `shrinkResources true` in `buildTypes.release`, and configure Capacitor bridge keep rules in `proguard-rules.pro` to prevent runtime class stripping crashes.

### 2.6 Activity Timeline Memoization & Pagination
* **File:** `src/components/Views/ActivityView.tsx`
* **Fix:** Memoize 4-way transaction sorting and add 25-item chunk pagination with "Load More" to protect mobile WebView memory on large histories.

---

## Phase 3: UI/UX Improvements & Mobile Ergonomics

### 3.1 Android Hardware Back Button Handling (`src/App.tsx`)
* **File:** `src/App.tsx`
* **Fix:** Intercept `@capacitor/app` `backButton` event:
  - If a modal is open -> Close the modal.
  - If inside a group detail view -> Navigate back to all groups.
  - If at home screen -> Exit application.

### 3.2 48x48dp Min Touch Targets on All Modals
* **Files:** `CreateGroupModal.tsx`, `AuthModal.tsx`, `DeleteGroupModal.tsx`, `DisputeModal.tsx`, `InviteEmailModal.tsx`, `NotificationsDrawer.tsx`, `SettleUpModal.tsx`, `AddExpenseModal.tsx`.
* **Fix:** Enforce `min-w-[48px] min-h-[48px]` interactive bounds for all close buttons and action icons.

### 3.3 WCAG AA Contrast Fixes
* **Files:** `GroupDetailView.tsx`, `GroupsListView.tsx`, `ProfileView.tsx`.
* **Fix:** Replace low-contrast `text-slate-400` (2.74:1) with `text-slate-600` (6.01:1).

### 3.4 Modal Accessibility Attributes
* **Fix:** Add `role="dialog"`, `aria-modal="true"`, and `aria-label="Close dialog"` to all modals.

### 3.5 Metadata Policy Fixes
* **File:** `src/components/Auth/AuthScreen.tsx`
* **Fix:** Remove promotional "PRO" badge and unverified encryption claims.

### 3.6 Real-Time Offline Banner Indicator
* **File:** `src/App.tsx`
* **Fix:** Added `window.addEventListener('online'/'offline')` network watcher displaying a persistent top warning banner when disconnected.

### 3.7 Mobile Numeric Keyboards
* **Files:** `AddExpenseModal.tsx`, `CreateGroupModal.tsx`
* **Fix:** Added `inputMode="decimal"` and `inputMode="numeric"` to trigger native numeric keyboards on mobile devices.

---

## Phase 4: Code Quality, Tests & Release Polish

### 4.1 Automated Unit Tests for Debt Simplifier
* **File:** `src/utils/debtSimplifier.test.ts`
* **Test cases:**
  - Equal split balance calculation
  - Exact split balance calculation
  - Greedy cash flow simplification (3+ member triangular debt)
  - Zero balance / fully settled verification
  - IEEE-754 floating-point rounding precision

### 4.2 CSV Formula Injection Prevention
* **File:** `src/utils/exportSummary.ts`
* **Fix:** Sanitize all CSV cells; prefix strings starting with `=`, `+`, `-`, `@` with a single quote `'`.

### 4.3 Android SDK Version Harmonization
* **File:** `android/variables.gradle`
* **Fix:** Set `targetSdkVersion = 35` and `compileSdkVersion = 35` for maximum Play Store compatibility.

### 4.4 Google Play Store Mandatory Legal Pages
* **Files:** `public/privacy-policy.html` & `public/delete-account.html`
* **Fix:** Authored a dedicated Privacy Policy and a public web-based account deletion portal matching Google Play's mandatory policy requirements.

### 4.5 In-App Compliance & Deletion Links
* **File:** `src/components/Views/ProfileView.tsx`
* **Fix:** Added footer links directing users to the Privacy Policy and Web Account Deletion portal.

---

## Phase 5: Google Play Store Assets & UI/UX Text De-Cluttering

### 5.1 Google Play Official Icons & Feature Graphic Assets
* **Files:**
  - `android/play-store-assets/icon-512.png` & `icon-512.svg`: Official 512x512 high-resolution icon (32-bit PNG) for Google Play Console listing.
  - `android/play-store-assets/feature-graphic.png` & `feature-graphic.svg`: Official 1024x500 Feature Graphic (RGB PNG) with clean emerald/teal branding.
  - `public/favicon.svg`: Branded SplitShare vector icon replacing default Vite logo.

### 5.2 Android Adaptive & Mipmap Launcher Drawables
* **Files:**
  - `android/app/src/main/res/drawable/ic_launcher_foreground.xml`: Android 8.0+ vector adaptive foreground icon (108dp x 108dp with 72dp safe area).
  - `android/app/src/main/res/values/ic_launcher_background.xml`: Dark slate `#0f172a` background.
  - `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` & `ic_launcher_round.xml`: Configured vector launcher bindings.
  - `android/app/src/main/res/mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/`: High-density raster fallback PNGs (square + circle) generated for older Android devices.

### 5.3 UI/UX Text De-Cluttering & Simplification
* **Files:**
  - `src/components/Layout/Header.tsx`: Removed redundant "Live" tag next to logo for a sleek, mature brand presence.
  - `src/components/Auth/AuthScreen.tsx`: Purged bulky 10-line promotional marketing card; simplified hero subtitle to *"Simple group expense splitting"*.
  - `src/components/Views/GroupsListView.tsx`: Replaced 15-line 3-step instructional empty state with a minimalist fintech card (*"No groups yet • Create a group to start splitting bills and settling balances"*).
  - `src/components/Views/ProfileView.tsx`: Simplified payment section to *"Payment Accounts"*, changed button to *"+ Add UPI"*, and cleaned QR code preview dialogs.

