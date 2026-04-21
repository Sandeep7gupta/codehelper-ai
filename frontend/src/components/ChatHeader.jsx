/**
 * ChatHeader.jsx
 * Top bar showing active domain, style, and model info.
 */

import { DOMAINS, STYLES, GEMINI_MODEL } from "../constants";


export default function ChatHeader({ domain, style }) {
  const domainLabel = DOMAINS.find((d) => d.id === domain)?.label ?? domain;
  const styleLabel  = STYLES.find((s) => s.id === style)?.label   ?? style;

  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="status-dot" aria-label="Online" />
        <div>
          <div className="chat-title">CodeHelper AI</div>
          <div className="chat-subtitle">{domainLabel} · {styleLabel} mode</div>
        </div>
      </div>
      <div className="model-badge">{GEMINI_MODEL}</div>
    </div>
  );
}
