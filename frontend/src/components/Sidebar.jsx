/**
 * Sidebar.jsx
 * Left panel with domain selection, style picker, parameter sliders, and FAQ chips.
 */

import faqs from "../../../data/faqs.json";
import { DOMAINS, STYLES } from "../constants";


export default function Sidebar({
  domain, onDomainChange,
  style, onStyleChange,
  temperature, onTemperatureChange,
  topP, onTopPChange,
  onFAQClick,
  onClear,
}) {
  const tempHint =
    temperature <= 0.3 ? "Low: precise, deterministic" :
    temperature <= 0.6 ? "Mid: balanced accuracy & variety" :
                         "High: creative, varied output";

  const topPHint =
    topP <= 0.5 ? "Low: conservative token sampling" :
    topP <= 0.8 ? "Mid: moderate vocabulary diversity" :
                  "High: broad sampling across tokens";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">C</div>
          <div>
            <div className="logo-name">CodeHelper AI</div>
            <div className="logo-sub">Gemini 2.5 Flash</div>
          </div>
        </div>
      </div>

      <div className="sidebar-body">
        {/* Domain selection */}
        <div className="section-label">Domain Focus</div>
        <div className="domain-grid">
          {DOMAINS.map((d) => (
            <button
              key={d.id}
              className={`domain-pill ${domain === d.id ? "active" : ""}`}
              onClick={() => onDomainChange(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Response style */}
        <div className="section-label">Response Style</div>
        <div className="style-grid">
          {STYLES.map((s) => (
            <button
              key={s.id}
              className={`style-btn ${style === s.id ? "active" : ""}`}
              onClick={() => onStyleChange(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Temperature slider */}
        <div className="section-label">Model Parameters</div>
        <div className="slider-row">
          <div className="slider-meta">
            <span>Temperature</span>
            <span className="slider-val">{parseFloat(temperature).toFixed(1)}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.1"
            value={temperature}
            onChange={(e) => onTemperatureChange(e.target.value)}
          />
          <p className="param-hint">{tempHint}</p>
        </div>

        {/* Top-p slider */}
        <div className="slider-row">
          <div className="slider-meta">
            <span>Top-p (nucleus)</span>
            <span className="slider-val">{parseFloat(topP).toFixed(1)}</span>
          </div>
          <input
            type="range" min="0.1" max="1" step="0.1"
            value={topP}
            onChange={(e) => onTopPChange(e.target.value)}
          />
          <p className="param-hint">{topPHint}</p>
        </div>

        {/* FAQ chips (RAG-lite quick access) */}
        <div className="section-label">Quick FAQs</div>
        {faqs.faqs.slice(0, 5).map((f) => (
          <button key={f.id} className="faq-chip" onClick={() => onFAQClick(f.question)}>
            <span className="faq-dot" />
            <span>{f.question.length > 34 ? f.question.slice(0, 34) + "…" : f.question}</span>
          </button>
        ))}
      </div>

      {/* Clear button */}
      <div className="sidebar-footer">
        <button className="clear-btn" onClick={onClear}>
          Clear conversation
        </button>
      </div>
    </aside>
  );
}
