const { spawn } = require('child_process');

console.log('🚀 Starting SplitShare (Backend Server + Vite Dev Server)...');

const isWin = process.platform === 'win32';
const npxCmd = isWin ? 'npx.cmd' : 'npx';

// 1. Start Backend Server on port 3001
const server = spawn(npxCmd, ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '3001' },
});

// 2. Start Vite Dev Server
const vite = spawn(npxCmd, ['vite'], {
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  try {
    server.kill();
    vite.kill();
  } catch {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

