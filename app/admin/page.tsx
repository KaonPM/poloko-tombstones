"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    openQuotes: 0,
    acceptedQuotes: 0,
    ordersInProgress: 0,
    manufactured: 0,
  });
  const [actions, setActions] = useState({ unattendedLeads: 0, expiringQuotes: 0, overdueOrders: 0 });
  const [activity, setActivity] = useState<{ id: string; description: string; created_at: string }[]>([]);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/admin/login");
        return;
      }

      setAdminEmail(session.user.email || null);
      const [leadsResult, quotesResult, ordersResult, activityResult] = await Promise.all([
        supabase.from("poloko_leads").select("status,created_at"),
        supabase.from("poloko_quotes").select("status,valid_until"),
        supabase.from("poloko_orders").select("status,due_date"),
        supabase.from("poloko_activity_log").select("id,description,created_at").order("created_at", { ascending: false }).limit(6),
      ]);

      const leadStatuses = leadsResult.data || [];
      const quoteStatuses = quotesResult.data || [];
      const orderStatuses = ordersResult.data || [];
      setStats({
        totalLeads: leadStatuses.length,
        newLeads: leadStatuses.filter((lead) => lead.status === "New").length,
        openQuotes: quoteStatuses.filter((quote) =>
          ["Draft", "Sent"].includes(quote.status)
        ).length,
        acceptedQuotes: quoteStatuses.filter(
          (quote) => quote.status === "Accepted"
        ).length,
        ordersInProgress: orderStatuses.filter(
          (order) => order.status !== "Manufactured"
        ).length,
        manufactured: orderStatuses.filter(
          (order) => order.status === "Manufactured"
        ).length,
      });
      const now = Date.now();
      const inSevenDays = now + 7 * 24 * 60 * 60 * 1000;
      setActions({
        unattendedLeads: leadStatuses.filter((lead) => lead.status === "New" && now - new Date(lead.created_at).getTime() > 24 * 60 * 60 * 1000).length,
        expiringQuotes: quoteStatuses.filter((quote) => quote.status === "Sent" && quote.valid_until && new Date(quote.valid_until).getTime() <= inSevenDays).length,
        overdueOrders: orderStatuses.filter((order) => order.status !== "Manufactured" && order.due_date && new Date(order.due_date).getTime() < now).length,
      });
      setActivity(activityResult.data || []);
      setChecking(false);
    }

    void checkSession();
  }, [router]);

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
      <style>{`
        .admin-menu-card,
        .admin-workflow-card {
          transition: transform 180ms ease, box-shadow 180ms ease,
            border-color 180ms ease;
        }
        .admin-menu-card:hover,
        .admin-menu-card:focus-visible {
          transform: translateY(-4px);
          border-color: #C8A96A !important;
          box-shadow: 0 16px 34px rgba(55, 40, 21, 0.12);
          outline: none;
        }
        .admin-workflow-card:hover,
        .admin-workflow-card:focus-visible {
          transform: translateY(-3px);
          border-color: #C8A96A !important;
          outline: none;
        }
        @media (max-width: 700px) {
          .admin-dashboard-header {
            flex-direction: column;
            gap: 14px;
          }
          .admin-dashboard-logout {
            align-self: flex-start;
          }
        }
      `}</style>
      <div className="admin-dashboard-header" style={header}>
        <div>
          <h1 style={title}>Poloko Tombstones Admin</h1>
          <p style={subtitle}>
            Manage products, leads, quotes, payments and orders.
          </p>
          <p style={smallText}>Logged in as: {adminEmail}</p>
        </div>

        <button className="admin-dashboard-logout" onClick={logout} style={logoutButton}>
          Logout
        </button>
      </div>

      <div style={sectionHeading}>
        <p style={eyebrow}>TODAY&apos;S OVERVIEW</p>
        <h2 style={dashboardSectionTitle}>Sales and production at a glance</h2>
      </div>

      <section style={statsGrid}>
        <div style={statCard}>
          <h3>Total Leads</h3>
          <p style={statValue}>{stats.totalLeads}</p>
          <p style={statNote}>All website enquiries</p>
        </div>

        <div style={statCard}>
          <h3>New Leads</h3>
          <p style={statValue}>{stats.newLeads}</p>
          <p style={statNote}>Waiting for first contact</p>
        </div>

        <div style={statCard}>
          <h3>Open Quotes</h3>
          <p style={statValue}>{stats.openQuotes}</p>
          <p style={statNote}>Draft or sent</p>
        </div>

        <div style={statCard}>
          <h3>Accepted Quotes</h3>
          <p style={statValue}>{stats.acceptedQuotes}</p>
          <p style={statNote}>Ready for fulfilment</p>
        </div>

        <div style={statCard}>
          <h3>Orders In Progress</h3>
          <p style={statValue}>{stats.ordersInProgress}</p>
          <p style={statNote}>Currently in production</p>
        </div>

        <div style={statCard}>
          <h3>Manufactured</h3>
          <p style={statValue}>{stats.manufactured}</p>
          <p style={statNote}>Production completed</p>
        </div>
      </section>

      <section style={actionBar}>
        <div style={actionLink}><p style={eyebrow}>ACTION QUEUE</p><strong>{actions.unattendedLeads}</strong><span> leads waiting 24h+</span></div>
        <Link href="/admin/quotes" style={actionLink}><strong>{actions.expiringQuotes}</strong><span> quotes expire within 7 days</span></Link>
        <Link href="/admin/orders" style={actionLink}><strong>{actions.overdueOrders}</strong><span> overdue production orders</span></Link>
      </section>

      <div style={sectionHeading}>
        <p style={eyebrow}>ADMIN TOOLS</p>
        <h2 style={dashboardSectionTitle}>Manage the business</h2>
      </div>

      <section style={menuGrid}>
        <Link href="/admin/products" className="admin-menu-card" style={menuCard}>
          <h3>Products</h3>
          <p>Manage tombstone catalogue and pricing.</p>
        </Link>

        <Link href="/admin/leads" className="admin-menu-card" style={menuCard}>
          <h3>Leads</h3>
          <p>View and manage quote requests.</p>
        </Link>

        <Link href="/admin/quotes" className="admin-menu-card" style={menuCard}>
          <h3>Quotes</h3>
          <p>Create and manage customer quotations.</p>
        </Link>

        <Link href="/admin/payments" className="admin-menu-card" style={menuCard}>
          <h3>Payments</h3>
          <p>Track deposits and balances.</p>
        </Link>

        <Link href="/admin/orders" className="admin-menu-card" style={menuCard}>
          <h3>Manufacturing Orders</h3>
          <p>Track accepted work through every production stage.</p>
        </Link>
      </section>

      <section style={workflowSection}>
        <div style={workflowHeader}>
          <div>
            <p style={workflowEyebrow}>CUSTOMER JOURNEY</p>
            <h2 style={workflowTitle}>How every lead and quote is tracked</h2>
          </div>
          <p style={workflowIntro}>
            Each step stays linked to the customer, from their website enquiry
            to the completed tombstone.
          </p>
        </div>

        <div style={workflowGrid}>
          {[
            ["01", "Lead captured", "New enquiries enter Leads automatically. Update them as Contacted, Quote Sent, Negotiating, Won or Lost.", "/admin/leads"],
            ["02", "Quote prepared", "Create a quote against the lead. Its status moves from Draft or Sent to Accepted, Declined or Expired.", "/admin/quotes"],
            ["03", "Payment confirmed", "Record the deposit against the quotation. The customer receives a branded confirmation email.", "/admin/payments"],
            ["04", "Production tracked", "Convert an accepted quote into an order and follow every workshop manufacturing stage.", "/admin/orders"],
            ["05", "Manufactured", "Complete Quality Check and mark the order Manufactured to close the production journey.", "/admin/orders"],
          ].map(([number, heading, description, href]) => (
            <Link key={number} href={href} className="admin-workflow-card" style={workflowCard}>
              <span style={workflowNumber}>{number}</span>
              <h3 style={workflowCardTitle}>{heading}</h3>
              <p style={workflowCardText}>{description}</p>
              <span style={workflowAction}>Open →</span>
            </Link>
          ))}
        </div>
      </section>

      <section style={activityPanel}>
        <div><p style={eyebrow}>RECENT ACTIVITY</p><h2 style={dashboardSectionTitle}>Latest changes</h2></div>
        <div style={activityList}>
          {activity.length === 0 ? <p style={statNote}>Activity will appear after the new database migration is applied.</p> : activity.map((item) => (
            <div key={item.id} style={activityRow}><span>{item.description.replaceAll("poloko_", "").replaceAll("_", " ")}</span><time>{new Date(item.created_at).toLocaleString("en-ZA")}</time></div>
          ))}
        </div>
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
  fontSize: "clamp(19px, 5.3vw, 42px)",
  marginBottom: "10px",
  color: "#14110D",
  whiteSpace: "nowrap",
  letterSpacing: "-0.7px",
};

