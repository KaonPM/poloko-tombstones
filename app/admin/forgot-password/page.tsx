"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin/reset-password`,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSent(true);
  }

  return (
    <main style={page}>
      <form onSubmit={handleReset} style={box}>
        <h1 style={title}>Reset Password</h1>

        {sent ? (
          <>
            <p style={text}>
              Password reset link sent. Please check your email.
            </p>

            <button
              type="button"
              onClick={() => router.push("/admin/login")}
              style={button}
            >
              Back to Login
            </button>
          </>
        ) : (
          <>
            <p style={text}>
              Enter your admin email address and we will send a reset link.
            </p>

            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={input}
            />

            <button type="submit" disabled={loading} style={button}>
              {loading ? "Sending..." : "Send Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/admin/login")}
              style={linkButton}
            >
              Back to login
            </button>
          </>
        )}
      </form>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "30px",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const box: React.CSSProperties = {
  width: "100%",
  maxWidth: "430px",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "32px",
};

const title: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "10px",
};

const text: React.CSSProperties = {
  color: "#6C5A45",
  marginBottom: "24px",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  border: "1px solid #D8C29B",
  background: "#FFFDF7",
  marginBottom: "14px",
};

const button: React.CSSProperties = {
  width: "100%",
  background: "#14110D",
  color: "#C8A96A",
  border: "none",
  padding: "14px 20px",
  cursor: "pointer",
  fontWeight: 700,
};

const linkButton: React.CSSProperties = {
  marginTop: "16px",
  background: "transparent",
  border: "none",
  color: "#6C5A45",
  cursor: "pointer",
  textDecoration: "underline",
};