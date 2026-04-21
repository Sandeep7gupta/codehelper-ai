/**
 * MessageList.jsx
 * Renders the chat messages area with user/bot bubbles, welcome screen, and typing indicator.
 */

import { DOMAINS } from "../constants";


/**
 * Convert bot markdown-ish text to JSX with code blocks.
 */
function formatBotText(text) {
  const lines = text.split("\n");
  const result = [];
  let inCode = false;
  let codeLines = [];

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        result.push(
          <pre key={i} className="code-block">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        inCode = false;
        codeLines = [];
      }
    } else if (inCode) {
      codeLines.push(line);
    } else {
      // Inline code: `backticks`
      const parts = line.split(/(`[^`]+`)/g);
      result.push(
        <p key={i} className="bot-line">
          {parts.map((part, j) =>
            part.startsWith("`") && part.endsWith("`")
              ? <code key={j} className="inline-code">{part.slice(1, -1)}</code>
              : part
          )}
        </p>
      );
    }
  });

  return result;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageList({ messages, loading, welcomeChips, onChipClick, endRef }) {
  return (
    <div className="messages">
      {messages.length === 0 && !loading ? (
        <div className="welcome">
          <div className="welcome-icon">C</div>
          <h2>Welcome to CodeHelper AI</h2>
          <p>
            Your domain-specific coding assistant powered by Gemini 2.5 Flash.
            Ask anything about programming, algorithms, debugging, or computer science.
          </p>
          <div className="welcome-chips">
            {welcomeChips.map((c, i) => (
              <button key={i} className="welcome-chip" onClick={() => onChipClick(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        messages.map((msg) =>
          msg.role === "error" ? (
            <div key={msg.id} className="bubble-row">
              <div className="avatar bot">C</div>
              <div>
                <div className="error-bubble">{msg.text}</div>
                <div className="meta-row">
                  <span className="meta-time">{formatTime(msg.time)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div key={msg.id} className={`bubble-row ${msg.role}`}>
              <div className={`avatar ${msg.role === "user" ? "user" : "bot"}`}>
                {msg.role === "user" ? "U" : "C"}
              </div>
              <div>
                <div className={`bubble ${msg.role === "user" ? "user" : "bot"}`}>
                  {msg.role === "user" ? msg.text : formatBotText(msg.text)}
                </div>
                <div className="meta-row">
                  <span className="meta-time">{formatTime(msg.time)}</span>
                  {msg.params && (
                    <span className="meta-params">
                      temp {parseFloat(msg.params.temperature).toFixed(1)} ·
                      top-p {parseFloat(msg.params.topP).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        )
      )}

      {/* Typing indicator */}
      {loading && (
        <div className="bubble-row">
          <div className="avatar bot">C</div>
          <div className="bubble bot typing-bubble">
            <div className="typing">
              <span /><span /><span />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
