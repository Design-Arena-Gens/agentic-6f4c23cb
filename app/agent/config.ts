import { AssistantConfig } from "@/app/types";

export const assistantConfig: AssistantConfig = {
  businessName: "Sasha K Makeup",
  ownerName: "Sasha K",
  location: "Studio near Downtown, 125 Bloom St, Suite 3B",
  contactEmail: "bookings@sashakmakeup.com",
  phone: undefined,
  timezone: "America/Los_Angeles",
  services: [
    {
      id: "bridal",
      name: "Bridal Glam",
      description: "Full bridal makeup including lashes and touch-up kit.",
      durationMinutes: 120,
      priceCents: 35000,
    },
    {
      id: "party",
      name: "Party Glam",
      description: "Event-ready glam suitable for parties or nights out.",
      durationMinutes: 90,
      priceCents: 22000,
    },
    {
      id: "natural",
      name: "Natural Beat",
      description: "Soft, natural makeup for daytime or headshots.",
      durationMinutes: 60,
      priceCents: 15000,
    },
    {
      id: "trial",
      name: "Bridal Trial",
      description: "Trial session to find your perfect bridal look.",
      durationMinutes: 75,
      priceCents: 18000,
    },
  ],
  workingHours: {
    // Open Tue-Sun 10:00-18:00 (closed Mondays)
    open: "10:00",
    close: "18:00",
    daysOpen: [2, 3, 4, 5, 6, 0],
  },
  slotMinutes: 30,
  blackoutDates: [],
};

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}
