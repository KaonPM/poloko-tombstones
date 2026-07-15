"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string; order_number: string; status: string; due_date: string | null;
  design_notes: string | null; production_notes: string | null; manufactured_at: string | null; created_at: string;
  quote: { id: string; quote_number: string; total_amount: number; deposit_amount: number; balance_amount: number; customer: { full_name: string; phone: string; email: string | null; location: string | null }[] | null }[] | null;
};
type Payment = { id: string; receipt_number: string; amount: number; payment_type: string; paid_at: string };

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/admin/login"); return; }
    const result = await supabase.from("poloko_orders")
      .select("id,order_number,status,due_date,design_notes,production_notes,manufactured_at,created_at,quote:poloko_quotes(id,quote_number,total_amount,deposit_amount,balance_amount,customer:poloko_customers(full_name,phone,email,location))")
      .eq("id", id).single();
    if (result.error) { alert(result.error.message); setLoading(false); return; }
    const fetched = result.data as unknown as Order;
    setOrder(fetched);
    const quoteId = fetched.quote?.[0]?.id;
    if (quoteId) {
      const paymentResult = await supabase.from("poloko_payments").select("id,receipt_number,amount,payment_type,paid_at").eq("quote_id", quoteId).order("paid_at", { ascending: false });
      setPayments((paymentResult.data as Payment[]) || []);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    // Data updates occur after the asynchronous Supabase requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  if (loading) return <main style={page}>Loading order...</main>;
  if (!order) return <main style={page}>Order not found.</main>;
  const quote = order.quote?.[0];
  const customer = quote?.customer?.[0];
  const paid = payments.reduce((sum, item) => sum + (item.payment_type === "Refund" ? -Number(item.amount) : Number(item.amount)), 0);

  return <main style={page}>
    <header style={header}><div><p style={eyebrow}>MANUFACTURING ORDER</p><h1 style={title}>{order.order_number}</h1><span style={badge}>{order.status}</span></div><nav style={nav}><Link href="/admin/orders" style={button}>Back to Orders</Link><Link href="/admin" style={button}>Dashboard</Link></nav></header>
    <div style={grid}>
      <section style={panel}><h2>Customer</h2><p><strong>{customer?.full_name || "Customer"}</strong></p><p>{customer?.phone}</p><p>{customer?.email || "No email"}</p><p>{customer?.location || "No location recorded"}</p></section>
      <section style={panel}><h2>Quotation & Payment</h2><p>Quote: <strong>{quote?.quote_number}</strong></p><p>Total: R{Number(quote?.total_amount || 0).toFixed(2)}</p><p>Paid: R{paid.toFixed(2)}</p><p>Outstanding: <strong>R{Math.max(0, Number(quote?.total_amount || 0) - paid).toFixed(2)}</strong></p></section>
      <section style={panel}><h2>Production</h2><p>Created: {new Date(order.created_at).toLocaleDateString("en-ZA")}</p><p>Due: {order.due_date || "Not set"}</p><p>Manufactured: {order.manufactured_at ? new Date(order.manufactured_at).toLocaleDateString("en-ZA") : "Not yet"}</p></section>
    </div>
    <div style={gridTwo}><section style={panel}><h2>Design / Inscription Brief</h2><p style={notes}>{order.design_notes || "No design notes recorded."}</p></section><section style={panel}><h2>Production Notes</h2><p style={notes}>{order.production_notes || "No production notes recorded."}</p></section></div>
    <section style={panel}><h2>Payment Timeline</h2>{payments.length === 0 ? <p>No payments recorded.</p> : payments.map((payment) => <div key={payment.id} style={row}><span>{payment.paid_at}</span><strong>{payment.receipt_number}</strong><span>{payment.payment_type}</span><strong>R{Number(payment.amount).toFixed(2)}</strong></div>)}</section>
  </main>;
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#F4EFE6", padding: "34px 7%", color: "#14110D", fontFamily: "Georgia, 'Times New Roman', serif" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20, marginBottom: 24 };
const eyebrow: React.CSSProperties = { color: "#9B7434", letterSpacing: 3, fontSize: 11, fontWeight: 700 };
const title: React.CSSProperties = { margin: "5px 0 12px", fontSize: 38 };
const badge: React.CSSProperties = { background: "#15120E", color: "#C8A96A", padding: "8px 12px", fontWeight: 700 };
const nav: React.CSSProperties = { display: "flex", gap: 10 };
const button: React.CSSProperties = { border: "1px solid #8D744D", padding: "10px 13px", color: "#14110D", textDecoration: "none", background: "#FFF9EF" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16 };
const gridTwo: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 };
const panel: React.CSSProperties = { background: "#FFF9EF", border: "1px solid #D8C29B", borderTop: "3px solid #C8A96A", padding: 20, marginBottom: 16 };
const notes: React.CSSProperties = { whiteSpace: "pre-wrap", lineHeight: 1.65, color: "#5C5145" };
const row: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, padding: "11px 0", borderBottom: "1px solid #E4D6BE" };
