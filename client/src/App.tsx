import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Bills from "./pages/Bills";
import Household from "./pages/Household";
import History from "./pages/History";
import Layout from "./components/Layout";

export default function App() {
  const { user, loading, household } = useAuth();

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-stone-400">Loading…</div>;
  }

  if (!user) return <Landing />;
  if (!household) return <Onboarding />;

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/household" element={<Household />} />
        <Route path="/history" element={<History />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
