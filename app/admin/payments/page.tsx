"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import PaginationControls from "@/components/admin/PaginationControls";
import jsPDF from "jspdf";

type Quote = {
  id: string;
  quote_number: string;
  total_amount: number;
  deposit_amount: number;
  customer: Related<{ full_name: string }>;
};

type Related<T> = T | T[] | null;

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
  quote: Related<{ quote_number: string; total_amount: number; customer: Related<{ full_name: string }> }>;
};

function first<T>(value: Related<T> | undefined) {
  return Array.isArray(value) ? value[0] || null : value || null;
}

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
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [updating, setUpdating] = useState(false);
  const [isPaymentWorkspaceOpen, setIsPaymentWorkspaceOpen] = useState(false);
  const [positionPage, setPositionPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [positionPageSize, setPositionPageSize] = useState(5);
  const [historyPageSize, setHistoryPageSize] = useState(5);

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

  const paginatedQuotes = quotes.slice((positionPage - 1) * positionPageSize, positionPage * positionPageSize);
  const paginatedPayments = payments.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize);

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

  function startEditingPayment(payment: Payment) {
    setEditingPayment(payment);
    setEditForm({
      quoteId: payment.quote_id,
      amount: String(payment.amount),
      paymentType: payment.payment_type,
      paymentMethod: payment.payment_method,
      reference: payment.reference || "",
      paidAt: payment.paid_at,
      notes: payment.notes || "",
    });
  }

  async function updatePayment(event: React.FormEvent) {
    event.preventDefault();
    if (!editingPayment || Number(editForm.amount) <= 0) return;
    setUpdating(true);
    const { error } = await supabase
      .from("poloko_payments")
      .update({
        amount: Number(editForm.amount),
        payment_type: editForm.paymentType,
        payment_method: editForm.paymentMethod,
        reference: editForm.reference || null,
        paid_at: editForm.paidAt,
        notes: editForm.notes || null,
      })
      .eq("id", editingPayment.id);
    setUpdating(false);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingPayment(null);
    await fetchData();
    alert("Payment updated. Download the receipt again to use the new details.");
  }

  function formatMoney(value: number) {
    return `R${Number(value || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function loadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Unable to load the receipt logo.");
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Unable to prepare the receipt logo."));
      reader.readAsDataURL(blob);
    });
  }

  async function downloadReceipt(payment: Payment) {
    try {
      const quote = first(payment.quote);
      const customer = first(quote?.customer);
      const totalPaid = paidByQuote[payment.quote_id] || 0;
      const balance = Math.max(0, Number(quote?.total_amount || 0) - totalPaid);
      const doc = new jsPDF("p", "mm", "a4");
      const logo = await loadImageAsBase64("/poloko-tombstones-logo.png");

      doc.setFillColor(20, 17, 13);
      doc.rect(0, 0, 210, 44, "F");
      doc.addImage(logo, "PNG", 15, 6, 32, 32, undefined, "FAST");
      doc.setTextColor(200, 169, 106);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("POLOKO TOMBSTONES", 52, 20);
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.text("A Legacy Carved in Stone", 52, 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text("Garankuwa: 073 163 3836  |  Ganyesa: 083 928 0868", 52, 35);

      doc.setTextColor(20, 17, 13);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text("PAYMENT RECEIPT", 195, 58, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Receipt No: ${payment.receipt_number}`, 195, 66, { align: "right" });
      doc.text(`Payment date: ${payment.paid_at}`, 195, 72, { align: "right" });

      doc.setFillColor(244, 239, 230);
      doc.roundedRect(15, 55, 82, 30, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(155, 116, 52);
      doc.text("RECEIVED FROM", 20, 63);
      doc.setTextColor(20, 17, 13);
      doc.setFontSize(11);
      doc.text(customer?.full_name || "Customer", 20, 71);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Quotation: ${quote?.quote_number || "Not supplied"}`, 20, 78);

      const tableY = 100;
      doc.setFillColor(20, 17, 13);
      doc.rect(15, tableY, 180, 10, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      ["PAYMENT TYPE", "METHOD", "REFERENCE", "AMOUNT RECEIVED"].forEach((heading, index) => doc.text(heading, [18, 63, 102, 151][index], tableY + 6.5));
      doc.setFillColor(250, 247, 239);
      doc.rect(15, tableY + 10, 180, 15, "F");
      doc.setDrawColor(218, 194, 155);
      doc.rect(15, tableY + 10, 180, 15);
      doc.setTextColor(20, 17, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(payment.payment_type, 18, tableY + 19);
      doc.text(payment.payment_method, 63, tableY + 19);
      doc.text(payment.reference || "Not supplied", 102, tableY + 19);
      doc.setFont("helvetica", "bold");
      doc.text(formatMoney(payment.amount), 192, tableY + 19, { align: "right" });

      const summaryY = 145;
      doc.setDrawColor(218, 194, 155);
      doc.roundedRect(117, summaryY, 78, 42, 2, 2);
      [["Quotation total", quote?.total_amount || 0], ["Total paid to date", totalPaid], ["Remaining balance", balance]].forEach(([label, value], index) => {
        const lineY = summaryY + 9 + index * 10;
        doc.setFont("helvetica", index === 2 ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(index === 2 ? 155 : 20, index === 2 ? 116 : 17, index === 2 ? 52 : 13);
        doc.text(String(label), 122, lineY);
        doc.text(formatMoney(Number(value)), 190, lineY, { align: "right" });
      });

      doc.setTextColor(155, 116, 52);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("CONFIRMATION", 15, 205);
      doc.setTextColor(20, 17, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text(doc.splitTextToSize("Thank you. This document confirms receipt of the payment shown above. Please retain it for your records.", 175), 15, 213);
      if (payment.notes) {
        doc.setTextColor(155, 116, 52);
        doc.setFont("helvetica", "bold");
        doc.text("NOTES", 15, 234);
        doc.setTextColor(20, 17, 13);
        doc.setFont("helvetica", "normal");
        doc.text(doc.splitTextToSize(payment.notes, 175), 15, 242);
      }
      doc.setDrawColor(200, 169, 106);
      doc.line(15, 275, 195, 275);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Thank you for choosing Poloko Tombstones.", 105, 282, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setTextColor(155, 116, 52);
      doc.text("POLOKO TOMBSTONES  |  A LEGACY CARVED IN STONE", 105, 289, { align: "center" });
      doc.save(`${payment.receipt_number}-payment-receipt.pdf`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Receipt could not be downloaded.");
    }
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
            {quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.quote_number} — {first(quote.customer)?.full_name || "Customer"}</option>)}
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
        {loading ? <p>Loading...</p> : paginatedQuotes.map((quote) => {
          const paid = paidByQuote[quote.id] || 0;
          const balance = Number(quote.total_amount) - paid;
          return <article key={quote.id} style={row}><div><strong>{quote.quote_number}</strong><p style={muted}>{first(quote.customer)?.full_name || "Customer"}</p></div><div style={amounts}><span>Total: R{Number(quote.total_amount).toFixed(2)}</span><span>Paid: R{paid.toFixed(2)}</span><strong style={{ color: balance <= 0 ? "#2E6B3E" : "#9A5A19" }}>Balance: R{Math.max(0, balance).toFixed(2)}</strong></div></article>;
        })}
        <PaginationControls itemLabel="payment positions" page={positionPage} pageSize={positionPageSize} totalItems={quotes.length} onPageChange={setPositionPage} onPageSizeChange={(pageSize) => { setPositionPageSize(pageSize); setPositionPage(1); }} />
      </section>

      <section style={panel}>
        <h2>Payment History</h2>
        {payments.length === 0 ? <p style={muted}>No payments recorded.</p> : paginatedPayments.map((payment) => (
          <article key={payment.id} style={historyRow}>
            <div>
              <strong>{payment.receipt_number}</strong>
              <p style={muted}>{first(payment.quote)?.quote_number || "Quotation not supplied"} · {first(first(payment.quote)?.customer)?.full_name || "Customer"}</p>
            </div>
            <div style={amounts}>
              <span>{payment.paid_at}</span>
              <span>{payment.payment_method}</span>
              <strong>R{Number(payment.amount).toFixed(2)}</strong>
              <button type="button" onClick={() => startEditingPayment(payment)} style={smallButton}>Edit Payment</button>
              <button type="button" onClick={() => void downloadReceipt(payment)} style={smallButton}>Download Receipt</button>
              <button type="button" onClick={() => void resendReceipt(payment.id)} style={smallButton}>Resend Receipt</button>
            </div>
          </article>
        ))}
        <PaginationControls itemLabel="payment history records" page={historyPage} pageSize={historyPageSize} totalItems={payments.length} onPageChange={setHistoryPage} onPageSizeChange={(pageSize) => { setHistoryPageSize(pageSize); setHistoryPage(1); }} />
      </section>

      {editingPayment ? <form onSubmit={updatePayment} style={panel}>
        <div style={workspaceHeader}>
          <div><h2 style={workspaceTitle}>Edit Payment</h2><p style={muted}>Receipt {editingPayment.receipt_number}</p></div>
          <button type="button" onClick={() => setEditingPayment(null)} style={smallButton}>Cancel</button>
        </div>
        <div style={formGrid}>
          <label style={label}>Amount (R)<input required min="0.01" step="0.01" type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })} style={input} /></label>
          <label style={label}>Payment type<select value={editForm.paymentType} onChange={(e) => setEditForm({ ...editForm, paymentType: e.target.value })} style={input}>{["Deposit", "Progress", "Balance", "Refund"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={label}>Method<select value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })} style={input}>{["EFT", "Cash", "Card", "Other"].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label style={label}>Reference<input value={editForm.reference} onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })} style={input} /></label>
          <label style={label}>Payment date<input required type="date" value={editForm.paidAt} onChange={(e) => setEditForm({ ...editForm, paidAt: e.target.value })} style={input} /></label>
        </div>
        <label style={label}>Notes<textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} style={input} /></label>
        <button disabled={updating} style={primaryButton}>{updating ? "Saving..." : "Save Payment Changes"}</button>
      </form> : null}
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
