import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { cleanPhone } from "../banks";
import { Worker } from "../types";
import BankSelect from "./BankSelect";
import WorkerQrPage from "./WorkerQrPage";

interface Props { onBack?: () => void; startMode?: "login" | "register"; }

// The username is the person's cellphone number. Firebase wants an email-style
// login, so the number is turned into a private one that is never shown or used
// to send mail, e.g. 0843088317 -> 0843088317@login.tipme.africa
function loginEmail(phone: string): string {
  return `${cleanPhone(phone)}@login.tipme.africa`;
}

function phoneOk(phone: string): boolean {
  return /^0\d{9}$/.test(cleanPhone(phone));
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

const field = "w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400";

export default function LoginPage({ onBack, startMode = "register" }: Props) {
  const [mode, setMode] = useState<"login" | "register">(startMode);
  const [accountType, setAccountType] = useState<"employer" | "individual">("individual");
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<Worker | null>(null);

  async function handleLogin() {
    setError("");
    if (!phone.trim() || !password) { setError("Please enter your cellphone number and password."); return; }
    // Employers who registered before this change signed in with an email address.
    const email = phone.includes("@") ? phone.trim() : loginEmail(phone);
    if (!phone.includes("@") && !phoneOk(phone)) {
      setError("Please enter a valid 10-digit cellphone number, for example 082 123 4567.");
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError("");
    const individual = accountType === "individual";
    if (!name.trim() || !phone || (individual && (!position.trim() || !bank))) {
      setError(individual ? "Please complete all fields, including your bank." : "Please complete all fields.");
      return;
    }
    if (!phoneOk(phone)) { setError("Please enter a valid 10-digit cellphone number, for example 082 123 4567."); return; }
    if (password.length < 6) { setError("Please choose a password of at least 6 characters."); return; }
    if (password !== password2) { setError("The two passwords do not match."); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, loginEmail(phone), password);
      const uid = cred.user.uid;
      const now = new Date().toISOString();
      await setDoc(doc(db, "users", uid), {
        uid,
        email: loginEmail(phone),
        name: name.trim(),
        role: individual ? "worker" : "employer",
        createdAt: now,
      });
      if (individual) {
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
      } else {
        // Reload so the app picks up the new account and opens the employer dashboard.
        window.location.reload();
      }
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  if (created) return <WorkerQrPage worker={created} justRegistered />;

  const registering = mode === "register";
  const individual = accountType === "individual";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <img src="/tipme-icon.png" alt="TipMe" className="w-16 h-16 object-contain mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">TipMe Platform</h1>
          <p className="text-gray-500 text-sm mt-1">
            {registering ? "Create a new account" : "Sign in to your account"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          {registering && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                <select value={accountType} onChange={(e) => setAccountType(e.target.value as any)} className={field}>
                  <option value="individual">Individual</option>
                  <option value="employer">Employer</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {individual
                    ? "Individual: I receive tips myself and want my own QR code."
                    : "Employer: I manage a team and want to register my workers and print their QR codes."}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Your name" />
              </div>
              {individual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
                  <input type="text" value={position} onChange={(e) => setPosition(e.target.value)} className={field} placeholder="Waitress, Valet, Housekeeper…" />
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cellphone Number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="082 123 4567" />
            <p className="text-xs text-gray-400 mt-1">
              {registering
                ? individual
                  ? "This is your username. Tippers also pay you on this number via PayShap, so it must be registered as your ShapID with your bank."
                  : "This is your username."
                : "Your username. Employers who signed up with an email address can still use it here."}
            </p>
          </div>

          {registering && individual && (
            <BankSelect value={bank} onChange={setBank} phone={phone} audience="worker" />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={field}
              placeholder={registering ? "At least 6 characters" : "••••••••"}
              onKeyDown={(e) => !registering && e.key === "Enter" && handleLogin()}
            />
          </div>

          {registering && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
              <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className={field} />
              <p className="text-xs text-gray-400 mt-1">
                Write your password down somewhere safe. If you forget it, ask TipMe to reset it for you.
              </p>
            </div>
          )}

          <button
            onClick={registering ? handleRegister : handleLogin}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Please wait…" : registering ? (individual ? "Create My Page" : "Create Account") : "Sign In"}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          {registering ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setMode(registering ? "login" : "register"); setError(""); }}
            className="text-green-600 font-medium hover:underline"
          >
            {registering ? "Sign In" : "Register"}
          </button>
        </p>
        {onBack && (
          <p className="text-center text-sm mt-3">
            <button onClick={onBack} className="text-gray-500 hover:underline">← Back</button>
          </p>
        )}
      </div>
    </div>
  );
}
