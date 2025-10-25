"use client";

import { assistantConfig, formatPrice } from "@/app/agent/config";
import type { AgentState, BookingRecord, ChatMessage, ServiceOption } from "@/app/types";

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function toTwo(n: number): string {
  return n.toString().padStart(2, "0");
}

function parseTimeTo24h(input: string): string | null {
  const s = input.trim().toLowerCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (ap === "am") {
    if (hour === 12) hour = 0;
  } else if (ap === "pm") {
    if (hour !== 12) hour += 12;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${toTwo(hour)}:${toTwo(minute)}`;
}

function normalizeDate(input: string, tz: string): string | null {
  const now = new Date();
  const s = input.trim().toLowerCase();
  if (["today"].includes(s)) {
    const d = new Date(now);
    return `${d.getFullYear()}-${toTwo(d.getMonth() + 1)}-${toTwo(d.getDate())}`;
  }
  if (["tomorrow", "tmrw"].includes(s)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${toTwo(d.getMonth() + 1)}-${toTwo(d.getDate())}`;
  }
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // Try M/D or M/D/YYYY
  const md = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?$/);
  if (md) {
    const month = parseInt(md[1], 10);
    const day = parseInt(md[2], 10);
    const year = md[3] ? parseInt(md[3], 10) : now.getFullYear();
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${toTwo(month)}-${toTwo(day)}`;
    }
  }
  // Try "Nov 5"/"November 5"/with year
  const monthNames = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ];
  const mx = s.match(/^(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
  if (mx) {
    const mi = monthNames.findIndex((m) => m.startsWith(mx[1]));
    if (mi >= 0) {
      const day = parseInt(mx[2], 10);
      const year = mx[3] ? parseInt(mx[3], 10) : now.getFullYear();
      return `${year}-${toTwo(mi + 1)}-${toTwo(day)}`;
    }
  }
  return null;
}

function compareTime(a: string, b: string): number {
  return a.localeCompare(b);
}

function addMinutes(timeHHmm: string, minutes: number): string {
  const [h, m] = timeHHmm.split(":").map((x) => parseInt(x, 10));
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${toTwo(nh)}:${toTwo(nm)}`;
}

function getEndTime(start: string, durationMin: number): string {
  return addMinutes(start, durationMin);
}

function isWithinWorkingHours(dateISO: string, start: string, end: string): boolean {
  const { workingHours } = assistantConfig;
  const d = new Date(`${dateISO}T00:00:00`);
  const weekday = d.getDay();
  if (!workingHours.daysOpen.includes(weekday)) return false;
  if (compareTime(start, workingHours.open) < 0) return false;
  if (compareTime(end, workingHours.close) > 0) return false;
  return true;
}

function getStoredBookings(): BookingRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("sasha_bookings");
    return raw ? (JSON.parse(raw) as BookingRecord[]) : [];
  } catch {
    return [];
  }
}

function saveBooking(b: BookingRecord): void {
  const all = getStoredBookings();
  all.push(b);
  localStorage.setItem("sasha_bookings", JSON.stringify(all));
}

function hasConflict(dateISO: string, start: string, end: string): boolean {
  const all = getStoredBookings().filter((b) => b.status !== "cancelled" && b.dateISO === dateISO);
  for (const b of all) {
    if (!(end <= b.startTime || start >= b.endTime)) return true;
  }
  return false;
}

export function listServicesSummary(): string {
  return assistantConfig.services
    .map(
      (s) => `${s.name} — ${s.durationMinutes} min, ${formatPrice(s.priceCents)}`
    )
    .join("\n");
}

function findService(input: string): ServiceOption | undefined {
  const s = input.trim().toLowerCase();
  return assistantConfig.services.find(
    (svc) =>
      svc.id === s ||
      svc.name.toLowerCase() === s ||
      s.includes(svc.id) ||
      s.includes(svc.name.toLowerCase())
  );
}

export function createInitialState(): AgentState {
  return { step: "idle", pending: {}, lastPrompt: undefined };
}

function nextPromptFor(step: AgentState["step"], state: AgentState): string {
  switch (step) {
    case "ask_service":
      return `Which service would you like? Here are options:\n${listServicesSummary()}\nYou can reply with the service name.`;
    case "ask_date":
      return "Great! What date works for you? (e.g., 2025-11-05 or Nov 5)";
    case "ask_time":
      return "What start time would you prefer? (e.g., 2pm or 14:30)";
    case "ask_name":
      return "Got it. What is your full name?";
    case "ask_email":
      return "And your email for the confirmation?";
    case "ask_phone":
      return "Optional: a phone number to reach you? (or say skip)";
    case "confirm": {
      const p = state.pending;
      const svc = assistantConfig.services.find((x) => x.id === p.serviceId);
      const price = svc ? formatPrice(svc.priceCents) : "";
      return `Please confirm:\nService: ${p.serviceName}\nDate: ${p.dateISO}\nTime: ${p.startTime}–${p.endTime}\nName: ${p.name}\nEmail: ${p.email}\n${p.phone ? `Phone: ${p.phone}\n` : ""}Rate: ${price}\nReply 'yes' to confirm or 'no' to change.`;
    }
    default:
      return "How can I help with your makeup booking today?";
  }
}

