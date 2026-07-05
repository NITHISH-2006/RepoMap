import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ─── SQLite Initialization ──────────────────────────────────────────────────
const db = new Database(join(__dirname, "sentinel.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL DEFAULT 'Untitled Scan',
    architecture_type TEXT,
    debt_grade TEXT,
    full_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    node_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'agent')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
  );
`);

console.log("[SENTINEL] SQLite database initialized ✓");

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    engine: "RepoMap Sentinel v2.0 — Active Agent",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    databaseReady: true,
  });
});

// ─── Gemini Response Schema ──────────────────────────────────────────────────
const auditResponseSchema = {
  type: "object",
  properties: {
    detectedArchitecture: {
      type: "string",
      description:
        "The detected software architecture pattern, e.g. Clean Architecture, MVC, Hexagonal, Monolith, Microservices",
    },
    technicalDebtGrade: {
      type: "string",
      enum: ["A", "B", "C", "D", "F"],
      description: "Overall technical debt grade from A (excellent) to F (critical)",
    },
    complianceViolations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          issue: { type: "string" },
          remediation: { type: "string" },
          affectedDistricts: {
            type: "array",
            items: { type: "string" },
            description: "Array of district IDs affected by this violation",
          },
        },
        required: ["severity", "issue", "remediation"],
      },
    },
    districts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          layer: {
            type: "string",
            description:
              "Architectural layer: presentation, application, domain, infrastructure, config, testing, or shared",
          },
          status: {
            type: "string",
            enum: ["COMPLIANT", "WARNING", "CRITICAL"],
            description: "Compliance status of this district",
          },
          connectsTo: {
            type: "array",
            items: { type: "string" },
            description: "Array of district IDs this module depends on",
          },
          descriptions: {
            type: "object",
            properties: {
              student: {
                type: "string",
                description:
                  "Explanation suitable for a school student with no coding background",
              },
              junior: {
                type: "string",
                description:
                  "Explanation suitable for a junior developer learning the ropes",
              },
              senior: {
                type: "string",
                description:
                  "In-depth explanation for a senior architect focusing on design patterns and tradeoffs",
              },
              pm: {
                type: "string",
                description:
                  "Business-oriented explanation for a product manager focusing on impact and scope",
              },
            },
            required: ["student", "junior", "senior", "pm"],
          },
        },
        required: ["id", "name", "layer", "status", "connectsTo", "descriptions"],
      },
    },
    executionTraces: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Human-readable name of the execution flow, e.g. 'User Login Flow'",
          },
          description: {
            type: "string",
            description: "Brief description of what this flow does",
          },
          path: {
            type: "array",
            items: { type: "string" },
            description: "Ordered array of district IDs representing the execution path",
          },
        },
        required: ["name", "description", "path"],
      },
      description: "Predefined execution traces showing data flow paths through the architecture",
    },
  },
  required: [
    "detectedArchitecture",
    "technicalDebtGrade",
    "complianceViolations",
    "districts",
    "executionTraces",
  ],
};

// ─── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are RepoMap Sentinel, an elite software architecture analysis engine. 
Given a project's file/directory tree, you must:

1. DETECT the primary architecture pattern (e.g., Clean Architecture, MVC, Hexagonal, Layered Monolith, Microservices, Feature-Sliced).
2. GRADE the technical debt from A (excellent) to F (critical), considering coupling, cohesion, naming conventions, separation of concerns, and test coverage presence.
3. IDENTIFY compliance violations — issues like circular dependencies, layer violations, missing abstractions, god classes, hardcoded config, missing tests, security anti-patterns. For each violation, list the affected district IDs.
4. MAP the codebase into logical "districts" (architectural modules/boundaries). Each district MUST have a status: COMPLIANT (healthy), WARNING (minor issues), or CRITICAL (major problems). Describe each district for four audiences: a school student, a junior developer, a senior architect, and a product manager.
5. DEFINE connections between districts based on dependency flow.
6. GENERATE 2-4 execution traces showing common data flow paths through the architecture (e.g., "User Login Flow", "Data Write Flow", "API Request Flow"). Each trace is an ordered array of district IDs.

Be thorough. Provide at least 4–8 districts, 3–5 compliance violations, and 2–4 execution traces. Make descriptions genuinely tailored to each audience level. Ensure at least one district has CRITICAL status and one has WARNING status.`;

