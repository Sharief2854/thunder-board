import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load token from process.env, Windows user registry, or .env file
let token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

if (!token) {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const match = line.match(/^GH_TOKEN=(.+)$/);
      if (match) {
        token = match[1].trim();
        break;
      }
    }
  }
}

if (!token) {
  try {
    const regQuery = execSync('powershell -NoProfile -Command "[System.Environment]::GetEnvironmentVariable(\'GH_TOKEN\', \'User\')"', { encoding: 'utf-8' }).trim();
    if (regQuery) {
      token = regQuery;
    }
  } catch (err) {
    // ignore
  }
}

if (!token) {
  console.error('\n❌ ERROR: GH_TOKEN not found!');
  console.error('Please set GH_TOKEN in your environment or in a .env file.\n');
  process.exit(1);
}

console.log('🚀 Step 1/2: Compiling TypeScript & Vite bundles...');
execSync('npm run build', {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
});

console.log('\n📦 Step 2/2: Building Windows packages & publishing to GitHub Releases...');
execSync('npx electron-builder --win --publish always', {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
});

console.log('\n✅ Successfully published release to GitHub!');
