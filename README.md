# 🛡️ RepoMap Sentinel

**Autonomous Architecture Compliance & Technical Debt Sentinel**

An AI-powered full-stack application that analyzes repository file trees, detects architecture patterns, grades technical debt, and visualizes module relationships as an interactive graph.

![RepoMap Sentinel](https://img.shields.io/badge/RepoMap-Sentinel-00FF00?style=for-the-badge&logo=shield&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Gemini](https://img.shields.io/badge/Gemini-1.5_Flash-4285F4?style=flat-square&logo=google&logoColor=white)

## ✨ Features

- **AI Architecture Detection** — Powered by Gemini 1.5 Flash to detect MVC, Clean Architecture, Hexagonal, and more
- **Technical Debt Grading** — A–F scoring based on coupling, cohesion, test coverage, and naming conventions
- **Compliance Violation Scanner** — Identifies circular dependencies, layer violations, missing abstractions, security anti-patterns
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
| AI Model | Gemini 1.5 Flash with strict JSON schema |

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

## 📁 Project Structure

```
repoMap/
├── backend/
│   ├── server.js          # Express server + Gemini integration + failsafe mock
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Root component + global state
│   │   ├── components/
│   │   │   ├── Header.jsx             # Logo + audience switcher + status
│   │   │   ├── LeftPanel.jsx          # Presets + input + terminal animation
│   │   │   ├── CenterCanvas.jsx       # React Flow visualization
│   │   │   ├── DistrictNode.jsx       # Custom node component
│   │   │   ├── RightPanel.jsx         # Inspector + audit tabs
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

## 📄 License

MIT
