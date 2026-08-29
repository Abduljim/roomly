import { ReactNode, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { api } from "../api";
import NotificationBell from "./NotificationBell";

const navItems = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/bills", label: "Bills", icon: ReceiptIcon },
  { to: "/household", label: "Housemates", icon: UsersIcon },
  { to: "/history", label: "History", icon: ClockIcon },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, household, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    // Move the sliding pill under the active nav item on route change
    const active = document.querySelector<HTMLAnchorElement>(`a[data-nav="${location.pathname}"]`);
    const el = indicatorRef.current;
    if (active && el) {
      el.style.width = `${active.offsetWidth}px`;
      el.style.transform = `translateX(${active.offsetLeft}px)`;
    }
  }, [location.pathname]);

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/");
    window.location.reload();
  }

  return (
    <div className="min-h-screen md:bg-canvas md:py-8">
      <div className="md:max-w-2xl md:mx-auto">
        {/* Top bar */}
        <header className="sticky top-0 z-30 safe-top bg-canvas/85 backdrop-blur border-b border-ink/5 md:rounded-t-3xl md:border-x">
          <div className="flex items-center justify-between px-5 md:px-6 h-14">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-display font-bold text-lg tracking-tight text-ink">
                Roomly
              </span>
              <span className="truncate text-sm text-ink/45 hidden sm:inline">
                {household?.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-brand-100 ring-1 ring-brand/20 grid place-items-center text-xs font-bold text-brand-700">
                  {(user?.displayName || "?").charAt(0).toUpperCase()}
                </span>
                <span className="text-sm text-ink/60">{user?.displayName}</span>
              </div>
              <NotificationBell />
              <button
                onClick={logout}
                className="text-xs font-medium text-ink/45 hover:text-ink transition-colors px-2 py-1 rounded-lg hover:bg-ink/5"
                title="Log out"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="px-4 md:px-6 pb-32 md:pb-10 pt-4">
          <div key={location.pathname} className="page-enter">
            {children}
          </div>
        </main>

        {/* Bottom floating nav (mobile app-shell) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 safe-bottom">
          <div className="mx-4 mb-3 rounded-3xl bg-ink text-white/70 shadow-nav ring-1 ring-ink/10 px-2 py-1.5 relative overflow-hidden">
            <div className="flex justify-around items-center relative">
              {navItems.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  data-nav={n.to}
                  className={({ isActive }) =>
                    `nav-pill transition-colors duration-200 ${
                      isActive ? "text-white" : "hover:text-white/90"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <n.icon active={isActive} />
                      <span>{n.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

/* Animated icon components — each has a little motion */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: active ? "translateY(-1px)" : "none" }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      {active && <path d="M9 21v-6h6v6" />}
    </svg>
  );
}
function ReceiptIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: active ? "rotate(-6deg)" : "none" }}>
      <path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}
function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: active ? "scale(1.08)" : "none" }}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3 3.5-4.5 6.5-4.5s5.7 1.5 6.5 4.5" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 15.5c2 .6 3.5 2 4 4" />
    </svg>
  );
}
function ClockIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300" style={{ transform: active ? "rotate(8deg)" : "none" }}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
