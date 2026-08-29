import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

interface Member {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: { id: string; displayName: string; email: string };
}

const AVATAR_TONES = [
  "bg-brand-100 text-brand-700",
  "bg-cash-100 text-cash-600",
  "bg-blue-100 text-blue-600",
  "bg-pink-100 text-pink-600",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-600",
];

export default function Household() {
  const { household, refresh } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invite, setInvite] = useState<{ inviteCode: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const load = useCallback(async () => {
    if (!household) return;
    try {
      setMembers(await api<Member[]>(`/households/${household.id}/members`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    }
  }, [household]);

  useEffect(() => {
    load();
  }, [load]);

  async function generateInvite() {
    if (!household) return;
    setError("");
    try {
      const res = await api<{ inviteCode: string; expiresAt: string }>(
        `/households/${household.id}/invite`,
        { method: "POST" }
      );
      setInvite(res);
      setShowLink(true);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  async function removeMember(userId: string) {
    if (!household) return;
    if (!confirm("Remove this member? Their payment history is kept.")) return;
    try {
      await api(`/households/${household.id}/members/${userId}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  const inviteLink = invite
    ? `${window.location.origin}/join?code=${invite.inviteCode}`
    : household?.inviteCode
      ? `${window.location.origin}/join?code=${household.inviteCode}`
      : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">The crew</p>
          <h1 className="font-display font-bold text-2xl tracking-tight">
            {household?.name}
          </h1>
        </div>
        <span className="chip bg-cash-100 text-cash-600">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      {/* Invite */}
      <section className="card p-5 stagger">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 shrink-0 rounded-2xl bg-brand-100 text-brand-700 grid place-items-center">
            ✉️
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">Invite a roommate</h2>
            <p className="text-xs text-ink/50 mt-0.5">
              Share the code or link — it expires in 7 days.
            </p>
            <button onClick={generateInvite} className="btn btn-dark mt-3 w-full">
              Generate invite code
            </button>
          </div>
        </div>

        {showLink && (
          <div className="mt-4 space-y-3 page-enter">
            {invite && (
              <div>
                <label className="field-label">Invite code</label>
                <div
                  className="field text-center font-mono text-xl tracking-[0.3em] cursor-pointer select-all"
                  onClick={() => {
                    navigator.clipboard.writeText(invite.inviteCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }}
                  title="Tap to copy"
                >
                  {invite.inviteCode}
                </div>
              </div>
            )}
            {inviteLink && (
              <div>
                <label className="field-label">Or share this link</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-canvas rounded-xl px-3 py-2 flex-1 break-all ring-1 ring-ink/5">
                    {inviteLink}
                  </code>
                  <button
                    className="btn-ghost px-3"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1200);
                    }}
                  >
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            )}
            {invite && (
              <p className="text-[11px] text-ink/40">
                Expires {new Date(invite.expiresAt).toLocaleDateString()}
              </p>
            )}
            {copied && <p className="text-xs text-cash-600 font-medium">Copied to clipboard!</p>}
          </div>
        )}
      </section>

      {/* Members roster */}
      <section className="card p-5 stagger">
        <h2 className="font-semibold mb-3">Members</h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <ul className="divide-y divide-ink/5">
          {members.map((m, i) => (
            <li key={m.id} className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-10 h-10 shrink-0 rounded-full grid place-items-center text-sm font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
                >
                  {m.user.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <span className="truncate">{m.user.displayName}</span>
                    {m.role === "admin" && (
                      <span className="chip bg-brand-100 text-brand-700">admin</span>
                    )}
                  </p>
                  <p className="text-xs text-ink/40 truncate">{m.user.email}</p>
                </div>
              </div>
              {m.role !== "admin" && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-xs text-ink/35 hover:text-red-600 transition-colors shrink-0"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Value-add: how settlement works */}
      <section className="card p-5 stagger">
        <h2 className="font-semibold mb-3">How settlement works</h2>
        <ol className="space-y-3 text-sm text-ink/70">
          <Step n={1}>Add your shared bills on the Bills tab — rent, utilities, anything.</Step>
          <Step n={2}>Each month Roomly works out who owes whom in the fewest payments.</Step>
          <Step n={3}>Mark payments sent, confirm when received. That's it.</Step>
        </ol>
      </section>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="w-6 h-6 shrink-0 rounded-full bg-ink text-white grid place-items-center text-xs font-bold">
        {n}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}