const subtitle: React.CSSProperties = {
  color: "#6C5A45",
};

const smallText: React.CSSProperties = {
  color: "#6C5A45",
  fontSize: "14px",
};

const sectionHeading: React.CSSProperties = { marginBottom: "18px" };
const eyebrow: React.CSSProperties = { margin: "0 0 7px", color: "#9B7434", fontSize: "11px", fontWeight: 700, letterSpacing: "3px" };
const dashboardSectionTitle: React.CSSProperties = { margin: 0, color: "#14110D", fontSize: "28px" };

const statsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  marginBottom: "40px",
};

const statCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  borderTop: "4px solid #C8A96A",
  padding: "24px",
};

const statValue: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#14110D",
  margin: "12px 0 5px",
};

const statNote: React.CSSProperties = { margin: 0, color: "#7A6852", fontSize: "13px" };
const actionBar: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 1, background: "#D8C29B", border: "1px solid #D8C29B", marginBottom: 32 };
const actionLink: React.CSSProperties = { padding: "15px 18px", background: "#FFF9EF", color: "#14110D", textDecoration: "none" };

const workflowSection: React.CSSProperties = { margin: "0 0 28px", padding: "22px", background: "#15120E", color: "#FFF9EF" };
const workflowHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", marginBottom: "24px" };
const workflowEyebrow: React.CSSProperties = { margin: "0 0 7px", color: "#C8A96A", fontSize: "11px", fontWeight: 700, letterSpacing: "3px" };
const workflowTitle: React.CSSProperties = { margin: 0, fontSize: "30px", color: "#FFF9EF" };
const workflowIntro: React.CSSProperties = { maxWidth: "440px", margin: 0, color: "#C9BDA9", lineHeight: 1.6 };
const workflowGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" };
const workflowCard: React.CSSProperties = { display: "block", minHeight: "185px", padding: "16px", border: "1px solid #4C4131", background: "#211C15", color: "#FFF9EF", textDecoration: "none", boxSizing: "border-box" };
const workflowNumber: React.CSSProperties = { display: "inline-grid", placeItems: "center", width: "38px", height: "38px", borderRadius: "50%", background: "#C8A96A", color: "#14110D", fontWeight: 700, fontSize: "13px" };
const workflowCardTitle: React.CSSProperties = { margin: "17px 0 9px", fontSize: "19px" };
const workflowCardText: React.CSSProperties = { margin: "0 0 16px", color: "#C9BDA9", fontSize: "13px", lineHeight: 1.55 };
const workflowAction: React.CSSProperties = { color: "#C8A96A", fontWeight: 700, fontSize: "13px" };
const activityPanel: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24, background: "#FFF9EF", border: "1px solid #D8C29B", padding: 22, marginBottom: 30 };
const activityList: React.CSSProperties = { display: "grid" };
const activityRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 15, padding: "9px 0", borderBottom: "1px solid #E4D6BE", color: "#5C5145", fontSize: 13 };

const menuGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
  marginBottom: "40px",
};

const menuCard: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "24px",
  textDecoration: "none",
  color: "#14110D",
  display: "block",
  borderTop: "4px solid #14110D",
};

const logoutButton: React.CSSProperties = {
  background: "#151111",
  color: "white",
  border: "none",
  padding: "12px 18px",
  cursor: "pointer",
  fontWeight: 700,
};