// ─── Chat System Prompt ──────────────────────────────────────────────────────
const CHAT_SYSTEM_PROMPT = `You are RepoMap Sentinel's Context-Aware Engineering Agent. You are an expert software architect and mentor.

IMPORTANT: You are currently scoped to discuss ONLY the specific architectural module provided in the context. Do NOT discuss other modules unless the user explicitly asks about connections.

Your capabilities:
- Explain architectural decisions and tradeoffs for the given module
- Generate refactored code to fix compliance violations
- Suggest improvements, design patterns, and best practices
- Answer questions about the module's role, dependencies, and responsibilities

Format your responses with clear markdown:
- Use \`\`\`language blocks for code snippets
- Use **bold** for key concepts
- Use bullet points for lists
- Keep responses focused and actionable`;

// ─── Failsafe Mock Data ──────────────────────────────────────────────────────
const FAILSAFE_MOCK = {
  detectedArchitecture: "Layered MVC with Service Pattern",
  technicalDebtGrade: "C",
  complianceViolations: [
    {
      severity: "critical",
      issue: "Circular dependency detected between Controllers and Services layer",
      remediation:
        "Introduce an interface/abstract layer between Controllers and Services. Use dependency injection to invert the control flow.",
      affectedDistricts: ["dist-controllers", "dist-services"],
    },
    {
      severity: "high",
      issue: "No test directory found — zero test coverage",
      remediation:
        "Add a __tests__ or tests/ directory with unit tests for each service module. Aim for at least 70% coverage on business logic.",
      affectedDistricts: ["dist-services", "dist-models"],
    },
    {
      severity: "high",
      issue: "Environment variables accessed directly in business logic",
      remediation:
        "Centralize all environment access in a config/ module. Business logic should receive configuration via dependency injection.",
      affectedDistricts: ["dist-entry", "dist-services"],
    },
    {
      severity: "medium",
      issue: "Database queries embedded directly in route handlers",
      remediation:
        "Extract all data access into a dedicated repository/data-access layer. Route handlers should only call service methods.",
      affectedDistricts: ["dist-routes", "dist-models"],
    },
    {
      severity: "low",
      issue: "Inconsistent file naming conventions (mix of camelCase and kebab-case)",
      remediation:
        "Adopt a single naming convention project-wide. kebab-case is recommended for files, PascalCase for components.",
      affectedDistricts: ["dist-utils"],
    },
  ],
  districts: [
    {
      id: "dist-entry",
      name: "Application Entry",
      layer: "config",
      status: "WARNING",
      connectsTo: ["dist-routes", "dist-middleware"],
      descriptions: {
        student:
          "This is like the front door of a building. When someone visits the app, this is the first thing that opens up and decides where to send them.",
        junior:
          "The entry point bootstraps the Express server, loads environment variables, registers global middleware, and mounts route handlers. It's the composition root.",
        senior:
          "Composition root implementing the application bootstrap sequence. Handles DI container initialization, middleware pipeline assembly, and graceful shutdown hooks. Currently tightly coupled to Express — consider abstracting behind a server interface for testability.",
        pm:
          "The startup module — it initializes the entire application. Changes here affect deployment and infrastructure. It's low-risk for features but high-risk for availability.",
      },
    },
    {
      id: "dist-routes",
      name: "API Routes",
      layer: "presentation",
      status: "COMPLIANT",
      connectsTo: ["dist-controllers"],
      descriptions: {
        student:
          "Think of this as a menu at a restaurant. It lists all the things the app can do, and when you pick one, it sends your order to the kitchen.",
        junior:
          "Route definitions map HTTP endpoints (GET /users, POST /auth, etc.) to controller functions. They handle URL parsing and HTTP method matching.",
        senior:
          "Thin routing layer that should contain zero business logic — purely declarative endpoint-to-handler mapping. Validate that no data transformation or auth logic has leaked into route files. Consider OpenAPI spec generation from route metadata.",
        pm:
          "The API surface — every feature users or other services can access is registered here. Adding new features usually starts with a new route.",
      },
    },
    {
      id: "dist-controllers",
      name: "Controllers",
      layer: "presentation",
      status: "CRITICAL",
      connectsTo: ["dist-services", "dist-middleware"],
      descriptions: {
        student:
          "Controllers are like teachers who receive your question, figure out which expert to ask, get the answer, and give it back to you in a way you understand.",
        junior:
          "Controllers receive HTTP requests, validate input, call the appropriate service method, and format the response. They bridge the HTTP world and the business logic world.",
        senior:
          "Request/response orchestrators. Should be kept thin — extract request DTOs, delegate to services, map results to response DTOs. Watch for controller bloat where business rules creep in. Currently violates SRP in 2 handlers.",
        pm:
          "The traffic directors — they connect user actions to backend processing. Well-structured controllers make it easy to add new API features without disrupting existing ones.",
      },
    },
    {
      id: "dist-services",
      name: "Business Services",
      layer: "application",
      status: "WARNING",
      connectsTo: ["dist-models", "dist-utils"],
      descriptions: {
        student:
          "This is the brain of the application — it does all the thinking and decision-making, like calculating your grade or checking if you have permission to do something.",
        junior:
          "Service classes contain core business logic — validation rules, data processing, orchestration of multiple operations. They should be framework-agnostic and testable in isolation.",
        senior:
          "Application service layer implementing use cases. Should depend only on domain interfaces, not concrete implementations. Current state shows direct ORM coupling — needs repository pattern extraction. Transaction management is ad-hoc.",
        pm:
          "Where the business rules live. Every feature requirement translates to service logic. This is the highest-value code in the system and should have the most test coverage.",
      },
    },
    {
      id: "dist-models",
      name: "Data Models",
      layer: "domain",
      status: "COMPLIANT",
      connectsTo: [],
      descriptions: {
        student:
          "Models are like blueprints or forms. They define what information the app keeps track of — like a student record that has a name, age, and grade.",
        junior:
          "Data models/schemas define the shape of your data — database tables, TypeScript interfaces, or Mongoose schemas. They're the source of truth for what data exists.",
        senior:
          "Domain entity definitions. Ideally should be persistence-agnostic POJOs with domain behavior, but current implementation is tightly coupled to the ORM. Consider separating domain entities from persistence models (Data Mapper pattern).",
        pm:
          "The data structures — they define what information the product stores and manages. Schema changes here can impact every feature that touches that data.",
      },
    },
    {
      id: "dist-middleware",
      name: "Middleware Pipeline",
      layer: "infrastructure",
      status: "WARNING",
      connectsTo: ["dist-utils"],
      descriptions: {
        student:
          "Middleware is like security guards at a concert. Before you get to the stage, they check your ticket, scan your bag, and make sure everything is safe.",
        junior:
          "Middleware functions run before your route handler — they handle auth, logging, rate limiting, error handling, and request parsing. They form a pipeline that every request flows through.",
        senior:
          "Cross-cutting concern pipeline. Auth middleware should validate JWTs without business logic. Error middleware must be the final handler. Current implementation has auth logic scattered across middleware and controllers — centralize into a single auth strategy.",
        pm:
          "Security and quality gates — they protect the app from unauthorized access, log activity for debugging, and ensure data quality. Critical for compliance and reliability.",
      },
    },
    {
      id: "dist-utils",
      name: "Shared Utilities",
      layer: "shared",
      status: "COMPLIANT",
      connectsTo: [],
      descriptions: {
        student:
          "Utilities are like a toolbox — they have handy tools that everyone in the project can use, like a calculator or a date formatter.",
        junior:
          "Helper functions and shared utilities — date formatting, string manipulation, error classes, constants. They should be pure functions with no side effects and no dependencies on other project modules.",
        senior:
          "Shared kernel / utility layer. Must remain dependency-free and side-effect-free. Watch for this becoming a dumping ground — if a utility is domain-specific, it belongs in the domain layer. Consider splitting into typed utility modules.",
        pm:
          "Reusable building blocks used across the entire app. Low feature impact but high maintenance value — bugs here cascade everywhere.",
      },
    },
  ],
  executionTraces: [
    {
      name: "User Login Flow",
      description: "Authentication request from client to database validation",
      path: ["dist-routes", "dist-controllers", "dist-middleware", "dist-services", "dist-models"],
    },
    {
      name: "Database Write Flow",
      description: "Data creation request through the application layers",
      path: ["dist-routes", "dist-controllers", "dist-services", "dist-models"],
    },
    {
      name: "API Request Flow",
      description: "Standard GET request through middleware and service layers",
      path: ["dist-entry", "dist-middleware", "dist-routes", "dist-controllers", "dist-services"],
    },
  ],
};

