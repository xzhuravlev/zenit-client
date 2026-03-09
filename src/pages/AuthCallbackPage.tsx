import { useEffect, useState } from "react";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { auth } from "../firebase/firebase";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      if (!isSignInWithEmailLink(auth, window.location.href)) {
        setError("Invalid link.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const email = params.get("email") ?? localStorage.getItem("emailForSignIn");

      if (!email) {
        setError("Something went wrong. Please try signing in again.");
        return;
      }

      try {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        const token = await result.user.getIdToken();

        const name = params.get("name");
        const surname = params.get("surname");

        if (name && surname) {
          await fetch("http://localhost:3000/auth/email/signup", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, surname }),
          });
        } else {
          await fetch("http://localhost:3000/auth/email", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
        }

        localStorage.removeItem("emailForSignIn");
        window.location.href = "/cockpits";
      } catch {
        setError("Something went wrong. Please try signing in again.");
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      color: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 16,
    }}>
      {error || "Signing you in..."}
    </div>
  );
}