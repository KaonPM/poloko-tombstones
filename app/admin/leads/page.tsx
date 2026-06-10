"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  interest_type: string;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  customer:
    | {
        full_name: string;
        phone: string;
        email: string | null;
        location: string | null;
      }[]
    | null;
  product:
    | {
        title: string;
        category: string;
        price: string | null;
      }[]
    | null;
};

const leadStatuses = [
  "New",
  "Contacted",
  "Quoted",
  "Follow-up",
  "Converted",
  "Lost",
];

export default function AdminLeadsPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

  function login() {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setLoggedIn(true);
      fetchLeads();
    } else {
      alert("Incorrect password.");
    }
  }

  async function fetchLeads() {
    setLoading(true);

    const { data, error } = await supabase
      .from("poloko_leads")
      .select(
        `
        id,
        interest_type,
        message,
        source,
        status,
        created_at,
        customer:poloko_customers (
          full_name,
          phone,
          email,
          location
        ),
        product:tombstone_products (
          title,
          category,
          price
        )
      `
      )
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setLeads((data as unknown as Lead[]) || []);
  }

  async function updateLeadStatus(id: string, status: string) {
    const { error } = await supabase
      .from("poloko_leads")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchLeads();
  }

  if (!loggedIn) {
    return (
      <main style={page}>
        <div style={loginBox}>
          <h1 style={title}>Poloko Admin</h1>
          <p style={text}>Enter admin password to manage quote requests.</p>

          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={input}
          />

          <button onClick={login} style={button}>
            Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={header}>
        <div>
          <h1 style={title}>Quote Requests</h1>
          <p style={text}>Track customer interest and prepare quotes.</p>
        </div>

        <button onClick={fetchLeads} style={button}>
          Refresh
        </button>
      </div>

      {loading ? <p style={text}>Loading quote requests...</p> : null}

      <section style={grid}>
        {leads.map((lead) => {
          const customer = lead.customer?.[0];
          const product = lead.product?.[0];

          return (
            <div key={lead.id} style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={cardTitle}>
                    {customer?.full_name || "Unknown Customer"}
                  </h3>
                  <p style={smallText}>{lead.interest_type}</p>
                </div>

                <span style={statusBadge}>{lead.status}</span>
              </div>

              <div style={details}>
                <p>
                  <strong>Phone:</strong> {customer?.phone || "Not provided"}
                </p>

                <p>
                  <strong>Email:</strong> {customer?.email || "Not provided"}
                </p>

                <p>
                  <strong>Source:</strong> {lead.source || "Website"}
                </p>

                <p>
                  <strong>Product:</strong>{" "}
                  {product
                    ? `${product.title} - ${product.price || "No price"}`
                    : "Not linked to catalogue product"}
                </p>

                <p>
                  <strong>Message:</strong>
                </p>

                <p style={messageBox}>
                  {lead.message || "No message provided."}
                </p>
              </div>

              <select
                value={lead.status}
                onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                style={input}
              >
                {leadStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>

              <button
                style={secondaryButton}
                onClick={() =>
                  alert("Quote generation will be added in the next step.")
                }
              >
                Generate Quote
              </button>
            </div>
          );
        })}
      </section>

      {!loading && leads.length === 0 ? (
        <p style={text}>No quote requests found yet.</p>
      ) : null}
    </main>
  );
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#F4EFE6",
  padding: "50px 7%",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const loginBox: React.CSSProperties = {
  maxWidth: "420px",
  margin: "80px auto",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "30px",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "20px",
  marginBottom: "30px",
};

const title: React.CSSProperties = {
  fontSize: "34px",
  marginBottom: "10px",
};

const text: React.CSSProperties = {
  color: "#6C5A45",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  border: "1px solid #D8C29B",
  background: "#FFFDF7",
};

const button: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  border: "none",
  padding: "14px 20px",
  cursor: "pointer",
  fontWeight: 700,
};

const secondaryButton: React.CSSProperties = {
  background: "#C8A96A",
  color: "#14110D",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "12px",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "20px",
};

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "16px",
};

const cardTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
};

const smallText: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#6C5A45",
};

const statusBadge: React.CSSProperties = {
  background: "#14110D",
  color: "#C8A96A",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: 700,
};

const details: React.CSSProperties = {
  color: "#2B241B",
  lineHeight: 1.6,
};

const messageBox: React.CSSProperties = {
  background: "#F4EFE6",
  border: "1px solid #D8C29B",
  padding: "12px",
  whiteSpace: "pre-wrap",
};