// ─── Audit Endpoint ──────────────────────────────────────────────────────────
app.post("/api/audit", async (req, res) => {
  const { fileTree, projectName } = req.body;

  if (!fileTree || typeof fileTree !== "string" || fileTree.trim().length === 0) {
    return res.status(400).json({
      error: "Missing or empty fileTree in request body",
    });
  }

  const name = projectName || "Untitled Scan";
  let result;

  // If no API key, return failsafe immediately
  if (!process.env.GEMINI_API_KEY) {
    console.log("[SENTINEL] No GEMINI_API_KEY found — returning failsafe mock data");
    result = { ...FAILSAFE_MOCK, isMock: true, apiError: "No API Key Provided" };
  } else {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${SYSTEM_PROMPT}\n\n--- FILE TREE ---\n${fileTree}\n--- END FILE TREE ---\n\nAnalyze the above file tree and return your findings as structured JSON.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: auditResponseSchema,
          temperature: 0.4,
        },
      });

      const text = response.text;
      let parsed;

      try {
        parsed = JSON.parse(text);
      } catch {
        console.error("[SENTINEL] Failed to parse Gemini response as JSON:", text);
        console.log("[SENTINEL] Returning failsafe mock data");
        result = { ...FAILSAFE_MOCK, isMock: true, apiError: "JSON Parse Error" };
      }

      if (parsed) {
        // Validate minimum required fields
        if (
          !parsed.detectedArchitecture ||
          !parsed.technicalDebtGrade ||
          !Array.isArray(parsed.districts)
        ) {
          console.error("[SENTINEL] Gemini response missing required fields");
          console.log("[SENTINEL] Returning failsafe mock data");
          result = { ...FAILSAFE_MOCK, isMock: true, apiError: "Missing Required Fields" };
        } else {
          // Ensure executionTraces exists
          if (!Array.isArray(parsed.executionTraces)) {
            parsed.executionTraces = [];
          }
          // Ensure all districts have a status
          parsed.districts = parsed.districts.map((d) => ({
            ...d,
            status: d.status || "COMPLIANT",
          }));
          result = parsed;
        }
      }
    } catch (err) {
      console.error("[SENTINEL] Gemini API error:", err.message || err);
      console.log("[SENTINEL] Returning failsafe mock data");
      // Extract the rate limit message if it's a 429
      let errorMsg = err.message || String(err);
      if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("429 Too Many Requests") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Gemini API Quota Exceeded (429 Rate Limit).";
      }
      result = { ...FAILSAFE_MOCK, isMock: true, apiError: errorMsg };
    }
  }

  // Save to database
  try {
    const stmt = db.prepare(
      "INSERT INTO scans (project_name, architecture_type, debt_grade, full_json) VALUES (?, ?, ?, ?)"
    );
    const info = stmt.run(
      name,
      result.detectedArchitecture,
      result.technicalDebtGrade,
      JSON.stringify(result)
    );

    console.log(
      `[SENTINEL] Analysis complete: ${result.detectedArchitecture} | Grade: ${result.technicalDebtGrade} | ${result.districts.length} districts | ${result.complianceViolations?.length || 0} violations | Saved as scan #${info.lastInsertRowid}`
    );

    return res.json({ ...result, scanId: info.lastInsertRowid });
  } catch (dbErr) {
    console.error("[SENTINEL] Database save error:", dbErr.message);
    // Still return the result even if DB save fails
    return res.json({ ...result, scanId: null });
  }
});

