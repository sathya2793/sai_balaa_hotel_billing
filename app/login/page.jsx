"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { FiLogIn, FiKey } from "react-icons/fi";
import { showSuccess, showError, closeNotify } from "../../utils/notifications";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Find email by username
      const q = query(collection(db, "users"), where("username", "==", username));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("Username not found");

      const { email, role } = snap.docs[0].data();

      await signInWithEmailAndPassword(auth, email, password);

      localStorage.setItem("userEmail", email);
      localStorage.setItem("userRole", role);
      showSuccess("Logged in!");
      router.push("/billing");
       closeNotify();
    } catch (err) {
      showError(err.message || "Invalid username or password");
    }
    setLoading(false);
  }

  async function handleResetPassword() {
    if (!username) return showError("Enter your username first.");
    const snap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (snap.empty) return showError("Username not found.");
    const { email } = snap.docs[0].data();
    try {
      await sendPasswordResetEmail(auth, email);
      showSuccess(`Password reset sent to: ${email}`);
    } catch {
      showError("Reset email failed. Try again later.");
    }
  }

  return (
    <div className="login-block" aria-labelledby="login-title">
      <form className="login-form-ui" onSubmit={handleLogin} aria-describedby="login-desc" autoComplete="on">
        <h1 id="login-title" className="login-title-ui">
          <FiKey style={{ marginRight: 8, color: "#2563eb" }} />
          Billing Sign In
        </h1>
        <div id="login-desc" className="login-desc-ui">Log in by username and password</div>

        <label htmlFor="login-username" className="login-label-ui">Username</label>
        <div className="login-input-wrap">
          <input
            id="login-username"
            className="login-input-ui"
            value={username}
            autoFocus
            autoComplete="username"
            onChange={e => setUsername(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <label htmlFor="login-password" className="login-label-ui">Password</label>
        <div className="login-input-wrap">
          <input
            id="login-password"
            type="password"
            className="login-input-ui"
            value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" className="login-btn-ui" disabled={loading} aria-busy={loading}>
          <FiLogIn />{loading ? " Logging in..." : " Log In"}
        </button>
        <button
          type="button"
          className="login-reset-ui"
          onClick={handleResetPassword}
          tabIndex={0}
          disabled={loading}
        >
          Forgot / Reset Password?
        </button>
      </form>
    </div>
  );
}
