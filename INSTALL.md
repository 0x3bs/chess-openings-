# Install ChessCoach on Windows, macOS or Linux

This guide starts from a fresh computer. You need Node.js 22 and Git. No
database, account or API key is required: the server saves progress in
`data/progress.json`.

---

## 1. Install Node.js 22

Check whether Node is already installed:

```bash
node -v
```

You want `v22.x` or newer (Node 20.9+ also works).

### Windows

Option A — installer:

1. Open <https://nodejs.org> and download the **LTS** installer.
2. Run it and keep the default options.
3. Close and reopen PowerShell, then run `node -v`.

Option B — winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

### macOS

Option A — Homebrew:

```bash
brew install node@22
```

Option B — installer: download the LTS `.pkg` from <https://nodejs.org>.

### Linux

Option A — nvm (recommended):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# close and reopen the terminal
nvm install 22
nvm use 22
```

Option B — distribution package:

```bash
# Ubuntu / Debian
sudo apt update && sudo apt install nodejs npm

# Fedora
sudo dnf install nodejs npm
```

The project includes `.nvmrc`; if you use nvm, `nvm use` picks Node 22.

---

## 2. Install Git

Check:

```bash
git --version
```

- **Windows:** install from <https://git-scm.com/download/win>.
- **macOS:** `xcode-select --install` or `brew install git`.
- **Linux:** `sudo apt install git` or `sudo dnf install git`.

---

## 3. Get the project

Clone your GitHub repository:

```bash
git clone https://github.com/YOUR-NAME/chess-coach.git
cd chess-coach
```

If you downloaded a ZIP instead, extract it and open a terminal in that folder.

---

## 4. Install dependencies

```bash
npm install
```

This downloads Next.js, React, chess.js and chessground. Nothing else is
downloaded at runtime, and there is no database to configure.

---

## 5. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>. The app redirects to `/en` or `/ar`.

Open a course, choose **Train**, and finish one line. The server creates:

```text
data/progress.json
```

That file now holds every line, review date, mastery star and streak day.

---

## 6. Open the same progress from your phone

Both devices must be able to reach the same running server.

1. Keep the laptop and phone on the same Wi‑Fi.
2. Find the laptop's local IP:
   - **Windows:** `ipconfig` — read `IPv4 Address`.
   - **macOS:** `ipconfig getifaddr en0`.
   - **Linux:** `hostname -I`.
3. Stop the server, then start it with that address:

   ```bash
   npm run dev -- -H 192.168.1.50
   ```

   Replace `192.168.1.50` with your own IP. Starting with the IP is important:
   Next.js blocks unknown development hostnames by default.
4. Allow Node.js or port 3000 through the firewall if the phone cannot connect.
5. On the phone open `http://192.168.1.50:3000`.

The phone uses the same server, so it reads and writes the same
`data/progress.json`. There is no sync code to enter.

> If the laptop is off, or the phone leaves the Wi‑Fi, the site is unreachable.
> For access from anywhere, run the project on a VPS or a hosting provider.

---

## 7. Back up or move progress

Copy the single file:

```bash
# macOS / Linux
cp data/progress.json ~/chess-progress-backup.json

# Windows PowerShell
Copy-Item data\progress.json $HOME\chess-progress-backup.json
```

To move to another computer, copy the project **and** `data/progress.json`.

To store the file in a synced folder instead, create `.env.local` and use an
absolute path (relative names are resolved inside `data/`):

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

Then set an absolute path:

```bash
CHESSCOACH_DATA_FILE=/home/you/Dropbox/chess-progress.json
```

On Windows, use forward slashes or escaped backslashes:

```bash
CHESSCOACH_DATA_FILE=C:/Users/You/Dropbox/chess-progress.json
```

Restart the server after editing `.env.local`.

---

## 8. Production build (optional)

```bash
npm run build
npm start
```

The production server also writes `data/progress.json`. The folder must be
writable. On a read-only or serverless host, use a real database instead.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| Phone cannot open the page | Check the IP, the same Wi‑Fi, the `-H` address and the firewall. |
| “Cross origin request detected” in dev | Start with `npm run dev -- -H <your-lan-ip>` instead of another hostname. |
| Progress does not appear on another device | Both devices must open the same running server, not two separate copies. |
| Progress disappeared after moving the project | Copy `data/progress.json` too. |
| Port 3000 is busy | `npm run dev -- -p 3001` and open `http://localhost:3001`. |
| `node: command not found` | Reopen the terminal after installing Node, or check `node -v`. |
| Build fails after pulling | Delete `node_modules` and `.next`, then run `npm install` again. |
| `data/progress.json` is corrupt | Restore a backup; the server treats a missing file as fresh progress. |

---

## What is stored where

| Data | Location |
| --- | --- |
| Progress, reviews, history | `data/progress.json` on the server |
| Streak days and sessions | `data/progress.json` on the server |
| Language, theme, board size | Browser `localStorage` (UI preferences only) |

`data/progress.json` is ignored by Git. Never commit it if it contains personal
training history.