// ─── Context-Aware Agent Chat (RAG) ─────────────────────────────────────────
app.post("/api/agent/chat", async (req, res) => {
  const { scanId, nodeId, userMessage, activeNodeData } = req.body;

  if (!userMessage || typeof userMessage !== "string" || userMessage.trim().length === 0) {
    return res.status(400).json({ error: "Missing or empty userMessage" });
  }

  if (!activeNodeData) {
    return res.status(400).json({ error: "Missing activeNodeData — select a node first" });
  }

  // Save user message to database
  if (scanId) {
    try {
      db.prepare(
        "INSERT INTO chat_messages (scan_id, node_id, role, content) VALUES (?, ?, 'user', ?)"
      ).run(scanId, nodeId || "unknown", userMessage);
    } catch (e) {
      console.error("[SENTINEL] Failed to save user message:", e.message);
    }
  }

  // Build context-restricted prompt
  const nodeContext = `
MODULE CONTEXT (You MUST restrict your answer to this module ONLY):
- Name: ${activeNodeData.name}
- Layer: ${activeNodeData.layer}
- Status: ${activeNodeData.status}
- Dependencies: ${activeNodeData.connectsTo?.join(", ") || "None"}
- Description: ${activeNodeData.descriptions?.senior || activeNodeData.descriptions?.junior || "N/A"}
${activeNodeData.violations ? `- Related Violations: ${activeNodeData.violations.map((v) => v.issue).join("; ")}` : ""}
  `.trim();

  // If no API key, return a mock response
  if (!process.env.GEMINI_API_KEY) {
    const mockReply = `## 🤖 Agent Response (Mock Mode)

Since no Gemini API key is configured, here's a mock analysis for **${activeNodeData.name}** (${activeNodeData.layer} layer):

**Status:** ${activeNodeData.status}

### Recommendations:
- Consider implementing the **Repository Pattern** to decouple data access from business logic
- Add unit tests with at least 70% coverage for this module
- Extract shared interfaces to reduce coupling with dependent modules

### Quick Fix:
\`\`\`javascript
// Example: Dependency Injection pattern
class ${activeNodeData.name.replace(/\s+/g, "")}Service {
  constructor(repository) {
    this.repository = repository; // Injected dependency
  }

  async execute(params) {
    return this.repository.find(params);
  }
}
\`\`\`

> 💡 *Connect your Gemini API key to get real, context-aware analysis.*`;

    if (scanId) {
      try {
        db.prepare(
          "INSERT INTO chat_messages (scan_id, node_id, role, content) VALUES (?, ?, 'agent', ?)"
        ).run(scanId, nodeId || "unknown", mockReply);
      } catch (e) {
        console.error("[SENTINEL] Failed to save agent message:", e.message);
      }
    }

    return res.json({ reply: mockReply });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Fetch recent chat history for context continuity
    let chatHistory = [];
    if (scanId && nodeId) {
      try {
        chatHistory = db
          .prepare(
            "SELECT role, content FROM chat_messages WHERE scan_id = ? AND node_id = ? ORDER BY created_at DESC LIMIT 10"
          )
          .all(scanId, nodeId)
          .reverse();
      } catch (e) {
        // No history available
      }
    }

    // Build conversation with history
    const conversationParts = [];
    conversationParts.push({
      text: `${CHAT_SYSTEM_PROMPT}\n\n${nodeContext}\n\n---\nUser question: ${userMessage}`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: conversationParts,
        },
      ],
      config: {
        temperature: 0.6,
        maxOutputTokens: 2048,
      },
    });

    const reply = response.text || "I apologize, but I couldn't generate a response. Please try again.";

    // Save agent response to database
    if (scanId) {
      try {
        db.prepare(
          "INSERT INTO chat_messages (scan_id, node_id, role, content) VALUES (?, ?, 'agent', ?)"
        ).run(scanId, nodeId || "unknown", reply);
      } catch (e) {
        console.error("[SENTINEL] Failed to save agent message:", e.message);
      }
    }

    return res.json({ reply });
  } catch (err) {
    console.error("[SENTINEL] Agent chat error:", err.message || err);
    let errorMsg = err.message || "Unknown error";
    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        errorMsg = "Gemini API Quota Exceeded. Please try again later.";
    }
    const errorReply = `⚠️ I encountered an error processing your request: ${errorMsg}`;
    return res.json({ reply: errorReply });
  }
});

