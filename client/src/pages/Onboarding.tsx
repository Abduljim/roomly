import { FormEvent, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

export default function Onboarding() {
  const { refresh } = useAuth();
  const [tab, setTab] = useState<"create" | "join">(
    () => (new URLSearchParams(window.location.search).get("code") ? "join" : "create")
  );
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState(
    () => new URLSearchParams(window.location.search).get("code") ?? ""
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hasInvite = inviteCode.trim().length > 0;

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

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-12 safe-bottom grid place-items-center">
      <div className="w-full space-y-6 page-enter">
        <div className="text-center">
          <div className="coin-float inline-block text-4xl">🔑</div>
          <h1 className="font-display font-bold text-3xl tracking-tight mt-3">
            Welcome to Roomly
          </h1>
          <p className="text-ink/55 text-sm mt-2 max-w-xs mx-auto">
            One shared space for your household's bills. Start one, or hop into a friend's.
          </p>
        </div>

        <div className="card p-1.5 flex">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                tab === t ? "bg-ink text-white shadow" : "text-ink/50 hover:text-ink"
              }`}
            >
              {t === "create" ? "Create a home" : "Join one"}
            </button>
          ))}
        </div>

        {tab === "create" ? (
          <form onSubmit={create} className="card p-6 stagger">
            <span className="text-2xl">🏠</span>
            <h2 className="font-semibold mt-1">Name your place</h2>
            <p className="text-xs text-ink/50 mb-4">e.g. 42 Maple Street, "The Den", or "Flat 3B".</p>
            <div>
              <label className="field-label">Household name</label>
              <input
                className="field"
                placeholder="e.g. 42 Maple Street"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-4" disabled={busy}>
              {busy ? "Starting…" : "Create household"}
            </button>
          </form>
        ) : (
          <form onSubmit={join} className="card p-6 stagger">
            <span className="text-2xl">🤝</span>
            <h2 className="font-semibold mt-1">Got an invite code?</h2>
            <p className="text-xs text-ink/50 mb-4">Ask your roommate for the code from their Household tab.</p>
            <div>
              <label className="field-label">Invite code</label>
              <input
                className="field uppercase tracking-[0.2em]"
                placeholder="XXXX-XXXX"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-ghost w-full mt-4" disabled={busy}>
              {busy ? "Joining…" : "Join household"}
            </button>
          </form>
        )}

        {error && (
          <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl px-3 py-2">{error}</p>
        )}
      </div>
    </div>
  );
}
