import { useState } from "react";
import { api, money } from "../api";

export interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  note: string | null;
  payerName: string;
  payeeName: string;
}

export default function PaymentActions({
  payment,
  onChanged,
}: {
  payment: PaymentRow;
  onChanged: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(path: string, body?: object) {
    setBusy(true);
    setError("");
    try {
      await api(`/payments/${payment.id}/${path}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const isPayer = false; // determined server-side; show both affordances, server enforces

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {payment.status === "pending" && (
          <button
            className="text-sm bg-warm-500 hover:bg-warm-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
            disabled={busy}
            onClick={() => act("mark-sent", { note: note || undefined })}
          >
            Mark sent {money(payment.amount)}
          </button>
        )}
        {payment.status === "sent" && (
          <button
            className="text-sm bg-green-700 hover:bg-green-800 text-white rounded-lg px-3 py-1.5 disabled:opacity-50"
            disabled={busy}
            onClick={() => act("confirm")}
          >
            Confirm received
          </button>
        )}
        {["pending", "sent"].includes(payment.status) && (
          <button
            className="text-sm border border-red-300 text-red-600 rounded-lg px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
            disabled={busy || !note.trim()}
            onClick={() => act("dispute", { note })}
          >
            Dispute
          </button>
        )}
        <input
          className="text-sm border border-stone-300 rounded-lg px-2 py-1.5 flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-warm-500"
          placeholder="Note (e.g. sent via Venmo)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      {payment.note && <p className="text-xs text-stone-500">Note: {payment.note}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