export function agentReply(userText: string, state: AgentState): { messages: ChatMessage[]; newState: AgentState } {
  const messages: ChatMessage[] = [];
  const now = Date.now();
  const say = (content: string) =>
    messages.push({ id: generateId("m"), role: "assistant", content, createdAt: now });

  const text = userText.trim();
  const lower = text.toLowerCase();

  // Global intents
  if (lower.includes("price") || lower.includes("how much") || lower.includes("cost")) {
    say(`Here are current rates:\n${listServicesSummary()}`);
    return { messages, newState: { ...state, lastPrompt: nextPromptFor(state.step, state) } };
  }
  if (lower.includes("service") || lower.includes("what do you offer") || lower.includes("menu")) {
    say(`Available services:\n${listServicesSummary()}`);
    return { messages, newState: { ...state, lastPrompt: nextPromptFor(state.step, state) } };
  }
  if (lower === "help") {
    say(
      "I can help you choose a service, check availability, and secure a booking. Say 'book' to begin."
    );
    return { messages, newState: state };
  }

  // Start booking
  if (state.step === "idle" || lower.includes("book")) {
    const newState: AgentState = { ...state, step: "ask_service" };
    say(
      `Hi! I’m Sasha’s assistant. Let’s get you booked at ${assistantConfig.businessName}.`
    );
    say(nextPromptFor("ask_service", newState));
    newState.lastPrompt = nextPromptFor("ask_service", newState);
    return { messages, newState };
  }

  // Step handlers
  if (state.step === "ask_service") {
    const svc = findService(lower);
    if (!svc) {
      say("I didn’t catch the service. Please choose from the list above.");
      say(nextPromptFor("ask_service", state));
      return { messages, newState: { ...state } };
    }
    const pending = {
      ...state.pending,
      serviceId: svc.id,
      serviceName: svc.name,
      durationMinutes: svc.durationMinutes,
    };
    const newState: AgentState = { step: "ask_date", pending };
    say(`Lovely — ${svc.name}.`);
    say(nextPromptFor("ask_date", newState));
    return { messages, newState };
  }

  if (state.step === "ask_date") {
    const dateISO = normalizeDate(text, assistantConfig.timezone);
    if (!dateISO) {
      say("Please provide a date like 2025-11-05 or Nov 5.");
      return { messages, newState: state };
    }
    if (assistantConfig.blackoutDates.includes(dateISO)) {
      say("Sorry, that date is unavailable. Try another date?");
      return { messages, newState: state };
    }
    const pending = { ...state.pending, dateISO };
    const newState: AgentState = { step: "ask_time", pending };
    say(`Thanks — ${dateISO}.`);
    say(nextPromptFor("ask_time", newState));
    return { messages, newState };
  }

  if (state.step === "ask_time") {
    const start = parseTimeTo24h(text);
    const dur = state.pending.durationMinutes ?? 60;
    if (!start) {
      say("Please share a time like 2pm or 14:30.");
      return { messages, newState: state };
    }
    const end = getEndTime(start, dur);
    const dateISO = state.pending.dateISO!;
    if (!isWithinWorkingHours(dateISO, start, end)) {
      say(
        `That time is outside working hours (${assistantConfig.workingHours.open}-${assistantConfig.workingHours.close}). Please suggest another time.`
      );
      return { messages, newState: state };
    }
    if (hasConflict(dateISO, start, end)) {
      say("That slot is already booked. Could you try a different time?");
      return { messages, newState: state };
    }
    const pending = { ...state.pending, startTime: start, endTime: end };
    const newState: AgentState = { step: "ask_name", pending };
    say(`Perfect — ${start} to ${end}.`);
    say(nextPromptFor("ask_name", newState));
    return { messages, newState };
  }

  if (state.step === "ask_name") {
    const name = text.replace(/[^a-zA-Z\s\-'.]/g, "").trim();
    if (name.length < 2) {
      say("Please provide your full name.");
      return { messages, newState: state };
    }
    const pending = { ...state.pending, name };
    const newState: AgentState = { step: "ask_email", pending };
    say("Thanks!");
    say(nextPromptFor("ask_email", newState));
    return { messages, newState };
  }

  if (state.step === "ask_email") {
    const email = text.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      say("That email doesn’t look right. Could you check it?");
      return { messages, newState: state };
    }
    const pending = { ...state.pending, email };
    const newState: AgentState = { step: "ask_phone", pending };
    say("Great!");
    say(nextPromptFor("ask_phone", newState));
    return { messages, newState };
  }

  if (state.step === "ask_phone") {
    const phone = lower === "skip" ? undefined : text.trim();
    const pending = { ...state.pending, phone };
    const newState: AgentState = { step: "confirm", pending };
    say(nextPromptFor("confirm", newState));
    return { messages, newState };
  }

  if (state.step === "confirm") {
    if (["yes", "y"].includes(lower)) {
      const p = state.pending;
      const booking: BookingRecord = {
        id: generateId("bk"),
        serviceId: p.serviceId!,
        serviceName: p.serviceName!,
        durationMinutes: p.durationMinutes!,
        dateISO: p.dateISO!,
        startTime: p.startTime!,
        endTime: p.endTime!,
        name: p.name!,
        email: p.email!,
        phone: p.phone,
        notes: p.notes,
        status: "confirmed",
        createdAt: Date.now(),
      };
      saveBooking(booking);
      say(
        `You’re all set, ${booking.name}!\n${booking.serviceName} on ${booking.dateISO} at ${booking.startTime}.\nA confirmation will be sent to ${booking.email}.`
      );
      say(
        `Studio: ${assistantConfig.location}. If you need changes, just say 'reschedule' or 'cancel'.`
      );
      return { messages, newState: { step: "completed", pending: {} } };
    }
    if (["no", "n"].includes(lower)) {
      const newState: AgentState = { step: "ask_time", pending: state.pending };
      say("No worries. What time would you prefer instead?");
      return { messages, newState };
    }
    say("Please reply with 'yes' to confirm or 'no' to adjust.");
    return { messages, newState: state };
  }

  // Fallback
  say("I’m here to help you book — say 'book' to start.");
  return { messages, newState: state };
}