// ─── Scan History ────────────────────────────────────────────────────────────
app.get("/api/history", (_req, res) => {
  try {
    const scans = db
      .prepare(
        `SELECT id, project_name, architecture_type, debt_grade, created_at,
         json_array_length(json_extract(full_json, '$.districts')) as district_count,
         json_array_length(json_extract(full_json, '$.complianceViolations')) as violation_count
         FROM scans ORDER BY created_at DESC LIMIT 50`
      )
      .all();

    return res.json(scans);
  } catch (err) {
    console.error("[SENTINEL] History fetch error:", err.message);
    return res.json([]);
  }
});

// ─── Single Scan Details ─────────────────────────────────────────────────────
app.get("/api/history/:id", (req, res) => {
  const { id } = req.params;

  try {
    const scan = db.prepare("SELECT * FROM scans WHERE id = ?").get(id);
    if (!scan) {
      return res.status(404).json({ error: "Scan not found" });
    }

    const chatMessages = db
      .prepare(
        "SELECT id, node_id, role, content, created_at FROM chat_messages WHERE scan_id = ? ORDER BY created_at ASC"
      )
      .all(id);

    return res.json({
      ...scan,
      full_json: JSON.parse(scan.full_json),
      chatMessages,
    });
  } catch (err) {
    console.error("[SENTINEL] Scan detail error:", err.message);
    return res.status(500).json({ error: "Failed to load scan" });
  }
});

