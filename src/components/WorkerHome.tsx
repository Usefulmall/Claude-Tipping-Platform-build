import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { AppUser, Worker } from "../types";
import WorkerQrPage from "./WorkerQrPage";

// The page a signed-in worker sees: their own QR code and details.
export default function WorkerHome({ user }: { user: AppUser }) {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    getDoc(doc(db, "workers", user.uid))
      .then((snap) => {
        if (snap.exists()) { setWorker(snap.data() as Worker); setState("ready"); }
        else setState("missing");
      })
      .catch(() => setState("missing"));
  }, [user.uid]);

  if (state === "ready" && worker) return <WorkerQrPage worker={worker} />;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center">
        {state === "loading" ? (
          <>
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading your page…</p>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-4">We could not find your worker page. Please contact TipMe support.</p>
            <button
              onClick={async () => { await signOut(auth); window.location.href = "/"; }}
              className="text-green-600 font-medium hover:underline"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
