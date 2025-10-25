export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number; // epoch ms
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceCents: number;
}

export interface BookingRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  durationMinutes: number;
  dateISO: string; // YYYY-MM-DD
  startTime: string; // HH:mm (24h)
  endTime: string; // HH:mm (24h)
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: 'tentative' | 'confirmed' | 'cancelled';
  createdAt: number;
}

export interface AgentState {
  step:
    | 'idle'
    | 'ask_service'
    | 'ask_date'
    | 'ask_time'
    | 'ask_name'
    | 'ask_email'
    | 'ask_phone'
    | 'confirm'
    | 'completed';
  pending: Partial<BookingRecord> & { dateISO?: string };
  lastPrompt?: string;
}

export interface WorkingHours {
  open: string; // HH:mm
  close: string; // HH:mm
  daysOpen: number[]; // 0=Sun..6=Sat
}

export interface AssistantConfig {
  businessName: string;
  ownerName: string;
  location: string;
  contactEmail: string;
  phone?: string;
  services: ServiceOption[];
  workingHours: WorkingHours;
  slotMinutes: number;
  blackoutDates: string[]; // YYYY-MM-DD
  timezone: string; // IANA tz
}
