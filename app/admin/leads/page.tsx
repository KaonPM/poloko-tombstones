"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);

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

    setChecking(false);
    fetchLeads();
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

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  if (checking) {
    return (
      <main style={page}>
        <p style={text}>Checking admin access...</p>
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

        <div style={headerActions}>
          <button onClick={() => router.push("/admin")} style={secondaryButton}>
            Dashboard
          </button>

          <button onClick={fetchLeads} style={button}>
            Refresh
          </button>

          <button onClick={logout} style={deleteButton}>
            Logout
          </button>
        </div>
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
              style={secondaryButtonFull}
              onClick={() => router.push(`/admin/quotes?lead=${lead.id}`)}
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

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "30px",
};

const headerActions: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
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
  padding: "12px 16px",
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
};

const secondaryButtonFull: React.CSSProperties = {
  background: "#C8A96A",
  color: "#14110D",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "12px",
  width: "100%",
};

const deleteButton: React.CSSProperties = {
  background: "#151212",
  color: "white",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
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