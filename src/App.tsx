import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { AppUser } from "./types";
import AdminDashboard from "./components/AdminDashboard";
import EmployerDashboard from "./components/EmployerDashboard";
import PublicTipView from "./components/PublicTipView";
import PublicWorkerOnboard from "./components/PublicWorkerOnboard";
import LoginPage from "./components/LoginPage";
import LandingPage from "./components/LandingPage";
import WorkerHome from "./components/WorkerHome";
import TermsOfUse from "./components/TermsOfUse";

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);

  const params = new URLSearchParams(window.location.search);
  const workerIdParam = params.get("worker");
  const onboardParam = params.get("onboard");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const snap = await getDoc(doc(db, "users", firebaseUser.uid));
        if (snap.exists()) {
          setUser(snap.data() as AppUser);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (window.location.pathname === "/terms") {
    return <TermsOfUse onBack={() => (window.location.href = "/")} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  if (workerIdParam) return <PublicTipView workerId={workerIdParam} />;
  if (onboardParam) return <PublicWorkerOnboard employerId={onboardParam} />;

  if (user) {
    if (user.role === "admin") return <AdminDashboard user={user} />;
    if (user.role === "employer") return <EmployerDashboard user={user} />;
    if (user.role === "worker") return <WorkerHome user={user} />;
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Unknown account role. Please contact support.</p>
      </div>
    );
  }

  if (!authMode) {
    return <LandingPage onGetStarted={() => setAuthMode("register")} onSignIn={() => setAuthMode("login")} />;
  }
  return <LoginPage key={authMode} startMode={authMode} onBack={() => setAuthMode(null)} />;
}
