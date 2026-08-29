import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Onboarding() {
  const { refresh } = useAuth();
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/households", { method: "POST", body: JSON.stringify({ name }) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/households/join", { method: "POST", body: JSON.stringify({ inviteCode }) });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-warm-500";

  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center text-warm-700">Welcome to Roomly</h1>
        <form onSubmit={create} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-3">
          <h2 className="font-medium">Create a household</h2>
          <input className={input} placeholder="e.g. 42 Maple Street" value={name} onChange={(e) => setName(e.target.value)} required />
          <button className="w-full bg-warm-500 hover:bg-warm-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50" disabled={busy}>
            Create household
          </button>
        </form>
        <form onSubmit={join} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-3">
          <h2 className="font-medium">Or join with an invite code</h2>
          <input className={input} placeholder="Invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required />
          <button className="w-full border border-warm-500 text-warm-700 rounded-lg py-2.5 text-sm font-medium hover:bg-warm-100 disabled:opacity-50" disabled={busy}>
            Join household
          </button>
        </form>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </div>
    </div>
  );
}
