"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../lib/firebase";
import { FiEye, FiEyeOff, FiLogIn, FiKey } from "react-icons/fi";
import { showSuccess, showError, closeNotify } from "../../utils/notifications";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    } catch (error) {
      console.error("Reset email error:", error);
      showError("Reset email failed. Try again later.");
    }
  }

  return (
    <div className="login-block" aria-labelledby="login-title">
      <form className="login-form-ui" onSubmit={handleLogin} aria-describedby="login-desc" autoComplete="on">
        <h1 id="login-title" className="login-title-ui">
          Sai Balaa <p>Hotel Billing Sign In </p>
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
        <div className="login-input-wrap" style={{ position: "relative"}}>
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            className="login-input-ui"
            value={password}
            autoComplete="current-password"
            onChange={e => setPassword(e.target.value)}
            required
            disabled={loading}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "0.5rem",
              top: "50%",
              transform: "translateY(-60%)",
              cursor: "pointer",
              color: "#555",
            }}
            aria-label={showPassword ? "Hide password" : "Show password"}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setShowPassword(!showPassword); }}
          >
            {showPassword ? <FiEye size={20} /> : <FiEyeOff size={20} />}
      </span>
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
