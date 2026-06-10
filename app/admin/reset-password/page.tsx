"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password updated successfully.");
    router.push("/admin/login");
  }

  return (
    <main style={page}>
      <form onSubmit={handleUpdatePassword} style={box}>
        <h1 style={title}>Create New Password</h1>
        <p style={text}>Enter your new admin password.</p>

        <div style={passwordWrap}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
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

        <input
          type={showPassword ? "text" : "password"}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          style={input}
        />

        <button type="submit" disabled={loading} style={button}>
          {loading ? "Updating..." : "Update Password"}
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