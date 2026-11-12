# 🚀 ThunderBoard — Auto-Updater & Releases Guide

ThunderBoard includes an automated update system powered by `electron-updater` and GitHub Releases (`Sharief2854/thunder-board`).

---

## 🌟 Current Official Release: **v3.0.0**

The latest official stable release on GitHub is **ThunderBoard v3.0.0**:
- **Release Link**: [https://github.com/Sharief2854/thunder-board/releases/tag/v3.0.0](https://github.com/Sharief2854/thunder-board/releases/tag/v3.0.0)
- **Installer**: `ThunderBoard-v3-Setup-3.0.0.exe`
- **Portable**: `ThunderBoard-v3-3.0.0.exe`
- **Auto-Update Metadata**: `latest.yml`

1. **Automatic Background Check**:
   - When ThunderBoard is launched as an installed app, it checks for updates from GitHub Releases within 6 seconds of startup.
2. **Instant Toast Notification**:
   - If a new version exists, an elegant floating toast appears:
     > 🚀 **ThunderBoard vX.X.X Available** — Click **Download** to start downloading.
3. **Manual Check via Settings**:
   - Open **Preferences & Settings** (`TitleBar -> Settings` or shortcut).
   - Under **Software Updates & Releases**, view your current version, click **Check Updates**, inspect release notes, and monitor the download progress bar in real-time.
4. **Seamless 1-Click Install**:
   - When the update finishes downloading, click **Restart & Install Now**.
   - ThunderBoard restarts cleanly, applies the update, and preserves all your existing lessons, notes, and batches!

---

## 📋 Steps for You to Publish a New Update

Follow these easy steps whenever you want to release an update (e.g., version `4.0.1`):

### Option 1: Automated 1-Command Publish (Recommended)

1. **Get a GitHub Personal Access Token (PAT)**:
   - Go to [GitHub Settings -> Tokens (Classic)](https://github.com/settings/tokens).
   - Generate a new token with the `repo` scope enabled.
   - Copy your token (e.g., `ghp_xxxxxxxxxxxx`).

2. **Bump the Version in `package.json`**:
   Open `package.json` and change `"version"`:
   ```json
   "version": "4.0.1",
   ```

3. **Run the Publish Command**:
   In PowerShell:
   ```powershell
   $env:GH_TOKEN="your_github_token_here"
   npm run electron:publish
   ```
   *Or in CMD:*
   ```cmd
   set GH_TOKEN=your_github_token_here && npm run electron:publish
   ```

4. **Verify on GitHub**:
   - Go to [https://github.com/Sharief2854/thunder-board/releases](https://github.com/Sharief2854/thunder-board/releases).
   - You will see the new release draft or release with `ThunderBoard v4 Setup 4.0.1.exe` and `latest.yml` already uploaded.
   - Click **Publish release** if it is saved as a draft.

---

### Option 2: Manual Upload (No Token Needed)

If you don't want to generate a GitHub token:

1. **Bump the Version in `package.json`**:
   Change `"version": "4.0.1"`.

2. **Build the Package Locally**:
   ```bash
   npm run electron:build
   ```
   This will generate inside `release-v4/`:
   - `ThunderBoard v4 Setup 4.0.1.exe`
   - `latest.yml`
   - `ThunderBoard v4 Setup 4.0.1.exe.blockmap`

3. **Create the GitHub Release**:
   - Go to [https://github.com/Sharief2854/thunder-board/releases/new](https://github.com/Sharief2854/thunder-board/releases/new).
   - Tag: `v4.0.1` (Target: `main`).
   - Title: `ThunderBoard v4.0.1`.
   - Drag and drop these files from `release-v4/` into the release assets:
     - `ThunderBoard v4 Setup 4.0.1.exe`
     - `latest.yml`
     - `ThunderBoard v4 Setup 4.0.1.exe.blockmap`
   - Click **Publish release**.

---

## 🧪 How to Test It Yourself

1. Install ThunderBoard from `release-v4/ThunderBoard v4 Setup 4.0.0.exe`.
2. Follow either Option 1 or Option 2 above to release version `4.0.1` on GitHub.
3. Open ThunderBoard `4.0.0` on your PC.
4. ThunderBoard will automatically detect `v4.0.1`, show the update banner, download it, and restart into `v4.0.1`!
