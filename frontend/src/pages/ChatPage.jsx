import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../api";
import Card from "../components/Card";

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/ai/chat", { messages: next });
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Study buddy</h1>
        <p className="mt-1 text-muted">Ask anything about your lectures, assignments or code.</p>
      </div>
      <Card>
        <div className="max-h-[55vh] min-h-48 space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.length === 0 && <p className="text-sm text-muted">Try: "Explain TCP vs UDP like I'm new to networking."</p>}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl border-2 border-edge px-4 py-2 ${
                m.role === "user" ? "bg-brand text-white" : "bg-sun text-on-sun"}`}>{m.content}</p>
            </div>
          ))}
          {busy && <p className="text-sm text-muted">Thinking...</p>}
          <div ref={endRef} />
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-overdue">{error}</p>}
        <form onSubmit={send} className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} maxLength={4000} placeholder="Ask your study buddy..."
            aria-label="Message" className="min-w-0 flex-1 border border-line bg-surface px-3 py-2" />
          <button type="submit" disabled={!input.trim() || busy}
            className="btn rounded-xl bg-brand px-5 py-2 font-display font-semibold text-white disabled:opacity-50">Send</button>
        </form>
      </Card>
    </div>
  );
}