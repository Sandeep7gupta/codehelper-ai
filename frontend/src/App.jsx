/**
 * CodeHelper AI - Main App Component
 * Domain-specific AI chatbot powered by Gemini 2.5 Flash
 * Features: context memory, parameter tuning, FAQ grounding, multi-domain
 */

import { useState, useRef, useEffect, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import ChatHeader from "./components/ChatHeader";
import MessageList from "./components/MessageList";
import InputArea from "./components/InputArea";
import { buildSystemPrompt } from "./utils/promptEngine";
import { callGemini } from "./utils/geminiClient";
import { DOMAINS, STYLES, WELCOME_CHIPS } from "./constants";

function App() {
  // ── State ────────────────────────────────────────────────────────────────
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [domain, setDomain]         = useState("general");
  const [style, setStyle]           = useState("factual");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP]             = useState(0.9);
  const [history, setHistory]       = useState([]); // conversation history for Gemini

  const endRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (overrideText) => {
      const text = (overrideText || input).trim();
      if (!text || loading) return;

      setInput("");

      // Add user message to UI
      const userMsg = { id: Date.now(), role: "user", text, time: new Date() };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Build updated history for API call
      const newHistory = [
        ...history,
        { role: "user", parts: [{ text }] },
      ];

      try {
        const systemPrompt = buildSystemPrompt(domain, style);
        const reply = await callGemini({
          systemPrompt,
          history: newHistory,
          temperature,
          topP,
        });

        // Save full history (user + model)
        const updatedHistory = [
          ...newHistory,
          { role: "model", parts: [{ text: reply }] },
        ];
        setHistory(updatedHistory);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "bot",
            text: reply,
            time: new Date(),
            params: { temperature, topP },
          },
        ]);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: "error",
            text: `Error: ${err.message}`,
            time: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, domain, style, temperature, topP, history]
  );

  // ── Clear conversation ────────────────────────────────────────────────────
  const handleClear = () => {
    setMessages([]);
    setHistory([]);
  };

  return (
    <div className="app">
      <Sidebar
        domain={domain}        onDomainChange={setDomain}
        style={style}          onStyleChange={setStyle}
        temperature={temperature} onTemperatureChange={setTemperature}
        topP={topP}            onTopPChange={setTopP}
        onFAQClick={(q) => handleSend(q)}
        onClear={handleClear}
      />

      <main className="main">
        <ChatHeader domain={domain} style={style} />

        <MessageList
          messages={messages}
          loading={loading}
          welcomeChips={WELCOME_CHIPS}
          onChipClick={(text) => handleSend(text)}
          endRef={endRef}
        />

        <InputArea
          input={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={loading}
          domain={DOMAINS.find((d) => d.id === domain)?.label}
        />
      </main>
    </div>
  );
}

export default App;
