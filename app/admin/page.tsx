"use client";

import Link from "next/link";

export default function AdminDashboard() {
  return (
    <main style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Poloko Admin Dashboard</h1>
          <p style={subtitle}>
            Manage products, leads, quotes, payments and orders.
          </p>
        </div>
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