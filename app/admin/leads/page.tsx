"use client";
/* eslint-disable @next/next/no-img-element -- Dynamic Supabase images intentionally retain the existing rendering. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PaginationControls from "@/components/admin/PaginationControls";

type Related<T> = T | T[] | null;

type Lead = {
  id: string;
  interest_type: string;
  message: string | null;
  source: string | null;
  status: string;
  created_at: string;
  customer: Related<{ full_name: string; phone: string; email: string | null; location: string | null }>;
  product: Related<{ title: string; category: string; price: string | null; image_url: string | null; product_code: string | null }>;
};

const leadStatuses = [
  "New",
  "Contacted",
  "Quote Sent",
  "Negotiating",
  "Won",
  "Lost",
  "Installed",
];

function first<T>(value: Related<T>) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminLeadsPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize, setLeadPageSize] = useState(5);

  const fetchLeads = useCallback(async () => {
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
          price,
          image_url,
          product_code
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
  }, []);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      setChecking(false);
      await fetchLeads();
    }

    void checkSession();
  }, [fetchLeads, router]);

  async function updateLeadStatus(id: string, status: string) {
    const { error } = await supabase
      .from("poloko_leads")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const customer = first(lead.customer);
      const product = first(lead.product);

      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;

      const combinedText = `
        ${customer?.full_name || ""}
        ${customer?.phone || ""}
        ${customer?.email || ""}
        ${product?.title || ""}
        ${product?.product_code || ""}
        ${lead.interest_type || ""}
        ${lead.message || ""}
      `.toLowerCase();

      const matchesSearch = combinedText.includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [leads, statusFilter, searchTerm]);

  const paginatedLeads = filteredLeads.slice((leadPage - 1) * leadPageSize, leadPage * leadPageSize);

  const totalLeads = leads.length;
  const newLeads = leads.filter((lead) => lead.status === "New").length;
  const contactedLeads = leads.filter(
    (lead) => lead.status === "Contacted"
  ).length;
  const quotesSent = leads.filter(
    (lead) => lead.status === "Quote Sent"
  ).length;
  const wonDeals = leads.filter((lead) => lead.status === "Won").length;
  const lostDeals = leads.filter((lead) => lead.status === "Lost").length;

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
          <h1 style={title}>Lead Management</h1>
          <p style={text}>
            Track quote requests, manage follow-ups, and convert enquiries into
            sales.
          </p>
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

      <section style={summaryGrid}>
        <div style={summaryCard}>
          <p style={summaryLabel}>Total Leads</p>
          <h2 style={summaryValue}>{totalLeads}</h2>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>New</p>
          <h2 style={summaryValue}>{newLeads}</h2>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Contacted</p>
          <h2 style={summaryValue}>{contactedLeads}</h2>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Quotes Sent</p>
          <h2 style={summaryValue}>{quotesSent}</h2>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Won</p>
          <h2 style={summaryValue}>{wonDeals}</h2>
        </div>

        <div style={summaryCard}>
          <p style={summaryLabel}>Lost</p>
          <h2 style={summaryValue}>{lostDeals}</h2>
        </div>
      </section>

      <section style={filterBox}>
        <input
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setLeadPage(1); }}
          placeholder="Search by customer, phone, product, product code, or message"
          style={input}
        />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setLeadPage(1); }}
          style={input}
        >
          <option value="All">All Statuses</option>
          {leadStatuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </section>

      {loading ? <p style={text}>Loading quote requests...</p> : null}

      <section style={grid}>
        {paginatedLeads.map((lead) => {
          const customer = first(lead.customer);
          const product = first(lead.product);
          const isExpanded = expandedLeadId === lead.id;

          return (
            <div key={lead.id} style={card}>
              <div style={cardHeader}>
                <div>
                  <h3 style={cardTitle}>
                    {customer?.full_name || "Unknown Customer"}
                  </h3>
                  <p style={smallText}>{lead.interest_type}</p>
                </div>

                <div style={rowActions}>
                  <span style={getStatusBadgeStyle(lead.status)}>{lead.status}</span>
                  <button type="button" onClick={() => setExpandedLeadId((current) => current === lead.id ? null : lead.id)} style={viewButton} aria-expanded={isExpanded}>
                    {isExpanded ? "Close" : "View"}
                  </button>
                </div>
              </div>

              {isExpanded ? <>
              {product?.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  style={productImage}
                />
              ) : null}

              <div style={details}>
                <p>
                  <strong>Phone:</strong> {customer?.phone || "Not provided"}
                </p>

                <p>
                  <strong>Email:</strong> {customer?.email || "Not provided"}
                </p>

                <p>
                  <strong>Location:</strong>{" "}
                  {customer?.location || "Not provided"}
                </p>

                <p>
                  <strong>Source:</strong> {lead.source || "Website"}
                </p>

                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(lead.created_at).toLocaleDateString("en-ZA")}
                </p>

                <p>
                  <strong>Product:</strong>{" "}
                  {product
                    ? `${product.title} - ${product.price || "No price"}`
                    : "Not linked to catalogue product"}
                </p>

                {product?.product_code ? (
                  <p>
                    <strong>Product Code:</strong> {product.product_code}
                  </p>
                ) : null}

                {product?.category ? (
                  <p>
                    <strong>Category:</strong> {product.category}
                  </p>
                ) : null}

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

              {customer?.phone ? (
                <a
                  href={`https://wa.me/27${customer.phone
                    .replace(/\D/g, "")
                    .replace(/^0/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={whatsappButton}
                >
                  WhatsApp Customer
                </a>
              ) : null}
              </> : null}
            </div>
          );
        })}
      </section>

      <PaginationControls
        itemLabel="leads"
        page={leadPage}
        pageSize={leadPageSize}
        totalItems={filteredLeads.length}
        onPageChange={setLeadPage}
        onPageSizeChange={(pageSize) => { setLeadPageSize(pageSize); setLeadPage(1); }}
      />

      {!loading && filteredLeads.length === 0 ? (
        <p style={text}>No quote requests found for the selected filters.</p>
      ) : null}
    </main>
  );
}

function getStatusBadgeStyle(status: string): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  if (status === "New") {
    return { ...base, background: "#14110D", color: "#C8A96A" };
  }

  if (status === "Contacted") {
    return { ...base, background: "#FFF3CD", color: "#6C4A00" };
  }

  if (status === "Quote Sent") {
    return { ...base, background: "#DDEBFF", color: "#163B66" };
  }

  if (status === "Negotiating") {
    return { ...base, background: "#EFE2FF", color: "#4B247A" };
  }

  if (status === "Won") {
    return { ...base, background: "#DDF6E4", color: "#205C36" };
  }

  if (status === "Lost") {
    return { ...base, background: "#F8D7DA", color: "#842029" };
  }

  if (status === "Installed") {
    return { ...base, background: "#E8E0D1", color: "#2B241B" };
  }

  return { ...base, background: "#14110D", color: "#C8A96A" };
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
  flexWrap: "wrap",
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

const summaryGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const summaryCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "18px",
};

const summaryLabel: React.CSSProperties = {
  margin: 0,
  color: "#6C5A45",
  fontSize: "14px",
};

const summaryValue: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "30px",
};

const filterBox: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1fr",
  gap: "14px",
  marginBottom: "24px",
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

const productImage: React.CSSProperties = {
  width: "100%",
  height: "220px",
  objectFit: "cover",
  border: "1px solid #D8C29B",
  marginBottom: "16px",
  background: "#F4EFE6",
};

const whatsappButton: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  background: "#1F7A3F",
  color: "white",
  textDecoration: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
  marginTop: "10px",
};

const rowActions: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" };
const viewButton: React.CSSProperties = { border: "1px solid #C8A96A", background: "#FFF9EF", color: "#14110D", padding: "6px 10px", cursor: "pointer", fontWeight: 700, fontSize: "12px" };
