import { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { cleanPhone } from "../banks";
import { Worker } from "../types";
import BankSelect from "./BankSelect";
import WorkerQrPage from "./WorkerQrPage";

interface Props { onBack: () => void; }

// A worker's username is their cellphone number. Firebase wants an email-style
// login, so we turn the number into a private one that is never shown or used
// to send mail, e.g. 0843088317 -> 0843088317@worker.tipme.africa
function loginEmail(phone: string): string {
  return `${cleanPhone(phone)}@worker.tipme.africa`;
}

function friendlyError(e: any): string {
  const code = e?.code || "";
  if (code === "auth/email-already-in-use") return "This cellphone number already has a login. Please sign in instead.";
  if (code === "auth/weak-password") return "Your password is too short. Please use at least 6 characters.";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found")
    return "Wrong cellphone number or password.";
  if (code === "auth/too-many-requests") return "Too many tries. Please wait a few minutes and try again.";
  if (code === "auth/network-request-failed") return "No internet connection. Please try again.";
  return e?.message || "Something went wrong. Please try again.";
}

const input = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400";

export default function WorkerAuth({ onBack }: Props) {
  const [mode, setMode] = useState<"register" | "login">("register");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Worker | null>(null);

  function phoneOk() {
    return /^0\d{9}$/.test(cleanPhone(phone));
  }

  async function handleLogin() {
    setError("");
    if (!phoneOk() || !password) { setError("Please enter your cellphone number and password."); return; }
    setBusy(true);
    try {
      // The app notices the sign-in by itself and opens the worker's page.
      await signInWithEmailAndPassword(auth, loginEmail(phone), password);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    setError("");
    if (!name.trim() || !position.trim() || !phone || !bank) {
      setError("Please complete all fields, including your bank.");
      return;
    }
    if (!phoneOk()) { setError("Please enter a valid 10-digit cellphone number, for example 082 123 4567."); return; }
    if (password.length < 6) { setError("Please choose a password of at least 6 characters."); return; }
    if (password !== password2) { setError("The two passwords do not match."); return; }

    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail(phone), password);
      const uid = cred.user.uid;
      const now = new Date().toISOString();
      await setDoc(doc(db, "users", uid), {
        uid,
        email: loginEmail(phone),
        name: name.trim(),
        role: "worker",
        createdAt: now,
      });
      const worker: Worker = {
        id: uid,
        employerId: "self", // registered on their own, not through an employer
        name: name.trim(),
        position: position.trim(),
        phone: cleanPhone(phone),
        bank,
        createdAt: now,
      };
      await setDoc(doc(db, "workers", uid), worker);
      setCreated(worker);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (created) return <WorkerQrPage worker={created} justRegistered />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">{mode === "register" ? "👋" : "🔑"}</div>
          <h1 className="text-xl font-bold text-gray-800">
            {mode === "register" ? "Create your worker page" : "Worker sign in"}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === "register"
              ? "Register once, then sign in any time to get your QR code"
              : "Sign in with your cellphone number and password"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-4">{error}</div>
        )}

        <div className="space-y-4">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={input} placeholder="Jane Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={input} placeholder="Waitress, Valet, Housekeeper…" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cellphone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="082 123 4567" />
            <p className="text-xs text-gray-400 mt-1">
              {mode === "register"
                ? "This is your username. Tippers also pay you on this number via PayShap, so it must be registered as your ShapID with your bank."
                : "The number you registered with."}
            </p>
          </div>

          {mode === "register" && (
            <BankSelect value={bank} onChange={setBank} phone={phone} audience="worker" />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={input}
              placeholder="At least 6 characters"
              onKeyDown={(e) => mode === "login" && e.key === "Enter" && handleLogin()}
            />
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
              <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className={input} />
              <p className="text-xs text-gray-400 mt-1">
                Write your password down somewhere safe. If you forget it, ask TipMe to reset it for you.
              </p>
            </div>
          )}

          <button
            onClick={mode === "register" ? handleRegister : handleLogin}
            disabled={busy}
            className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
          >
            {busy ? "Please wait…" : mode === "register" ? "Create My Page" : "Sign In"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-5">
          {mode === "register" ? "Already registered?" : "New here?"}{" "}
          <button
            onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}
            className="text-green-600 font-medium hover:underline"
          >
            {mode === "register" ? "Sign in" : "Create your page"}
          </button>
        </p>
        <p className="text-center text-sm mt-3">
          <button onClick={onBack} className="text-gray-500 hover:underline">← Back</button>
        </p>
      </div>
    </div>
  );
}
