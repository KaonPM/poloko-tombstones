"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const stages = ["Confirmed", "Design Approval", "Material Preparation", "Cutting", "Engraving", "Assembly", "Quality Check", "Manufactured"];

type Quote = { id: string; quote_number: string; customer_id: string; deposit_amount: number; status: string; customer: { full_name: string; phone: string }[] | null };
type Order = { id: string; quote_id: string; order_number: string; status: string; due_date: string | null; design_notes: string | null; production_notes: string | null; manufactured_at: string | null; quote: { quote_number: string; customer: { full_name: string; phone: string }[] | null }[] | null };
type Payment = { quote_id: string; amount: number; payment_type: string };

export default function AdminOrdersPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [designNotes, setDesignNotes] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [quoteResult, orderResult, paymentResult] = await Promise.all([
      supabase.from("poloko_quotes").select("id, quote_number, customer_id, deposit_amount, status, customer:poloko_customers(full_name, phone)").in("status", ["Accepted", "Approved"]).order("created_at", { ascending: false }),
      supabase.from("poloko_orders").select("id, quote_id, order_number, status, due_date, design_notes, production_notes, manufactured_at, quote:poloko_quotes(quote_number, customer:poloko_customers(full_name, phone))").order("created_at", { ascending: false }),
      supabase.from("poloko_payments").select("quote_id, amount, payment_type"),
    ]);
    setLoading(false);
    if (quoteResult.error || orderResult.error || paymentResult.error) {
      alert(quoteResult.error?.message || orderResult.error?.message || paymentResult.error?.message);
      return;
    }
    setQuotes((quoteResult.data as unknown as Quote[]) || []);
    setOrders((orderResult.data as unknown as Order[]) || []);
    setPayments((paymentResult.data as Payment[]) || []);
  }, []);

  useEffect(() => {
    async function initialise() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/admin/login"); return; }
      setChecking(false);
      await fetchData();
    }
    void initialise();
  }, [fetchData, router]);

  const availableQuotes = useMemo(() => {
    const used = new Set(orders.map((order) => order.quote_id));
    const paidByQuote = payments.reduce<Record<string, number>>((totals, payment) => {
      totals[payment.quote_id] = (totals[payment.quote_id] || 0) + (payment.payment_type === "Refund" ? -Number(payment.amount) : Number(payment.amount));
      return totals;
    }, {});
    return quotes.filter((quote) => !used.has(quote.id) && (paidByQuote[quote.id] || 0) >= Number(quote.deposit_amount));
  }, [orders, payments, quotes]);

  async function createOrder(event: React.FormEvent) {
    event.preventDefault();
    const quote = quotes.find((item) => item.id === quoteId);
    if (!quote) return;
    setSaving(true);
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const { error } = await supabase.from("poloko_orders").insert({ quote_id: quote.id, customer_id: quote.customer_id, order_number: orderNumber, due_date: dueDate || null, design_notes: designNotes || null });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setQuoteId(""); setDueDate(""); setDesignNotes("");
    await fetchData();
  }

  async function updateOrder(order: Order, changes: Partial<Order>) {
    const update = { ...changes, updated_at: new Date().toISOString(), ...(changes.status === "Manufactured" ? { manufactured_at: new Date().toISOString() } : {}) };
    const { error } = await supabase.from("poloko_orders").update(update).eq("id", order.id);
    if (error) { alert(error.message); return; }
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...update } : item));

    if (changes.status) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const response = await fetch("/api/send-order-update", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ orderId: order.id }),
        });
        const result = await response.json();
        if (response.ok && result.sent) alert(`Status updated and customer emailed at ${result.email}.`);
        else if (response.ok && !result.sent) alert(`Status updated. ${result.reason}`);
        else alert(result.error || "Status updated, but the customer email failed.");
      }
    }
  }

  if (checking) return <main style={page}>Checking admin access...</main>;

  return <main style={page}>
    <header style={header}><div><h1 style={title}>Manufacturing Orders</h1><p style={muted}>Track every accepted, deposit-paid order until the tombstone is manufactured.</p></div><nav style={nav}><Link href="/admin" style={linkButton}>Dashboard</Link><Link href="/admin/quotes" style={linkButton}>Quotes</Link><Link href="/admin/payments" style={linkButton}>Payments</Link></nav></header>
    <form onSubmit={createOrder} style={panel}><h2>Start Production Order</h2><div style={formGrid}>
      <label style={label}>Accepted, deposit-paid quotation<select required value={quoteId} onChange={(e) => setQuoteId(e.target.value)} style={input}><option value="">Select paid quotation</option>{availableQuotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quote_number} — {quote.customer?.[0]?.full_name || "Customer"}</option>)}</select></label>
      <label style={label}>Target completion<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={input} /></label>
    </div><label style={label}>Design / inscription brief<textarea value={designNotes} onChange={(e) => setDesignNotes(e.target.value)} style={input} /></label><button disabled={saving} style={primaryButton}>{saving ? "Creating..." : "Create Production Order"}</button></form>
    <section><h2>Production Pipeline</h2>{loading ? <p>Loading...</p> : orders.length === 0 ? <div style={panel}>No production orders yet. Mark a quote Accepted, then create its order here.</div> : orders.map((order) => {
      const currentStage = stages.indexOf(order.status);
      const customer = order.quote?.[0]?.customer?.[0];
      return <article key={order.id} style={panel}>
        <div style={orderHeader}><div><strong style={{ fontSize: 20 }}>{order.order_number}</strong><p style={muted}>{order.quote?.[0]?.quote_number} · {customer?.full_name || "Customer"} · {customer?.phone || "No phone"}</p></div><span style={badge}>{order.status}</span></div>
        <Link href={`/admin/orders/${order.id}`} style={detailLink}>Open full order details →</Link>
        <div style={pipeline}>{stages.map((stage, index) => <div key={stage} style={{ ...stageBox, ...(index <= currentStage ? activeStage : {}) }}><span>{index + 1}</span><small>{stage}</small></div>)}</div>
        <div style={formGrid}><label style={label}>Production stage<select value={order.status} onChange={(e) => void updateOrder(order, { status: e.target.value })} style={input}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label><label style={label}>Target date<input type="date" value={order.due_date || ""} onChange={(e) => void updateOrder(order, { due_date: e.target.value || null })} style={input} /></label></div>
        <label style={label}>Production notes<textarea defaultValue={order.production_notes || ""} onBlur={(e) => void updateOrder(order, { production_notes: e.target.value || null })} style={input} /></label>
        {order.manufactured_at && <p style={complete}>Manufactured on {new Date(order.manufactured_at).toLocaleDateString("en-ZA")}</p>}
      </article>;
    })}</section>
  </main>;
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#F4EFE6", padding: "40px 7%", fontFamily: "Georgia, 'Times New Roman', serif", color: "#14110D" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 28 };
const title: React.CSSProperties = { fontSize: 42, margin: "0 0 8px" };
const muted: React.CSSProperties = { color: "#6C5A45", margin: "6px 0" };
const nav: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const linkButton: React.CSSProperties = { padding: "11px 16px", border: "1px solid #8D744D", color: "#14110D", textDecoration: "none", background: "#FFF9EF" };
const panel: React.CSSProperties = { background: "#FFF9EF", border: "1px solid #D8C29B", padding: 24, marginBottom: 24 };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 };
const label: React.CSSProperties = { display: "grid", gap: 7, fontWeight: 700, marginBottom: 14 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #BBA57E", background: "white", padding: 11, font: "inherit" };
const primaryButton: React.CSSProperties = { border: 0, background: "#151111", color: "white", padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
const orderHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" };
const badge: React.CSSProperties = { background: "#2E6B3E", color: "white", padding: "8px 12px", height: "fit-content", fontWeight: 700 };
const pipeline: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(8, minmax(90px, 1fr))", gap: 6, overflowX: "auto", margin: "22px 0" };
const stageBox: React.CSSProperties = { display: "grid", gap: 6, justifyItems: "center", textAlign: "center", padding: "10px 5px", background: "#E7DED0", color: "#756A5A" };
const activeStage: React.CSSProperties = { background: "#C8A96A", color: "#14110D", fontWeight: 700 };
const complete: React.CSSProperties = { background: "#DCEBDD", color: "#20562D", padding: 12, fontWeight: 700 };
const detailLink: React.CSSProperties = { display: "inline-block", marginTop: 10, color: "#7A5A28", fontWeight: 700, textDecoration: "none" };
