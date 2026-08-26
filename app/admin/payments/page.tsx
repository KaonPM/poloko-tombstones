"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Quote = {
  id: string;
  quote_number: string;
  total_amount: number;
  deposit_amount: number;
  customer: { full_name: string }[] | null;
};

type Payment = {
  id: string;
  receipt_number: string;
  quote_id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  quote: { quote_number: string; total_amount: number; customer: { full_name: string }[] | null }[] | null;
};

const emptyForm = {
  quoteId: "",
  amount: "",
  paymentType: "Deposit",
  paymentMethod: "EFT",
  reference: "",
  paidAt: new Date().toISOString().slice(0, 10),
  notes: "",
};

export default function AdminPaymentsPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [isPaymentWorkspaceOpen, setIsPaymentWorkspaceOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [quoteResult, paymentResult] = await Promise.all([
      supabase
        .from("poloko_quotes")
        .select("id, quote_number, total_amount, deposit_amount, customer:poloko_customers(full_name)")
        .in("status", ["Accepted", "Approved"])
        .order("created_at", { ascending: false }),
      supabase
        .from("poloko_payments")
        .select("id, receipt_number, quote_id, amount, payment_type, payment_method, reference, paid_at, notes, quote:poloko_quotes(quote_number, total_amount, customer:poloko_customers(full_name))")
        .order("paid_at", { ascending: false }),
    ]);

    setLoading(false);
    if (quoteResult.error || paymentResult.error) {
      alert(quoteResult.error?.message || paymentResult.error?.message);
      return;
    }
    setQuotes((quoteResult.data as unknown as Quote[]) || []);
    setPayments((paymentResult.data as unknown as Payment[]) || []);
  }, []);

  useEffect(() => {
    async function initialise() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/admin/login");
        return;
      }
      setChecking(false);
      await fetchData();
    }
    void initialise();
  }, [fetchData, router]);

  const paidByQuote = useMemo(() => {
    return payments.reduce<Record<string, number>>((totals, payment) => {
      const signedAmount =
        payment.payment_type === "Refund"
          ? -Number(payment.amount)
          : Number(payment.amount);
      totals[payment.quote_id] =
        (totals[payment.quote_id] || 0) + signedAmount;
      return totals;
    }, {});
  }, [payments]);

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.quoteId || amount <= 0) return;
    setSaving(true);
    const { data: payment, error } = await supabase
      .from("poloko_payments")
      .insert({
        quote_id: form.quoteId,
        amount,
        payment_type: form.paymentType,
        payment_method: form.paymentMethod,
        reference: form.reference || null,
        paid_at: form.paidAt,
        notes: form.notes || null,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    let confirmationMessage = "Payment recorded successfully.";

    if (session && payment) {
      const response = await fetch("/api/send-payment-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const result = await response.json();

      if (response.ok && result.sent) {
        confirmationMessage = `Payment recorded and receipt emailed to ${result.email}.`;
      } else if (response.ok && !result.sent) {
        confirmationMessage = `Payment recorded. ${result.reason}`;
      } else {
        confirmationMessage = result.error || "Payment recorded, but the receipt email failed.";
      }
    }

    setForm(emptyForm);
    await fetchData();
    alert(confirmationMessage);
  }

  async function resendReceipt(paymentId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch("/api/send-payment-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ paymentId }),
    });
    const result = await response.json();
    alert(response.ok && result.sent ? `Receipt emailed to ${result.email}.` : result.reason || result.error || "Receipt could not be sent.");
  }

  if (checking) return <main style={page}>Checking admin access...</main>;

  return (
    <main style={page}>
      <header style={header}>
        <div><h1 style={title}>Payments</h1><p style={muted}>Capture payments against accepted quotations and proforma invoices.</p></div>
        <nav style={nav}><Link href="/admin" style={linkButton}>Dashboard</Link><Link href="/admin/orders" style={linkButton}>Orders</Link></nav>
      </header>

      <form onSubmit={recordPayment} style={panel}>
        <div style={workspaceHeader}>
          <h2 style={workspaceTitle}>Record Payment</h2>
          <button type="button" aria-expanded={isPaymentWorkspaceOpen} onClick={() => setIsPaymentWorkspaceOpen((open) => !open)} style={workspacePill}>
            {isPaymentWorkspaceOpen ? "Close form" : "Open form"}
          </button>
        </div>
        {isPaymentWorkspaceOpen ? <>
        <div style={formGrid}>
          <label style={label}>Accepted quotation / proforma invoice<select required value={form.quoteId} onChange={(e) => setForm({ ...form, quoteId: e.target.value })} style={input}>
            <option value="">Select accepted quotation</option>
            {quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quote_number} — {quote.customer?.[0]?.full_name || "Customer"}</option>)}
          </select></label>
          <label style={label}>Amount (R)<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={input} /></label>
          <label style={label}>Payment type<select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })} style={input}>{["Deposit", "Progress", "Balance", "Refund"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={label}>Method<select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} style={input}>{["EFT", "Cash", "Card", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={label}>Reference<input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} style={input} /></label>
          <label style={label}>Date<input required type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} style={input} /></label>
        </div>
        <label style={label}>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={input} /></label>
        <button disabled={saving} style={primaryButton}>{saving ? "Saving..." : "Record Payment"}</button>
        </> : <p style={muted}>Open this workspace to record a customer payment.</p>}
      </form>

      <section style={panel}>
        <h2>Payment Position</h2>
        {loading ? <p>Loading...</p> : quotes.map((quote) => {
          const paid = paidByQuote[quote.id] || 0;
          const balance = Number(quote.total_amount) - paid;
          return <article key={quote.id} style={row}><div><strong>{quote.quote_number}</strong><p style={muted}>{quote.customer?.[0]?.full_name || "Customer"}</p></div><div style={amounts}><span>Total: R{Number(quote.total_amount).toFixed(2)}</span><span>Paid: R{paid.toFixed(2)}</span><strong style={{ color: balance <= 0 ? "#2E6B3E" : "#9A5A19" }}>Balance: R{Math.max(0, balance).toFixed(2)}</strong></div></article>;
        })}
      </section>

      <section style={panel}>
        <h2>Payment History</h2>
        {payments.length === 0 ? <p style={muted}>No payments recorded.</p> : payments.map((payment) => (
          <article key={payment.id} style={historyRow}>
            <div>
              <strong>{payment.receipt_number}</strong>
              <p style={muted}>{payment.quote?.[0]?.quote_number} · {payment.quote?.[0]?.customer?.[0]?.full_name || "Customer"}</p>
            </div>
            <div style={amounts}>
              <span>{payment.paid_at}</span>
              <span>{payment.payment_method}</span>
              <strong>R{Number(payment.amount).toFixed(2)}</strong>
              <button type="button" onClick={() => void resendReceipt(payment.id)} style={smallButton}>Resend Receipt</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

const page: React.CSSProperties = { minHeight: "100vh", background: "#F4EFE6", padding: "40px 7%", fontFamily: "Georgia, 'Times New Roman', serif", color: "#14110D" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 28 };
const title: React.CSSProperties = { fontSize: 42, margin: "0 0 8px" };
const muted: React.CSSProperties = { color: "#6C5A45", margin: "6px 0" };
const nav: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };
const linkButton: React.CSSProperties = { padding: "11px 16px", border: "1px solid #8D744D", color: "#14110D", textDecoration: "none", background: "#FFF9EF" };
const panel: React.CSSProperties = { background: "#FFF9EF", border: "1px solid #D8C29B", padding: 24, marginBottom: 24 };
const workspaceHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const workspaceTitle: React.CSSProperties = { margin: 0 };
const workspacePill: React.CSSProperties = { border: "1px solid #C8A96A", borderRadius: "999px", background: "#FFF9EF", color: "#14110D", padding: "5px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 };
const label: React.CSSProperties = { display: "grid", gap: 7, fontWeight: 700, marginBottom: 14 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #BBA57E", background: "white", padding: 11, font: "inherit" };
const primaryButton: React.CSSProperties = { border: 0, background: "#151111", color: "white", padding: "12px 18px", fontWeight: 700, cursor: "pointer" };
const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", padding: "16px 0", borderBottom: "1px solid #E4D6BE" };
const amounts: React.CSSProperties = { display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" };
const historyRow: React.CSSProperties = { ...row, padding: "13px 0" };
const smallButton: React.CSSProperties = { border: "1px solid #8D744D", background: "transparent", padding: "8px 10px", cursor: "pointer", fontWeight: 700 };
