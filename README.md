# 💸 SplitShare — Real-Time Bill Splitting & Expense Sharing

> A modern, mobile-first bill splitting application with real-time permissions & approval workflow, multi-account UPI barcodes, kitty pool funds, and 1-click WhatsApp settlements.

Works seamlessly as **both a Web App (browser)** and a **Native Android APK**!

---

## 🌟 Key Features

1. **Dual Experience**:
   - **Website Version**: Open in Chrome/Safari on your laptop or phone (`http://localhost:5173` or local Wi-Fi IP).
   - **Android Native APK**: Install directly on any Android phone (`SplitShare.apk`).
   - Both versions sync **in real time** via WebSockets!

2. **Debtor Permission / Approval Workflow**:
   - When a friend adds a bill, debtor members receive an instant alert prompt.
   - The bill only affects final balances once debtors click **Accept**.
   - Friends can also raise queries/disputes or send **Re-request Reminders**.

3. **Multi-UPI Accounts & Barcodes**:
   - Attach multiple UPI accounts (Paytm, GPay, PhonePe, BHIM).
   - Dedicated scannable barcodes per account with custom QR image uploads and fullscreen zoom.

4. **1-Click WhatsApp Settlements & Exports**:
   - Settle up via dynamic UPI QR code.
   - Send funny/friendly WhatsApp nudges.
   - Export full group transaction summary to WhatsApp or download as a CSV spreadsheet.

5. **Trip Kitty Pool Fund**:
   - Pool money together for shared roadtrip tolls, snacks, or party expenses.

6. **Creator-Protected 2-Step Group Deletion**:
   - Only the creator can delete a group, protected by a strict 2-step confirmation requiring typing the group name. Non-creators can safely leave after settling their balance.

---

## 🚀 How to Upload to Your GitHub Repository

Run these commands in your terminal inside the project folder:

```bash
# 1. Initialize git
git init

# 2. Add all project files
git add .

# 3. Create your initial commit
git commit -m "Initial commit: SplitShare full app with Android Capacitor & GitHub Actions"

# 4. Connect to your GitHub repo (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

---

## 📱 How to Build APK Using GitHub Actions (1-Click)

Once you push the code to your GitHub repo:

1. Open your repository on **GitHub**.
2. Click on the **Actions** tab at the top.
3. In the left sidebar, click on **"Build Android APK"**.
4. Click the **"Run workflow"** button on the right side and click the green **Run workflow** button.
5. In ~2 minutes, GitHub Actions will compile the APK in the cloud.
6. Click on the completed workflow run.
7. Under the **Artifacts** section at the bottom, click **`SplitShare-APK`** to download your ready-to-install **`SplitShare.apk`**!

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start backend server (Express + WebSockets on port 3001)
npm run server

# Start frontend dev server (Vite on port 5173)
npm run dev -- --host

# Build and sync Android native assets
npm run android:build

# Open project in Android Studio
npm run android:open

# Build local APK (if JDK 17 installed)
npm run android:apk
```
