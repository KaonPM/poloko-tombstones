"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.push("/admin/login");
      return;
    }

    setAdminEmail(session.user.email || null);
    setChecking(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (checking) {
    return (
      <main style={page}>
        <p style={subtitle}>Checking admin access...</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Poloko Admin Dashboard</h1>
          <p style={subtitle}>
            Manage products, leads, quotes, payments and orders.
          </p>
          <p style={smallText}>Logged in as: {adminEmail}</p>
        </div>

        <button onClick={logout} style={logoutButton}>
          Logout
        </button>
      </div>

      <section style={statsGrid}>
        <div style={statCard}>
          <h3>New Leads</h3>
          <p style={statValue}>0</p>
        </div>

        <div style={statCard}>
          <h3>Quotes Sent</h3>
          <p style={statValue}>0</p>
        </div>

        <div style={statCard}>
          <h3>Payments Received</h3>
          <p style={statValue}>R0</p>
        </div>

        <div style={statCard}>
          <h3>Orders In Progress</h3>
          <p style={statValue}>0</p>
        </div>
      </section>

      <section style={menuGrid}>
        <Link href="/admin/products" style={menuCard}>
          <h3>Products</h3>
          <p>Manage tombstone catalogue and pricing.</p>
        </Link>

        <Link href="/admin/leads" style={menuCard}>
          <h3>Leads</h3>
          <p>View and manage quote requests.</p>
        </Link>

        <Link href="/admin/quotes" style={menuCard}>
          <h3>Quotes</h3>
          <p>Create and manage customer quotations.</p>
        </Link>

        <Link href="/admin/payments" style={menuCard}>
          <h3>Payments</h3>
          <p>Track deposits and balances.</p>
        </Link>

        <Link href="/admin/orders" style={menuCard}>
          <h3>Orders</h3>
          <p>Track production and installations.</p>
        </Link>
      </section>
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  padding: "40px 7%",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "40px",
};

const title: React.CSSProperties = {
  fontSize: "42px",
  marginBottom: "10px",
  color: "#14110D",
};

const subtitle: React.CSSProperties = {
  color: "#6C5A45",
};

const smallText: React.CSSProperties = {
  color: "#6C5A45",
  fontSize: "14px",
};

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "40px",
};

const statCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "24px",
};

const statValue: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#14110D",
};

const menuGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const menuCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "24px",
  textDecoration: "none",
  color: "#14110D",
  display: "block",
};

const logoutButton: React.CSSProperties = {
  background: "#151111",
  color: "white",
  border: "none",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: 700,
};