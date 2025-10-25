"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentState, ChatMessage } from "@/app/types";
import { agentReply, createInitialState } from "@/app/agent/agent";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  createdAt: Date.now(),
  content:
    "Hi! I’m Sasha’s booking assistant. I can help you choose a service, check availability, and confirm your appointment. Say 'book' to begin.",
};

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [WELCOME];
    try {
      const raw = localStorage.getItem("sasha_chat_history");
      const arr = raw ? (JSON.parse(raw) as ChatMessage[]) : [];
      return arr.length ? arr : [WELCOME];
    } catch {
      return [WELCOME];
    }
  });
  const [input, setInput] = useState("");
  const [state, setState] = useState<AgentState>(() => {
    if (typeof window === "undefined") return createInitialState();
    try {
      const raw = localStorage.getItem("sasha_agent_state");
      return raw ? (JSON.parse(raw) as AgentState) : createInitialState();
    } catch {
      return createInitialState();
    }
  });
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sasha_chat_history", JSON.stringify(messages));
      localStorage.setItem("sasha_agent_state", JSON.stringify(state));
    }
  }, [messages, state]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const quickActions = useMemo(
    () => [
      { label: "Book now", value: "book" },
      { label: "See services", value: "services" },
      { label: "See prices", value: "prices" },
    ],
    []
  );

  function appendUserAndReply(text: string) {
    const userMsg: ChatMessage = {
      id: generateId("u"),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setTyping(true);
    // Simulate latency
    setTimeout(() => {
      const { messages: agentMsgs, newState } = agentReply(text, state);
      setMessages((m) => [...m, ...agentMsgs]);
      setState(newState);
      setTyping(false);
    }, 300);
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Sasha K Makeup</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Booking Assistant</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Tue–Sun 10:00–18:00</p>
        </div>
      </div>

      <div ref={listRef} className="h-[60vh] overflow-y-auto p-4 sm:p-6">
        {messages.map((m) => (
          <div key={m.id} className="mb-3 flex gap-3">
            <div className={m.role === "assistant" ? "order-1" : "order-2 ml-auto"}>
              <div
                className={
                  m.role === "assistant"
                    ? "max-w-[80ch] whitespace-pre-wrap rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                    : "max-w-[80ch] whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-3 text-white dark:bg-zinc-200 dark:text-zinc-900"
                }
              >
                {m.content}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="mb-3 flex gap-3">
            <div className="order-1">
              <div className="rounded-2xl bg-zinc-100 px-4 py-3 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
                typing…
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
        {quickActions.map((q) => (
          <button
            key={q.value}
            onClick={() => appendUserAndReply(q.value)}
            className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {q.label}
          </button>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          const t = input.trim();
          if (!t) return;
          setInput("");
          appendUserAndReply(t);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          className="rounded-xl bg-zinc-900 px-5 py-3 text-white hover:bg-black dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-white"
        >
          Send
        </button>
      </form>
    </div>
  );
}
