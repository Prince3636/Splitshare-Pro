const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const outputApkDir = path.join(rootDir, 'apk');

console.log('====================================================');
console.log('  🚀 SplitShare Android APK Builder');
console.log('====================================================\n');

// Step 1: Build Web App
console.log('📦 Step 1/3: Compiling React web production bundle...');
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Web build succeeded.\n');
} catch (err) {
  console.error('❌ Failed to compile web bundle.');
  process.exit(1);
}

// Step 2: Sync to native Android folder
console.log('📱 Step 2/3: Syncing web assets to native Android project (Capacitor)...');
try {
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });
  console.log('✅ Capacitor Android sync complete.\n');
} catch (err) {
  console.error('❌ Failed to sync Capacitor Android.');
  process.exit(1);
}

// Step 3: Run Gradle to build APK
console.log('⚙️  Step 3/3: Checking local Android SDK & Java environment...');
const isWindows = process.platform === 'win32';
const gradlewCmd = isWindows ? 'gradlew.bat' : './gradlew';
const gradlewPath = path.join(androidDir, gradlewCmd);

if (!fs.existsSync(gradlewPath)) {
  console.error('❌ Gradle wrapper not found at:', gradlewPath);
  process.exit(1);
}

let javaAvailable = false;
try {
  const javaCheck = spawnSync('java', ['-version'], { encoding: 'utf-8' });
  if (javaCheck.status === 0 || javaCheck.stderr || javaCheck.stdout) {
    javaAvailable = true;
  }
} catch (e) {
  javaAvailable = false;
}

if (!javaAvailable) {
  console.log('\n⚠️  Notice: Java / JDK is not currently detected in your system PATH.');
  console.log('----------------------------------------------------');
  console.log('You have two super easy ways to generate your APK:\n');
  console.log('Method A (Recommended - Via Android Studio):');
  console.log('  1. Install Android Studio (free from https://developer.android.com/studio)');
  console.log('  2. Run: npm run android:open');
  console.log('  3. In Android Studio, click: Build > Build Bundle(s) / APK(s) > Build APK(s)');
  console.log('  4. Done! Your APK is ready on your desktop/laptop.\n');
  console.log('Method B (Cloud Build - Zero installation needed!):');
  console.log('  1. Push this project to GitHub.');
  console.log('  2. GitHub Actions (.github/workflows/build-apk.yml) will automatically');
  console.log('     compile and generate SplitShare-debug.apk for you to download!\n');
  console.log('----------------------------------------------------');
  console.log('To build directly from terminal on this PC, install JDK 17+ and set JAVA_HOME.');
  process.exit(0);
}

console.log('🔨 Compiling APK with Gradle wrapper (assembleDebug)...');
try {
  execSync(`${gradlewCmd} assembleDebug`, { cwd: androidDir, stdio: 'inherit' });
  
  const generatedApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (fs.existsSync(generatedApk)) {
    if (!fs.existsSync(outputApkDir)) {
      fs.mkdirSync(outputApkDir, { recursive: true });
    }
    const finalApk = path.join(outputApkDir, 'SplitShare.apk');
    fs.copyFileSync(generatedApk, finalApk);
    console.log('\n🎉 SUCCESS! Android APK created successfully:');
    console.log(`📍 Location: ${finalApk}`);
    console.log('📲 You can now transfer this APK to any Android phone and install it directly!\n');
  } else {
    console.log('⚠️ Gradle completed, please check android/app/build/outputs/apk/debug/ for app-debug.apk');
  }
} catch (err) {
  console.error('\n❌ Gradle build encountered an issue.');
  console.log('You can open the project in Android Studio with: npm run android:open');
}
