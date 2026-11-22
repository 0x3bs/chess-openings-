# Install ChessCoach on Windows, macOS or Linux

This guide starts from a fresh computer. You need Node.js 22, Git, and a free
Supabase project for the database.

The app has **no email login**. Instead, the first device creates a
**sync code**; entering that code on another device loads the same progress.

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

The project also includes `.nvmrc`; if you use nvm, `nvm use` picks Node 22.

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

This downloads Next.js, React, chess.js and chessground. It does not download
the database.

---

## 5. Create the database

1. Go to <https://supabase.com> and create a free project.
2. Wait until the project is ready.
3. Open **SQL Editor → New query**.
4. Copy the whole of [`supabase/schema.sql`](supabase/schema.sql) into the
   editor and click **Run**.
5. The script creates `sync_profiles`, `sync_line_progress`, `sync_stats` and
   the secure RPC functions. It is safe to run again later.

---

## 6. Create `.env.local`

### macOS / Linux

```bash
cp .env.example .env.local
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env.local
```

### Windows Command Prompt

```cmd
copy .env.example .env.local
```

Open `.env.local` in a text editor and fill in the values from
**Supabase → Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **Security:** use the **anon/public** key only. Never put the
> `service_role` key in a `NEXT_PUBLIC_` variable; every browser would receive
> it. `.env.local` is ignored by Git.

---

## 7. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>. The app redirects to `/en` or `/ar`.

1. Open **Dashboard** (`/progress`).
2. Find **Sync across devices**.
3. Click **Create sync code**.
4. Save the 20-character code somewhere safe. It is the key to your progress.

Training now writes every finished line to Postgres.

---

## 8. Use it on another device

Install the project on the second device the same way, open `/progress`, find
**Sync across devices**, and enter the same code under **I already have a
code**. The dashboard loads the same rows.

The code works on Windows, macOS, Linux, Android and iOS browsers.

---

## 9. Production build (optional)

```bash
npm run build
npm start
```

Or deploy the repository to Vercel and add the same environment variables in
the project settings. Set `NEXT_PUBLIC_SITE_URL` to your real domain.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| “Database is not configured” | `.env.local` is missing or the app was not restarted after editing it. |
| “No profile was found for that code” | Check the code; dashes and spaces are ignored, but every letter matters. |
| Code is lost | Progress cannot be recovered without the code. Create a new code only if you accept starting over. |
| Port 3000 is busy | `npm run dev -- -p 3001` and open `http://localhost:3001`. |
| `node: command not found` | Reopen the terminal after installing Node, or check `node -v`. |
| Build fails after pulling | Delete `node_modules` and `.next`, then run `npm install` again. |
| RPC error in the browser console | Re-run `supabase/schema.sql`; the functions or permissions are missing. |

---

## What is stored where

| Data | Location |
| --- | --- |
| Sync code | Browser `localStorage` (`chess-coach-sync-code`) |
| Progress, reviews, history | Supabase `sync_line_progress` |
| Streak days and sessions | Supabase `sync_stats` |
| Language and theme | Browser `localStorage` (UI preferences only) |

The browser never stores progress rows. Clearing site data removes only the
sync code from that device; the database rows remain until you delete them
from the dashboard.
