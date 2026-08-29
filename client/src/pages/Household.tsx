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

export default function Household() {
  const { household, refresh } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invite, setInvite] = useState<{ inviteCode: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{household?.name}</h1>

      <section className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
        <h2 className="font-medium">Invite a roommate</h2>
        <button
          onClick={generateInvite}
          className="bg-warm-500 hover:bg-warm-700 text-white text-sm rounded-lg px-4 py-2"
        >
          Generate invite link (7-day expiry)
        </button>
        {inviteLink && (
          <div className="flex items-center gap-2">
            <code className="text-xs bg-warm-100 rounded-lg px-3 py-2 flex-1 break-all">{inviteLink}</code>
            <button
              className="text-sm border border-stone-300 rounded-lg px-3 py-1.5 hover:bg-stone-50"
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        )}
        {invite && (
          <p className="text-xs text-stone-400">Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-stone-200 p-5">
        <h2 className="font-medium mb-3">Members ({members.length})</h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <ul className="divide-y divide-stone-100">
          {members.map((m) => (
            <li key={m.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {m.user.displayName}
                  {m.role === "admin" && (
                    <span className="ml-2 text-xs bg-warm-100 text-warm-700 rounded-full px-2 py-0.5">admin</span>
                  )}
                </p>
                <p className="text-xs text-stone-400">{m.user.email}</p>
              </div>
              {m.role !== "admin" && (
                <button
                  onClick={() => removeMember(m.userId)}
                  className="text-xs text-stone-400 hover:text-red-600"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
