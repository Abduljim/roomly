import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { api } from "../api";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/bills", label: "Bills" },
  { to: "/household", label: "Household" },
  { to: "/history", label: "History" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, household, setUser } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    navigate("/");
    window.location.reload();
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <span className="font-semibold text-lg text-warm-700">Roomly</span>
            <span className="ml-2 text-sm text-stone-400">{household?.name}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-500 hidden sm:inline">{user?.displayName}</span>
            <button onClick={logout} className="text-stone-500 hover:text-stone-800">
              Log out
            </button>
          </div>
        </div>
        <nav className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `px-3 py-2 text-sm rounded-t-lg border-b-2 whitespace-nowrap ${
                  isActive
                    ? "border-warm-500 text-warm-700 font-medium"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
