"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/admin");
  }

  return (
    <main style={page}>
      <form onSubmit={handleLogin} style={box}>
        <h1 style={title}>Poloko Admin</h1>
        <p style={text}>Login to manage leads, quotes, products and payments.</p>

        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={input}
        />

        <div style={passwordWrap}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={passwordInput}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={eyeButton}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <button type="submit" disabled={loading} style={button}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin/forgot-password")}
          style={linkButton}
        >
          Forgot password?
        </button>
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

const passwordWrap: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  border: "1px solid #D8C29B",
  background: "#FFFDF7",
  marginBottom: "14px",
};

const passwordInput: React.CSSProperties = {
  flex: 1,
  padding: "14px",
  border: "none",
  background: "transparent",
  outline: "none",
};

const eyeButton: React.CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontSize: "18px",
  padding: "0 14px",
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