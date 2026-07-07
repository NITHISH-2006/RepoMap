# 🛡️ RepoMap Sentinel v2.2 — Active Architecture Agent

**Autonomous Architecture Compliance & Technical Debt Sentinel — Now with Dynamic Themes, Trace Playback, PDF Exports, Custom SVG Dashboard Charts & GitHub Deep Scan Ingestion**

An AI-powered full-stack application that analyzes repository file trees, detects architecture patterns, grades technical debt, visualizes module relationships as an interactive graph, and lets you chat with a context-aware AI agent about specific modules.

![RepoMap Sentinel](https://img.shields.io/badge/RepoMap-Sentinel_v2.2-00FF00?style=for-the-badge&logo=shield&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini-3.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Persistent_Memory-003B57?style=flat-square&logo=sqlite&logoColor=white)

## ✨ Features (v2.2 Upgrades)

### 🎨 Visual & Layout Perfection
- **Deterministic Repo Themes** — The system hashes the repository name to select one of 5 gorgeous themes: *Cyberpunk Neon, Emerald Matrix, Deep Space Blue, Amber Tactical, or Obsidian Gold*. The canvas background, grid dots, edge lines, and node details dynamically adjust to the theme.
- **Trace Playback Controls** — True step-by-step playback simulation of data paths (Login Flow, DB Write, API Requests) with **Play/Pause**, **Speed Selector (0.5x, 1x, 2x)**, and a **Timeline Scrubber** slider. Highlights path nodes sequentially with glowing trails.
- **Audience Hover Tooltips** — Hover over any district node to reveal a dynamic hover card showing descriptions tailored exactly to the globally selected audience level.
- **Interactive SVG Dashboard Charts** — Embedded native SVG Pie/Donut Chart (Violation Severity Ratio) and capsule Bar Chart (District Health distribution) rendered at 60fps in the Audit Tab.

### 🌐 Bulletproof Ingestion & GitHub Deep Scan
- **GitHub Ingestion** — Paste any public GitHub repo URL (`https://github.com/owner/repo`) to fetch the recursive tree with smart noise filters (excluding `node_modules`, `dist`, `.idea`, lockfiles, etc.).
- **Deep Scan Ingestion Toggle** — When enabled, the backend extracts the actual contents of configuration and manifest files (like `package.json`, `tsconfig.json`, `go.mod`, `requirements.txt`, etc.) and feeds them to Gemini, allowing extremely accurate analysis of frameworks, tools, and code coupling.

### 🛡️ Report Export & Memory Continuity
- **Multi-Format Onboarding Ticket Export** — Generate beautiful reports and onboarding checklists. Export as **Markdown (.md)**, **JSON (.json)**, or download a gorgeous tactical **PDF (.pdf)** generated client-side using `jsPDF`.
- **Conversational Memory Continuity** — The agent RAG chat now maintains context from the last 24 messages (12 complete conversation turns) stored in the WAL-enabled SQLite DB, allowing natural follow-up questions.
- **Failsafe Mock Mode** — Fully functional without an API key, providing rich pre-seeded tactical mock metrics.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Flow, Lucide React, jsPDF |
| Backend | Node.js, Express, Axios, better-sqlite3 |
| AI Model | Gemini Flash API (with strict JSON Schema & 6-model fallback rotation chain) |
| Database | SQLite (better-sqlite3) with WAL journal mode |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Backend Setup
1. Open the `backend/` folder:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env` and configure your API keys (you can provide multiple comma-separated keys for automatic rotation):
   ```env
   PORT=3000
   GEMINI_API_KEY=AIzaSy...
   GITHUB_TOKEN=ghp_... (Optional, for higher rate limits on public tree fetches)
   ```
3. Install dependencies and start:
   ```bash
   npm install
   npm start
   ```

### Frontend Setup
1. Open the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Open your browser to the local URL (defaults to `http://localhost:5173`).

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with database readiness and model config details |
| `POST` | `/api/audit` | Execute AI architecture audit (accepts `{ fileTree, projectName, configContents }`) |
| `POST` | `/api/agent/chat` | Scoped conversational agent RAG chat (accepts `{ scanId, nodeId, userMessage, activeNodeData }`) |
| `GET` | `/api/history` | List past scan logs |
| `GET` | `/api/history/:id` | Fetch detailed scan history + chat history database records |
| `DELETE` | `/api/history/:id` | Purge a scan record from DB |
| `POST` | `/api/github/fetch-tree` | Extract repo structure + configurations (accepts `{ repoUrl, deepScan }`) |

---

## 📁 Project Structure

```
repoMap/
├── backend/
│   ├── server.js          # Express server + Gemini + SQLite + GitHub API
│   ├── sentinel.db        # SQLite database (auto-created)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Root layout + event handlers
│   │   ├── components/
│   │   │   ├── Header.jsx             # Version label + Audience Selector
│   │   │   ├── LeftPanel.jsx          # Repos + presets + log terminal + Deep Scan toggle
│   │   │   ├── CenterCanvas.jsx       # React Flow + Playback controls + Scrubber
│   │   │   ├── DistrictNode.jsx       # Custom dynamic theme styles + hover tooltip
│   │   │   ├── RightPanel.jsx         # Inspector + Agent Chat + Audit stats
│   │   │   ├── AgentChat.jsx          # Markdown response printer
│   │   │   └── TicketModal.jsx        # Markdown, JSON, PDF exporter
│   │   └── data/
│   │       ├── themes.js              # 5 Cyberpunk/Tactical theme definitions
│   │       ├── presets.js             # Project presets
│   │       └── terminalLines.js       # Log visual triggers
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
```

---

## ⚡ Deployment Guide

### Backend (Render / Railway)
1. Deploy as a Web Service.
2. Select Node.js environment.
3. Configure Environment Variables (`GEMINI_API_KEY`, `PORT`, `GITHUB_TOKEN`).
4. To persist SQLite scans across redeployments, mount a persistent volume at `/data` and update the database file path in `server.js` to `/data/sentinel.db`.

### Frontend (Vercel / Netlify / GitHub Pages)
1. Configure Vite production environment variables if needed (`VITE_API_URL` pointing to the deployed backend URL).
2. Set build command to `npm run build` and output folder to `dist/`.
3. Deploy as static web application.

---

## 📄 License

MIT

