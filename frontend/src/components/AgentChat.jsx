import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, MessageSquare, Zap } from "lucide-react";

export default function AgentChat({
  selectedDistrict,
  chatMessages,
  onSendMessage,
  isChatLoading,
}) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Focus input when district changes
  useEffect(() => {
    if (selectedDistrict) {
      inputRef.current?.focus();
    }
  }, [selectedDistrict?.id]);

  const handleSend = () => {
    if (!input.trim() || isChatLoading) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── No node selected ──
  if (!selectedDistrict) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-canvas border border-border flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-zinc-600" />
          </div>
          <p className="text-sm text-zinc-400 font-medium mb-1">
            No Secure Channel Open
          </p>
          <p className="text-xs text-zinc-600 max-w-[200px] mx-auto">
            Click a district node on the canvas to open a context-aware agent channel.
          </p>
        </div>
      </div>
    );
  }

  // Quick prompt suggestions
  const quickPrompts = [
    "How do I fix the violations here?",
    "Generate refactored code",
    "Explain the architecture risks",
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* ── Active Node Context Banner ── */}
      <div className="px-4 py-2.5 border-b border-border bg-canvas/50">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              selectedDistrict.status === "CRITICAL"
                ? "bg-status-critical animate-pulse"
                : selectedDistrict.status === "WARNING"
                ? "bg-status-warning"
                : "bg-status-compliant"
            }`}
          />
          <span className="text-xs font-semibold text-white">
            {selectedDistrict.name}
          </span>
          <span
            className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
              selectedDistrict.status === "CRITICAL"
                ? "text-status-critical border-status-critical/30 bg-status-critical/10"
                : selectedDistrict.status === "WARNING"
                ? "text-status-warning border-status-warning/30 bg-status-warning/10"
                : "text-status-compliant border-status-compliant/30 bg-status-compliant/10"
            }`}
          >
            {selectedDistrict.status}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 font-mono mt-1">
          {selectedDistrict.layer} layer • Agent scoped to this module
        </p>
      </div>

      {/* ── Chat Messages ── */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-xs text-zinc-500 mb-4">
              Ask the Sentinel Agent about this module.
            </p>
            {/* Quick Prompts */}
            <div className="space-y-1.5">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-[11px] text-zinc-400
                             bg-canvas border border-border hover:border-accent/30 hover:text-accent
                             transition-all duration-200 flex items-center gap-2"
                >
                  <Zap className="w-3 h-3 flex-shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div
            key={i}
            className={`animate-chat-appear rounded-xl p-3 ${
              msg.role === "user" ? "chat-message-user" : "chat-message-agent"
            }`}
          >
            {/* Message Header */}
            <div className="flex items-center gap-1.5 mb-2">
              {msg.role === "user" ? (
                <User className="w-3 h-3 text-accent" />
              ) : (
                <Bot className="w-3 h-3 text-sky-400" />
              )}
              <span
                className={`text-[10px] font-mono font-semibold tracking-wider uppercase ${
                  msg.role === "user" ? "text-accent/70" : "text-sky-400/70"
                }`}
              >
                {msg.role === "user" ? "You" : "Sentinel Agent"}
              </span>
            </div>

            {/* Message Content */}
            <div className="text-xs text-zinc-300 leading-relaxed">
              {msg.role === "agent" ? (
                <MarkdownContent content={msg.content} />
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isChatLoading && (
          <div className="chat-message-agent rounded-xl p-3 animate-chat-appear">
            <div className="flex items-center gap-1.5 mb-2">
              <Bot className="w-3 h-3 text-sky-400" />
              <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-sky-400/70">
                Sentinel Agent
              </span>
            </div>
            <div className="typing-indicator flex items-center gap-1 py-1">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Chat Input ── */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${selectedDistrict.name}...`}
            disabled={isChatLoading}
            rows={1}
            className="flex-1 bg-canvas border border-border rounded-lg px-3 py-2.5
                       text-xs font-mono text-zinc-300 placeholder:text-zinc-600
                       focus:outline-none focus:border-sky-500/50 focus:shadow-[0_0_10px_rgba(0,191,255,0.1)]
                       resize-none transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatLoading}
            className="px-3 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400
                       hover:bg-sky-500/20 hover:border-sky-500/60
                       transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed
                       flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Simple Markdown Renderer ────────────────────────────────────────────────
function MarkdownContent({ content }) {
  if (!content) return null;

  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        // Code block
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");

          return (
            <pre key={i} className="bg-[#0a0c10] border border-border rounded-lg p-3 overflow-x-auto">
              {lang && (
                <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mb-2">
                  {lang}
                </div>
              )}
              <code className="text-[11px] font-mono text-zinc-300 leading-relaxed">
                {code}
              </code>
            </pre>
          );
        }

        // Regular text — process inline markdown
        return (
          <div key={i}>
            {part.split("\n").map((line, j) => {
              if (!line.trim()) return <br key={j} />;

              // Headers
              if (line.startsWith("### "))
                return (
                  <h4 key={j} className="text-xs font-bold text-white mt-3 mb-1">
                    {processInlineMarkdown(line.slice(4))}
                  </h4>
                );
              if (line.startsWith("## "))
                return (
                  <h3 key={j} className="text-sm font-bold text-white mt-3 mb-1">
                    {processInlineMarkdown(line.slice(3))}
                  </h3>
                );

              // Bullet points
              if (line.match(/^[-*] /))
                return (
                  <div key={j} className="flex gap-2 ml-1">
                    <span className="text-zinc-500 mt-0.5">•</span>
                    <span>{processInlineMarkdown(line.slice(2))}</span>
                  </div>
                );

              // Blockquotes
              if (line.startsWith("> "))
                return (
                  <div
                    key={j}
                    className="border-l-2 border-sky-500/40 pl-3 text-zinc-400 italic text-[11px]"
                  >
                    {processInlineMarkdown(line.slice(2))}
                  </div>
                );

              return <p key={j}>{processInlineMarkdown(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function processInlineMarkdown(text) {
  // Process bold, inline code, and emojis
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded text-[11px] font-mono text-sky-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