// ─── Delete Scan ─────────────────────────────────────────────────────────────
app.delete("/api/history/:id", (req, res) => {
  const { id } = req.params;
  try {
    db.prepare("DELETE FROM scans WHERE id = ?").run(id);
    return res.json({ success: true });
  } catch (err) {
    console.error("[SENTINEL] Delete scan error:", err.message);
    return res.status(500).json({ error: "Failed to delete scan" });
  }
});

// ─── GitHub Repo Tree Fetcher ────────────────────────────────────────────────
app.post("/api/github/fetch-tree", async (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "Missing or invalid repoUrl" });
  }

  // Parse owner/repo from various GitHub URL formats
  const match = repoUrl.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([^\/\s]+)\/([^\/\s#?]+)/
  );
  if (!match) {
    return res.status(400).json({
      error: "Invalid GitHub URL. Expected format: https://github.com/owner/repo",
    });
  }

  const owner = match[1];
  const repo = match[2].replace(/\.git$/, "");

  console.log(`[SENTINEL] Fetching GitHub tree for ${owner}/${repo}...`);

  try {
    // First, get the default branch
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoMap-Sentinel",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    }

    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return res.status(404).json({ error: "Repository not found. Make sure it's public or provide a GITHUB_TOKEN." });
      }
      if (repoResponse.status === 403) {
        return res.status(429).json({ error: "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to .env for higher limits." });
      }
      throw new Error(`GitHub API returned ${repoResponse.status}`);
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch || "main";

    // Fetch the tree recursively
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch tree: ${treeResponse.status}`);
    }

    const treeData = await treeResponse.json();

    if (!treeData.tree || treeData.tree.length === 0) {
      return res.status(400).json({ error: "Repository appears to be empty" });
    }

    // Convert flat list to tree-formatted string
    const fileTree = buildTreeString(treeData.tree, repo);

    console.log(
      `[SENTINEL] GitHub tree fetched: ${treeData.tree.length} items from ${owner}/${repo}`
    );

    return res.json({
      fileTree,
      repoName: `${owner}/${repo}`,
      branch: defaultBranch,
      fileCount: treeData.tree.filter((t) => t.type === "blob").length,
    });
  } catch (err) {
    console.error("[SENTINEL] GitHub fetch error:", err.message || err);
    return res.status(500).json({
      error: `Failed to fetch repository: ${err.message}`,
    });
  }
});

/**
 * Converts a flat GitHub tree API response into a formatted tree string
 */
function buildTreeString(treeItems, rootName) {
  // Filter out items we don't need and limit size
  const filtered = treeItems
    .filter((item) => {
      const path = item.path.toLowerCase();
      // Skip common noise directories
      return (
        !path.startsWith("node_modules/") &&
        !path.startsWith(".git/") &&
        !path.startsWith("vendor/") &&
        !path.startsWith("__pycache__/") &&
        !path.startsWith(".next/") &&
        !path.startsWith("dist/") &&
        !path.startsWith("build/") &&
        !path.includes("/node_modules/")
      );
    })
    .slice(0, 500); // Limit to 500 items to avoid overwhelming the AI

  // Build hierarchical structure
  const root = { name: rootName, children: {}, type: "tree" };

  filtered.forEach((item) => {
    const parts = item.path.split("/");
    let current = root;

    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          children: {},
          type: index === parts.length - 1 ? item.type : "tree",
        };
      }
      current = current.children[part];
    });
  });

  // Render tree string
  const lines = [`${rootName}/`];
  renderTree(root, "", lines);
  return lines.join("\n");
}

function renderTree(node, prefix, lines) {
  const entries = Object.values(node.children);
  entries.forEach((child, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = isLast ? "    " : "│   ";

    if (child.type === "tree") {
      lines.push(`${prefix}${connector}${child.name}/`);
    } else {
      lines.push(`${prefix}${connector}${child.name}`);
    }

    if (Object.keys(child.children).length > 0) {
      renderTree(child, prefix + childPrefix, lines);
    }
  });
}

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║   REPOMAP SENTINEL v2.0 — ACTIVE AGENT      ║`);
  console.log(`  ║   Port: ${PORT}                                 ║`);
  console.log(`  ║   Gemini: ${process.env.GEMINI_API_KEY ? "CONFIGURED ✓" : "NOT SET (mock mode) ✗"}       ║`);
  console.log(`  ║   SQLite: READY ✓                            ║`);
  console.log(`  ║   GitHub: ${process.env.GITHUB_TOKEN ? "TOKEN SET ✓" : "PUBLIC ONLY ✗"}            ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
