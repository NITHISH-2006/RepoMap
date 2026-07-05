import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to load-balance across multiple comma-separated GEMINI API keys
function getAllApiKeys() {
  return (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
}

function getRandomApiKey() {
  const keys = getAllApiKeys();
  if (keys.length === 0) return "";
  return keys[Math.floor(Math.random() * keys.length)];
}

// Model fallback chain — each model has its own independent quota bucket on the free tier.
// Verified against the live API model list. Ordered by speed/cost-efficiency.
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
];

// Helper to call Gemini with model fallback + key rotation + exponential backoff
async function callGeminiWithRetry(generateContentParams, maxRetries = 2) {
  const keys = getAllApiKeys();
  if (keys.length === 0) throw new Error("No API keys configured");

  const errors = [];

  for (const model of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Cycle through keys deterministically so we try every key before giving up
      const key = keys[(attempt) % keys.length];
      const keyHint = key.slice(-4);

      try {
        console.log(`[SENTINEL] Model: ${model} | Key: ...${keyHint} | Attempt ${attempt + 1}/${maxRetries}`);
        const ai = new GoogleGenAI({ apiKey: key });

        const params = { ...generateContentParams, model };
        const response = await ai.models.generateContent(params);
        console.log(`[SENTINEL] ✓ Success with model: ${model}`);
        return response;
      } catch (err) {
        const msg = err.message || String(err);
        const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
        errors.push(`${model}/${keyHint}: ${msg.slice(0, 80)}`);

        if (isQuota) {
          console.warn(`[SENTINEL] ✗ Quota hit on ${model}/...${keyHint}. ${attempt < maxRetries - 1 ? "Retrying with next key..." : "Falling back to next model..."}`);
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          }
          // If all retries exhausted for this model, break to next model
          continue;
        } else {
          // Non-quota error — throw immediately (bad request, auth, etc.)
          throw err;
        }
      }
    }
  }

  // All models and keys exhausted
  throw new Error(`All Gemini models quota-exhausted. Tried: ${errors.join(" | ")}`);
}

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

const SYSTEM_PROMPT = `You are RepoMap Sentinel, a software architecture analysis engine.
Given a project's file/directory tree, analyze and return structured JSON:

1. DETECT the architecture pattern (Clean Architecture, MVC, Hexagonal, Monolith, Microservices, Feature-Sliced, etc.).
2. GRADE technical debt A (excellent) to F (critical).
3. IDENTIFY 3-5 compliance violations with affected district IDs.
4. MAP the codebase into 4-8 logical "districts" (modules/boundaries) based on the ACTUAL folder structure. Each district should correspond to a real directory or group of related directories in the tree.
   - District IDs must use the format "dist-<name>" (e.g., "dist-api", "dist-models", "dist-auth").
   - The "name" field should be human-readable (e.g., "API Routes", "Data Models", "Auth Module").
   - "connectsTo" must ONLY reference other district IDs that actually exist in your output.
   - Set status: COMPLIANT, WARNING, or CRITICAL. Include at least one WARNING and one CRITICAL.
   - Provide genuinely different descriptions for each audience level.
5. DEFINE connections (connectsTo) showing real dependency flow between districts — which modules import from or depend on which.
6. GENERATE 2-3 execution traces showing realistic request flows through the districts.

CRITICAL RULES:
- Every ID in "connectsTo" MUST match an "id" in your districts array. No dangling references.
- Base districts on the ACTUAL folders/files in the tree, not generic templates.
- Connections should reflect real import/dependency patterns visible from the file structure.`;

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
      const response = await callGeminiWithRetry({
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

    const response = await callGeminiWithRetry({
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
    if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("quota-exhausted")) {
        errorMsg = "The AI service is temporarily at capacity. Please wait 30-60 seconds and try again. The system will automatically rotate to a different model on retry.";
    } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
        errorMsg = "A model configuration issue occurred. The system is auto-correcting. Please retry.";
    }
    const errorReply = `⚠️ ${errorMsg}`;
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
  
  try {
    // 1. Extract owner and repo from URL
    const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) return res.status(400).json({ error: "Invalid GitHub URL" });
    const owner = match[1];
    const repo = match[2].replace('.git', '');

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `token ${process.env.GITHUB_TOKEN}` } : {};

    // 2. Get default branch
    const repoInfo = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    const defaultBranch = repoInfo.data.default_branch;

    // 3. Fetch recursive tree
    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`;
    const treeData = await axios.get(treeUrl, { headers });

    // 4. AGGRESSIVE FILTERING (Crucial for AI Context Limits)
    const excludePatterns = [
      'node_modules', '.git', 'dist', 'build', 'out', 'coverage', 
      'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store'
    ];
    const excludeExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.mp4', '.pdf'];

    const filteredTree = treeData.data.tree
      .filter(item => item.type === 'blob') // Only files, not folders
      .map(item => item.path)
      .filter(path => {
        const hasExcludedDir = excludePatterns.some(pattern => path.includes(pattern));
        const hasExcludedExt = excludeExtensions.some(ext => path.endsWith(ext));
        return !hasExcludedDir && !hasExcludedExt;
      })
      .slice(0, 400); // 🚨 CRITICAL: Limit to 400 files to prevent Gemini API quota/token exhaustion

    if (filteredTree.length === 0) {
      return res.status(400).json({ error: "No parseable code files found in repository." });
    }

    // 5. Send this filtered tree to your existing Gemini /api/audit logic
    res.json({ 
      success: true, 
      repoName: `${owner}/${repo}`,
      fileTree: filteredTree.join('\n') 
    });

  } catch (error) {
    console.error("GitHub Fetch Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch repository. Check URL or GitHub API limits." });
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  const keyCount = getAllApiKeys().length;
  console.log(`\n  ╔══════════════════════════════════════════════════════╗`);
  console.log(`  ║   REPOMAP SENTINEL v2.1 — ACTIVE AGENT              ║`);
  console.log(`  ║   Port: ${PORT}                                         ║`);
  console.log(`  ║   Gemini Keys: ${keyCount > 0 ? `${keyCount} key(s) loaded ✓` : "NOT SET (mock mode) ✗"}                  ║`);
  console.log(`  ║   Models: ${MODEL_FALLBACK_CHAIN.join(" → ")}   ║`);
  console.log(`  ║   SQLite: READY ✓                                    ║`);
  console.log(`  ║   GitHub: ${process.env.GITHUB_TOKEN ? "TOKEN SET ✓" : "PUBLIC ONLY ✗"}                            ║`);
  console.log(`  ╚══════════════════════════════════════════════════════╝\n`);
});
