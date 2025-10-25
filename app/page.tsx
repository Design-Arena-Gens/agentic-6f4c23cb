import Chat from "@/app/components/Chat";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 font-sans dark:bg-black">
      <div className="mx-auto max-w-4xl py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sasha K Makeup — Bookings
          </h1>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400">
            Chat with the assistant to schedule your appointment.
          </p>
        </header>
        <Chat />
        <div className="mt-6 text-center text-sm text-zinc-500">
          <a className="underline" href="/admin">Admin (local)</a>
        </div>
      </div>
    </div>
  );
}
