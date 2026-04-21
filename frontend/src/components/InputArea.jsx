/**
 * InputArea.jsx
 * Chat input with auto-expanding textarea and send button.
 */

import { useRef } from "react";


export default function InputArea({ input, onChange, onSend, disabled, domain }) {
  const taRef = useRef(null);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleChange = (e) => {
    onChange(e.target.value);
    // Auto-expand textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="input-area">
      <div className="input-row">
        <div className="input-wrap">
          <textarea
            ref={taRef}
            className="chat-input"
            placeholder={`Ask a ${domain} question… (Enter to send, Shift+Enter for new line)`}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKey}
            rows={1}
            disabled={disabled}
          />
        </div>
        <button
          className="send-btn"
          onClick={() => onSend()}
          disabled={disabled || !input.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
      <p className="input-hint">Domain: {domain} · Powered by Gemini 2.5 Flash</p>
    </div>
  );
}
