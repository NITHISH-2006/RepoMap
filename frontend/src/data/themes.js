export const THEMES = [
  {
    id: "cyberpunk",
    name: "Cyberpunk Neon",
    bg: "#08090b",
    gridColor: "#1f2229",
    accent: "#00BFFF",
    compliant: "#00FF66",
    warning: "#FF8C00",
    critical: "#FF3B3B",
    layers: {
      presentation: "#00BFFF",
      application: "#7C3AED",
      domain: "#F59E0B",
      infrastructure: "#EF4444",
      config: "#6B7280",
      testing: "#10B981",
      shared: "#8B5CF6",
    },
  },
  {
    id: "matrix",
    name: "Emerald Matrix",
    bg: "#050805",
    gridColor: "#0f2010",
    accent: "#00FF33",
    compliant: "#10B981",
    warning: "#A3E635",
    critical: "#EF4444",
    layers: {
      presentation: "#34D399",
      application: "#059669",
      domain: "#10B981",
      infrastructure: "#047857",
      config: "#4B5563",
      testing: "#A7F3D0",
      shared: "#111827",
    },
  },
  {
    id: "space-blue",
    name: "Deep Space Blue",
    bg: "#05070f",
    gridColor: "#11182d",
    accent: "#3B82F6",
    compliant: "#06B6D4",
    warning: "#8B5CF6",
    critical: "#F43F5E",
    layers: {
      presentation: "#60A5FA",
      application: "#3B82F6",
      domain: "#2563EB",
      infrastructure: "#1D4ED8",
      config: "#374151",
      testing: "#93C5FD",
      shared: "#1E3A8A",
    },
  },
  {
    id: "amber-tactical",
    name: "Amber Tactical",
    bg: "#0c0a09",
    gridColor: "#292524",
    accent: "#F59E0B",
    compliant: "#FBBF24",
    warning: "#EA580C",
    critical: "#DC2626",
    layers: {
      presentation: "#FDE047",
      application: "#F59E0B",
      domain: "#D97706",
      infrastructure: "#B45309",
      config: "#57534E",
      testing: "#FEF08A",
      shared: "#78350F",
    },
  },
  {
    id: "obsidian-gold",
    name: "Obsidian Gold",
    bg: "#090807",
    gridColor: "#221e1a",
    accent: "#D4AF37",
    compliant: "#E5C158",
    warning: "#C59B27",
    critical: "#B22222",
    layers: {
      presentation: "#F3E5AB",
      application: "#D4AF37",
      domain: "#AA7C11",
      infrastructure: "#8C6239",
      config: "#4A3B32",
      testing: "#FFFDD0",
      shared: "#5C4033",
    },
  },
];

export function getRepoTheme(repoName = "") {
  if (!repoName) return THEMES[0];
  let hash = 0;
  for (let i = 0; i < repoName.length; i++) {
    hash = repoName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEMES.length;
  return THEMES[index];
}
