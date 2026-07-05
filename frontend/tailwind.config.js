/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0E0F11",
        panel: "#141517",
        border: "#27272A",
        accent: "#00FF00",
        "accent-dim": "#00CC00",
        "accent-glow": "rgba(0, 255, 0, 0.15)",
        "severity-critical": "#FF3B3B",
        "severity-high": "#FF8C00",
        "severity-medium": "#FFD600",
        "severity-low": "#00BFFF",
        "grade-a": "#00FF00",
        "grade-b": "#7CFF00",
        "grade-c": "#FFD600",
        "grade-d": "#FF8C00",
        "grade-f": "#FF3B3B",
        "status-compliant": "#00FF00",
        "status-warning": "#FF8C00",
        "status-critical": "#FF3B3B",
        "chat-user": "#1A1D21",
        "chat-agent": "#0D1117",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "violation-pulse": "violation-pulse 1.5s ease-in-out infinite",
        "terminal-blink": "terminal-blink 1s step-end infinite",
        "trace-glow": "trace-glow 1s ease-in-out infinite",
        "trace-particle": "trace-particle 2s linear infinite",
        "warning-pulse": "warning-pulse 2s ease-in-out infinite",
        "chat-appear": "chat-appear 0.3s ease-out",
        "typing-dot": "typing-dot 1.4s infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 255, 0, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 255, 0, 0.6), 0 0 40px rgba(0, 255, 0, 0.2)" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "violation-pulse": {
          "0%, 100%": { borderColor: "rgba(255, 59, 59, 0.3)" },
          "50%": { borderColor: "rgba(255, 59, 59, 1)" },
        },
        "terminal-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "trace-glow": {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(0, 191, 255, 0.4)",
            borderColor: "rgba(0, 191, 255, 0.6)",
          },
          "50%": {
            boxShadow: "0 0 25px rgba(0, 191, 255, 0.9), 0 0 50px rgba(0, 191, 255, 0.4)",
            borderColor: "rgba(0, 191, 255, 1)",
          },
        },
        "trace-particle": {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        "warning-pulse": {
          "0%, 100%": { borderColor: "rgba(255, 140, 0, 0.3)" },
          "50%": { borderColor: "rgba(255, 140, 0, 0.8)" },
        },
        "chat-appear": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "typing-dot": {
          "0%, 20%": { opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
