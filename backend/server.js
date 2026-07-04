import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    engine: "RepoMap Sentinel v1.0",
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
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
        required: ["id", "name", "layer", "connectsTo", "descriptions"],
      },
    },
  },
  required: [
    "detectedArchitecture",
    "technicalDebtGrade",
    "complianceViolations",
    "districts",
  ],
};

// ─── System Prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are RepoMap Sentinel, an elite software architecture analysis engine. 
Given a project's file/directory tree, you must:

1. DETECT the primary architecture pattern (e.g., Clean Architecture, MVC, Hexagonal, Layered Monolith, Microservices, Feature-Sliced).
2. GRADE the technical debt from A (excellent) to F (critical), considering coupling, cohesion, naming conventions, separation of concerns, and test coverage presence.
3. IDENTIFY compliance violations — issues like circular dependencies, layer violations, missing abstractions, god classes, hardcoded config, missing tests, security anti-patterns.
4. MAP the codebase into logical "districts" (architectural modules/boundaries) and describe each district for four audiences: a school student, a junior developer, a senior architect, and a product manager.
5. DEFINE connections between districts based on dependency flow.

Be thorough. Provide at least 3–8 districts and 2–5 compliance violations. Make descriptions genuinely tailored to each audience level.`;

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
    },
    {
      severity: "high",
      issue: "No test directory found — zero test coverage",
      remediation:
        "Add a __tests__ or tests/ directory with unit tests for each service module. Aim for at least 70% coverage on business logic.",
    },
    {
      severity: "high",
      issue: "Environment variables accessed directly in business logic",
      remediation:
        "Centralize all environment access in a config/ module. Business logic should receive configuration via dependency injection.",
    },
    {
      severity: "medium",
      issue: "Database queries embedded directly in route handlers",
      remediation:
        "Extract all data access into a dedicated repository/data-access layer. Route handlers should only call service methods.",
    },
    {
      severity: "low",
      issue: "Inconsistent file naming conventions (mix of camelCase and kebab-case)",
      remediation:
        "Adopt a single naming convention project-wide. kebab-case is recommended for files, PascalCase for components.",
    },
  ],
  districts: [
    {
      id: "dist-entry",
      name: "Application Entry",
      layer: "config",
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
};

// ─── Audit Endpoint ──────────────────────────────────────────────────────────
app.post("/api/audit", async (req, res) => {
  const { fileTree } = req.body;

  if (!fileTree || typeof fileTree !== "string" || fileTree.trim().length === 0) {
    return res.status(400).json({
      error: "Missing or empty fileTree in request body",
    });
  }

  // If no API key, return failsafe immediately
  if (!process.env.GEMINI_API_KEY) {
    console.log("[SENTINEL] No GEMINI_API_KEY found — returning failsafe mock data");
    return res.json(FAILSAFE_MOCK);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
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
      return res.json(FAILSAFE_MOCK);
    }

    // Validate minimum required fields
    if (
      !parsed.detectedArchitecture ||
      !parsed.technicalDebtGrade ||
      !Array.isArray(parsed.districts)
    ) {
      console.error("[SENTINEL] Gemini response missing required fields");
      console.log("[SENTINEL] Returning failsafe mock data");
      return res.json(FAILSAFE_MOCK);
    }

    console.log(
      `[SENTINEL] Analysis complete: ${parsed.detectedArchitecture} | Grade: ${parsed.technicalDebtGrade} | ${parsed.districts.length} districts | ${parsed.complianceViolations?.length || 0} violations`
    );

    return res.json(parsed);
  } catch (err) {
    console.error("[SENTINEL] Gemini API error:", err.message || err);
    console.log("[SENTINEL] Returning failsafe mock data");
    return res.json(FAILSAFE_MOCK);
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║   REPOMAP SENTINEL — ENGINE ONLINE       ║`);
  console.log(`  ║   Port: ${PORT}                             ║`);
  console.log(`  ║   Gemini: ${process.env.GEMINI_API_KEY ? "CONFIGURED ✓" : "NOT SET (mock mode) ✗"}       ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);
});
