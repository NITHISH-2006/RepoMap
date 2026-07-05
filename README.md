# 🛡️ RepoMap Sentinel v2.0 — Active Architecture Agent

**Autonomous Architecture Compliance & Technical Debt Sentinel — Now with AI Agent Chat, Execution Tracing & Persistent Memory**

An AI-powered full-stack application that analyzes repository file trees (paste or GitHub URL), detects architecture patterns, grades technical debt, visualizes module relationships as an interactive graph, and lets you chat with a context-aware AI agent about specific modules.

![RepoMap Sentinel](https://img.shields.io/badge/RepoMap-Sentinel_v2.0-00FF00?style=for-the-badge&logo=shield&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-4285F4?style=flat-square&logo=google&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Persistent_Memory-003B57?style=flat-square&logo=sqlite&logoColor=white)

## ✨ Features

### 🤖 Active Agent Capabilities
- **Context-Aware Agent Chat (RAG)** — Click any node on the graph → chat with Gemini scoped to that module's context. Ask "How do I fix this?" and get code fixes specific to that architectural layer.
- **Dynamic Execution Tracing** — Simulate data flows (Login Flow, DB Write, API Request) with animated path highlights across the architecture graph.
- **Persistent Agent Memory (SQLite)** — Every scan, violation, and chat interaction is saved. Scan history persists across sessions with zero configuration.
- **GitHub Repo Parsing** — Paste a GitHub repository URL → auto-fetch the file tree → instant architecture analysis.

### 📊 Architecture Analysis
- **AI Architecture Detection** — Powered by Gemini 2.0 Flash to detect MVC, Clean Architecture, Hexagonal, and more
- **Technical Debt Grading** — A–F scoring based on coupling, cohesion, test coverage, and naming conventions
- **3-State Node Health** — Nodes show COMPLIANT (green), WARNING (amber pulse), or CRITICAL (red pulse) status
- **Compliance Violation Scanner** — Identifies circular dependencies, layer violations, missing abstractions, security anti-patterns

### 🎨 Interactive UI
- **Interactive React Flow Canvas** — Visualizes architectural districts with animated dependency edges
- **4-Way Audience Switcher** — Descriptions tailored for School Students, Junior Devs, Senior Architects, and Product Managers
- **Onboarding Ticket Generator** — Exports audit data as GitHub-Flavored Markdown with one click
- **3 Quick-Scan Presets** — Pre-loaded file trees for Next.js SaaS, Go Microservice, and FastAPI Backend
- **Failsafe Mock Mode** — Works fully without an API key using rich pre-seeded data

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Flow, Lucide React |
| Backend | Node.js, Express, @google/genai |
| AI Model | Gemini 2.0 Flash with strict JSON schema |
| Database | SQLite (better-sqlite3) — zero configuration |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Backend
```bash
cd backend
cp .env.example .env    # Add your GEMINI_API_KEY (optional — mock mode works without it)
npm install
npm start               # Starts on http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm run dev             # Starts on http://localhost:5173
```

> **Note:** The app runs fully in mock mode without a Gemini API key. Add your key to `backend/.env` to enable live AI analysis.

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with engine status |
| `POST` | `/api/audit` | Analyze a file tree (accepts `{ fileTree, projectName }`) |
| `POST` | `/api/agent/chat` | Context-aware chat (accepts `{ scanId, nodeId, userMessage, activeNodeData }`) |
| `GET` | `/api/history` | List all past scans |
| `GET` | `/api/history/:id` | Get full scan details + chat history |
| `DELETE` | `/api/history/:id` | Delete a scan |
| `POST` | `/api/github/fetch-tree` | Fetch a GitHub repo tree (accepts `{ repoUrl }`) |

## 📁 Project Structure

```
repoMap/
├── backend/
│   ├── server.js          # Express server + Gemini + SQLite + GitHub API
│   ├── sentinel.db        # Auto-created SQLite database (gitignored)
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Root component + global state
│   │   ├── components/
│   │   │   ├── Header.jsx             # Logo + audience switcher + status
│   │   │   ├── LeftPanel.jsx          # History + GitHub input + presets + terminal
│   │   │   ├── CenterCanvas.jsx       # React Flow + execution trace toolbar
│   │   │   ├── DistrictNode.jsx       # Custom node with 3-state status
│   │   │   ├── RightPanel.jsx         # Inspector + Agent Chat + Audit tabs
│   │   │   ├── AgentChat.jsx          # Context-aware AI chat interface
│   │   │   └── TicketModal.jsx        # Markdown export modal
│   │   └── data/
│   │       ├── presets.js             # Quick-scan file trees
│   │       └── terminalLines.js       # Loading animation messages
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
└── .gitignore
```

<!-- ## 🎯 Demo Flow (For Presentations)

1. **Paste a file tree** (or GitHub URL) and hit **Execute Analysis**
2. Watch the terminal animation and graph build itself
3. Point to the **node status colors**: green = healthy, amber = warning, red = critical
4. Open the **Simulate Execution Trace** dropdown → select **"User Login Flow"** → watch the graph animate
5. **Click a red/critical node** on the graph
6. Switch to the **Agent Chat** tab and type: *"Generate the exact code I need to fix this compliance violation"*
7. Watch the AI generate scoped, contextual code in the chat panel
8. Show the **Scan History** tab — past scans persist across sessions via SQLite -->

## 📄 License

MIT
