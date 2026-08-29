import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Landing() {
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "signup") {
        await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password, displayName }),
        });
      } else {
        await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-warm-700 text-center">Roomly</h1>
        <p className="text-stone-500 text-center mt-1 mb-8 text-sm">
          Shared bills for roommates — settled, without the group-chat drama.
        </p>
        <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
          {mode === "signup" && (
            <input
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          )}
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            className="w-full bg-warm-500 hover:bg-warm-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            disabled={busy}
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
          <p className="text-center text-sm text-stone-500">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="text-warm-700 underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
