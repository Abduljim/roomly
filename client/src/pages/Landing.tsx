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
    <div className="min-h-screen md:grid md:grid-cols-2 bg-canvas">
      {/* Left — brand / hero */}
      <section className="relative hidden md:flex flex-col justify-between p-10 lg:p-14 overflow-hidden bg-ink text-white">
        <AnimatedFlow />
        <div className="relative z-10 flex items-baseline gap-2">
          <span className="font-display font-bold text-2xl tracking-tight">Roomly</span>
          <span className="text-white/50 text-sm">shared bills, settled</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
            The cash flows.{" "}
            <span className="text-brand-300">The friendship stays.</span>
          </h1>
          <p className="mt-5 text-white/70 text-lg leading-relaxed">
            Roomly watches every shared bill, does the math, and tells each of you
            exactly who owes whom — so nobody has to start that awkward group-chat message.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Auto settlement", "Split anything", "Zero awkwardness"].map((t) => (
              <span key={t} className="chip bg-white/10 text-white/80 ring-1 ring-white/15">{t}</span>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-white/40 text-xs max-w-sm">
          A private home for your household's money — invite your roommates, settle each month,
          done.
        </p>
      </section>

      {/* Right — auth card */}
      <section className="min-h-screen grid place-items-center px-5 py-10 safe-bottom">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden mb-8 text-center">
            <div className="coin-float inline-block text-5xl">🪙</div>
            <h1 className="mt-2 font-display font-bold text-3xl tracking-tight">Roomly</h1>
            <p className="text-ink/50 text-sm mt-1">Shared bills for roommates — settled, without the drama.</p>
          </div>

          {/* Mode toggle */}
          <div className="card p-1.5 flex mb-5">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  mode === m ? "bg-ink text-white shadow" : "text-ink/50 hover:text-ink"
                }`}
              >
                {m === "login" ? "Log in" : "Start free"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="card p-6 stagger">
            {mode === "signup" && (
              <div>
                <label className="field-label">Your name</label>
                <input
                  className="field"
                  placeholder="e.g. Sam Carter"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            )}
            <div>
              <label className="field-label">Email</label>
              <input
                className="field"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="field-label">Password</label>
              <input
                className="field"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}
            <button type="submit" className="btn-primary w-full" disabled={busy}>
              {busy ? "One sec…" : mode === "login" ? "Log in" : "Create my account"}
            </button>
            <p className="text-center text-xs text-ink/45">
              By continuing you agree to settle bills like a civilized adult. No hidden fees, ever.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}

/* Signature animated money-flow hero background */
function AnimatedFlow() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-60"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <linearGradient id="arc1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f2c077" stopOpacity="0" />
          <stop offset="0.5" stopColor="#f2c077" stopOpacity="0.9" />
          <stop offset="1" stopColor="#f2c077" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="arc2" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#7f9d6b" stopOpacity="0" />
          <stop offset="0.5" stopColor="#9db98a" stopOpacity="0.9" />
          <stop offset="1" stopColor="#7f9d6b" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Nodes = housemates */}
      <circle cx="180" cy="230" r="16" fill="#f2c077" />
      <circle cx="620" cy="180" r="16" fill="#f2c077" />
      <circle cx="660" cy="560" r="16" fill="#f2c077" />
      <circle cx="250" cy="650" r="16" fill="#9db98a" />

      {/* Curved flow lines with animated dots */}
      <path id="f1" d="M180 230 Q 420 100 620 180" stroke="url(#arc1)" strokeWidth="2" className="flow-path" />
      <circle className="flow-arc" style={{ offsetPath: "path('M180 230 Q 420 100 620 180')" }} r="5" fill="#f2c077" />

      <path id="f2" d="M620 180 Q 700 380 660 560" stroke="url(#arc2)" strokeWidth="2" className="flow-path" />
      <circle className="flow-arc" style={{ offsetPath: "path('M620 180 Q 700 380 660 560')" }} r="5" fill="#9db98a" />

      <path id="f3" d="M660 560 Q 430 680 250 650" stroke="url(#arc1)" strokeWidth="2" className="flow-path" />
      <circle className="flow-arc-2" style={{ offsetPath: "path('M660 560 Q 430 680 250 650')" }} r="5" fill="#f2c077" />

      <path id="f4" d="M250 650 Q 160 450 180 230" stroke="url(#arc2)" strokeWidth="2" className="flow-path" />
      <circle className="flow-arc" style={{ offsetPath: "path('M250 650 Q 160 450 180 230')" }} r="5" fill="#9db98a" />

      {/* Floating coins */}
      <circle className="coin-float" cx="120" cy="620" r="22" fill="#f2c077" opacity="0.25" />
      <circle className="coin-float" cx="720" cy="360" r="16" fill="#f2c077" opacity="0.2" style={{ animationDelay: "1.4s" }} />
    </svg>
  );
}
