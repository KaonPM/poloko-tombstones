"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";

type Lead = {
  id: string;
  interest_type: string;
  message: string | null;
  customer_id: string;
  customer:
    | {
        full_name: string;
        phone: string;
        email: string | null;
      }[]
    | null;
};

type Quote = {
  id: string;
  quote_number: string;
  customer_id: string;
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  status: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

type Customer = {
  full_name: string;
  phone: string | null;
  email: string | null;
};

type StoredQuoteItem = QuoteItem & { total_price: number };
type DocumentKind = "quotation" | "proforma";

type QuoteItem = {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
};

const quoteStatuses = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

function AdminQuotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadFromUrl = searchParams.get("lead");

  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailingDocumentKey, setEmailingDocumentKey] = useState<string | null>(null);

  const [item, setItem] = useState<QuoteItem>({
    item_name: "",
    description: "",
    quantity: 1,
    unit_price: 0,
  });

  const [depositPercentage, setDepositPercentage] = useState(50);
  const [notes, setNotes] = useState("Quote valid for 30 days.");

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("poloko_leads")
      .select(
        `
        id,
        interest_type,
        message,
        customer_id,
        customer:poloko_customers (
          full_name,
          phone,
          email
        )
      `
      )
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    const fetchedLeads = (data as unknown as Lead[]) || [];
    setLeads(fetchedLeads);

    if (leadFromUrl) {
      const matchingLead = fetchedLeads.find((lead) => lead.id === leadFromUrl);

      if (matchingLead) {
        setSelectedLeadId(matchingLead.id);
        setItem({
          item_name: matchingLead.interest_type || "",
          description: matchingLead.message || "",
          quantity: 1,
          unit_price: 0,
        });
      }
    }
  }, [leadFromUrl]);

  const fetchQuotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("poloko_quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setQuotes(data || []);
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
      await Promise.all([fetchLeads(), fetchQuotes()]);
    }

    void checkSession();
  }, [fetchLeads, fetchQuotes, router]);

  function generateQuoteNumber() {
    const year = new Date().getFullYear();
    const number = String(Date.now()).slice(-5);
    return `PT-${year}-${number}`;
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();

    const lead = leads.find((leadItem) => leadItem.id === selectedLeadId);

    if (!lead) {
      alert("Please select a lead.");
      return;
    }

    if (!item.item_name || item.unit_price <= 0 || item.quantity <= 0) {
      alert("Please complete the quote item, quantity and price.");
      return;
    }

    const totalAmount = item.quantity * item.unit_price;
    const depositAmount = totalAmount * (depositPercentage / 100);
    const balanceAmount = totalAmount - depositAmount;
    const quoteNumber = generateQuoteNumber();

    setSaving(true);

    const { data: quote, error: quoteError } = await supabase
      .from("poloko_quotes")
      .insert({
        quote_number: quoteNumber,
        customer_id: lead.customer_id,
        lead_id: lead.id,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        status: "Sent",
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        notes,
      })
      .select()
      .single();

    if (quoteError) {
      setSaving(false);
      alert(quoteError.message);
      return;
    }

    const { error: itemError } = await supabase
      .from("poloko_quote_items")
      .insert({
        quote_id: quote.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: totalAmount,
      });

    if (itemError) {
      setSaving(false);
      alert(itemError.message);
      return;
    }

    await supabase
      .from("poloko_leads")
      .update({ status: "Quote Sent" })
      .eq("id", lead.id);

    setSaving(false);
    alert("Quote created successfully.");

    setSelectedLeadId("");
    setItem({ item_name: "", description: "", quantity: 1, unit_price: 0 });
    setDepositPercentage(50);
    setNotes("Quote valid for 30 days.");

    fetchQuotes();
    fetchLeads();
  }

  function formatMoney(value: number) {
    return `R${Number(value || 0).toLocaleString("en-ZA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function buildQuotePdf(quote: Quote, documentKind: DocumentKind) {
    const doc = new jsPDF("p", "mm", "a4");
    const logoUrl = "/poloko-tombstones-logo.png";
    const logo = await loadImageAsBase64(logoUrl);
    const [customerResult, itemsResult] = await Promise.all([
      supabase.from("poloko_customers").select("full_name,phone,email").eq("id", quote.customer_id).single(),
      supabase.from("poloko_quote_items").select("item_name,description,quantity,unit_price,total_price").eq("quote_id", quote.id),
    ]);
    const customer = (customerResult.data as Customer | null) || { full_name: "Customer", phone: null, email: null };
    const items = (itemsResult.data as StoredQuoteItem[] | null) || [];
    const title = documentKind === "quotation" ? "FORMAL QUOTATION" : "PROFORMA INVOICE";
    const reference = documentKind === "quotation" ? quote.quote_number : `PI-${quote.quote_number.replace(/^PT-/, "")}`;
    const date = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

    doc.setFillColor(20, 17, 13);
    doc.rect(0, 0, 210, 44, "F");
    doc.addImage(logo, "PNG", 15, 8, 27, 27, undefined, "FAST");
    doc.setTextColor(200, 169, 106);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("POLOKO TOMBSTONES", 48, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.text("A Legacy Carved in Stone", 48, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Garankuwa: 073 163 3836  |  Ganyesa: 083 928 0868", 48, 35);
    doc.setTextColor(20, 17, 13);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(title, 195, 58, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`${documentKind === "quotation" ? "Quote" : "Proforma"} No: ${reference}`, 195, 66, { align: "right" });
    doc.text(`Date: ${date}`, 195, 72, { align: "right" });
    if (documentKind === "quotation") doc.text(`Valid until: ${quote.valid_until || "30 days"}`, 195, 78, { align: "right" });

    doc.setFillColor(244, 239, 230);
    doc.roundedRect(15, 55, 78, 35, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(155, 116, 52);
    doc.text("PREPARED FOR", 20, 63);
    doc.setTextColor(20, 17, 13);
    doc.setFontSize(11);
    doc.text(customer.full_name, 20, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (customer.phone) doc.text(customer.phone, 20, 77);
    if (customer.email) doc.text(customer.email, 20, 83);

    const tableY = 102;
    const columns = [15, 32, 105, 128, 153, 195];
    doc.setFillColor(20, 17, 13);
    doc.rect(15, tableY, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    ["ITEM", "DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"].forEach((heading, index) => {
      doc.text(heading, columns[index] + 3, tableY + 6.5);
    });
    let y = tableY + 10;
    const printableItems = items.length ? items : [{ item_name: "Memorial package", description: quote.notes || "Custom tombstone quotation", quantity: 1, unit_price: Number(quote.total_amount), total_price: Number(quote.total_amount) }];
    printableItems.forEach((item, index) => {
      const rowHeight = Math.max(13, doc.splitTextToSize(item.description || "-", 66).length * 4 + 6);
      doc.setFillColor(index % 2 ? 255 : 250, index % 2 ? 252 : 247, index % 2 ? 248 : 239);
      doc.rect(15, y, 180, rowHeight, "F");
      doc.setDrawColor(218, 194, 155);
      doc.rect(15, y, 180, rowHeight);
      doc.setTextColor(20, 17, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(item.item_name, 18, y + 6);
      doc.text(doc.splitTextToSize(item.description || "-", 66), 35, y + 6);
      doc.text(String(item.quantity), 108, y + 6);
      doc.text(formatMoney(Number(item.unit_price)), 131, y + 6);
      doc.text(formatMoney(Number(item.total_price)), 192, y + 6, { align: "right" });
      y += rowHeight;
    });

    const summaryY = y + 12;
    doc.setDrawColor(218, 194, 155);
    doc.roundedRect(117, summaryY, 78, documentKind === "quotation" ? 38 : 28, 2, 2);
    const summary = documentKind === "quotation"
      ? [["Total", quote.total_amount], ["Deposit required", quote.deposit_amount], ["Balance", quote.balance_amount]]
      : [["Total due", quote.total_amount], ["Deposit required", quote.deposit_amount]];
    summary.forEach(([label, value], index) => {
      const lineY = summaryY + 8 + index * 9;
      doc.setFont("helvetica", index === summary.length - 1 ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(index === summary.length - 1 ? 155 : 20, index === summary.length - 1 ? 116 : 17, index === summary.length - 1 ? 52 : 13);
      doc.text(String(label), 122, lineY);
      doc.text(formatMoney(Number(value)), 190, lineY, { align: "right" });
    });

    const detailsY = Math.max(summaryY + (documentKind === "quotation" ? 48 : 38), 185);
    doc.setTextColor(155, 116, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("BANKING DETAILS", 15, detailsY);
    doc.setTextColor(20, 17, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(["Account name: Poloko Tombstones (Pty) Ltd", "Bank: Capitec Business", "Account number: 1055336916", "Branch code: 250 066", `Reference: ${reference}`], 15, detailsY + 7);
    doc.setTextColor(155, 116, 52);
    doc.setFont("helvetica", "bold");
    doc.text("INSTALLATION", 112, detailsY);
    doc.setTextColor(20, 17, 13);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize("Free installation is included within our local service areas. Outside these areas, R10.00 per kilometre applies from our nearest service point. Long-distance installations may be quoted separately.", 82), 112, detailsY + 7);

    doc.setDrawColor(200, 169, 106);
    doc.line(15, 275, 195, 275);
    doc.setTextColor(20, 17, 13);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(documentKind === "quotation" ? "Thank you for considering Poloko Tombstones. This quotation is subject to the terms stated above." : "Payment confirms acceptance of this proforma invoice and our payment terms.", 105, 282, { align: "center", maxWidth: 175 });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(155, 116, 52);
    doc.text("POLOKO TOMBSTONES  |  A LEGACY CARVED IN STONE", 105, 289, { align: "center" });

    return doc;
  }

  async function downloadQuotePdf(quote: Quote) {
    const doc = await buildQuotePdf(quote, "quotation");
    doc.save(`${quote.quote_number}-quotation.pdf`);
  }

  async function downloadProformaPdf(quote: Quote) {
    const doc = await buildQuotePdf(quote, "proforma");
    doc.save(`${quote.quote_number}-proforma-invoice.pdf`);
  }

  async function emailQuotePdf(quote: Quote, documentKind: DocumentKind) {
    const documentKey = `${quote.id}-${documentKind}`;
    setEmailingDocumentKey(documentKey);
    try {
      const doc = await buildQuotePdf(quote, documentKind);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your admin session has expired.");
      const response = await fetch("/api/send-formal-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ quoteId: quote.id, pdfBase64, documentKind }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Quotation email failed.");
      if (!result.sent) { alert(result.reason); return; }
      if (documentKind === "quotation") {
        setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Sent" } : item));
      }
      alert(`${documentKind === "quotation" ? "Quotation" : "Proforma invoice"} emailed to ${result.email}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Quotation email failed.");
    } finally {
      setEmailingDocumentKey(null);
    }
  }

  async function loadImageAsBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load PDF image: ${url}`);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Unable to read PDF image: ${url}`));
      reader.readAsDataURL(blob);
    });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  async function updateQuoteStatus(id: string, status: string) {
    const { error } = await supabase
      .from("poloko_quotes")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setQuotes((current) =>
      current.map((quote) => (quote.id === id ? { ...quote, status } : quote))
    );
  }

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
  const selectedCustomer = selectedLead?.customer?.[0];

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
          <h1 style={title}>Quotes</h1>
          <p style={text}>Create branded Poloko Tombstones quotes.</p>
        </div>

        <div style={headerActions}>
          <button onClick={() => router.push("/admin")} style={secondaryButton}>
            Dashboard
          </button>

          <button onClick={() => router.push("/admin/leads")} style={secondaryButton}>
            Leads
          </button>

          <button onClick={logout} style={deleteButton}>
            Logout
          </button>
        </div>
      </div>

      <form onSubmit={createQuote} style={formBox}>
        <h2 style={sectionTitle}>Create Quote</h2>

        <select
          value={selectedLeadId}
          onChange={(e) => {
            const newLeadId = e.target.value;
            setSelectedLeadId(newLeadId);

            const selected = leads.find((lead) => lead.id === newLeadId);

            if (selected) {
              setItem({
                item_name: selected.interest_type || "",
                description: selected.message || "",
                quantity: 1,
                unit_price: 0,
              });
            }
          }}
          required
          style={input}
        >
          <option value="">Select lead</option>
          {leads.map((lead) => {
            const customer = lead.customer?.[0];

            return (
              <option key={lead.id} value={lead.id}>
                {customer?.full_name || "Unknown Customer"} - {lead.interest_type}
              </option>
            );
          })}
        </select>

        {selectedLead ? (
          <div style={leadPreview}>
            <p>
              <strong>Customer:</strong> {selectedCustomer?.full_name || "Unknown Customer"}
            </p>
            <p>
              <strong>Phone:</strong> {selectedCustomer?.phone || "Not provided"}
            </p>
            <p>
              <strong>Email:</strong> {selectedCustomer?.email || "Not provided"}
            </p>
            <p>
              <strong>Original Request:</strong> {selectedLead.message || "None"}
            </p>
          </div>
        ) : null}

        <input
          placeholder="Item name, e.g. Double Headstone"
          value={item.item_name}
          onChange={(e) => setItem({ ...item, item_name: e.target.value })}
          required
          style={input}
        />

        <textarea
          placeholder="Description"
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
          style={textarea}
        />

        <input
          type="number"
          placeholder="Quantity"
          value={item.quantity}
          onChange={(e) => setItem({ ...item, quantity: Number(e.target.value) })}
          required
          style={input}
        />

        <input
          type="number"
          placeholder="Unit price"
          value={item.unit_price}
          onChange={(e) => setItem({ ...item, unit_price: Number(e.target.value) })}
          required
          style={input}
        />

        <input
          type="number"
          placeholder="Deposit percentage"
          value={depositPercentage}
          onChange={(e) => setDepositPercentage(Number(e.target.value))}
          style={input}
        />

        <textarea
          placeholder="Quote notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={textarea}
        />

        <div style={summaryBox}>
          <p>
            <strong>Total:</strong> R{Number(item.quantity * item.unit_price || 0).toFixed(2)}
          </p>
          <p>
            <strong>Deposit:</strong> R
            {Number((item.quantity * item.unit_price || 0) * (depositPercentage / 100)).toFixed(2)}
          </p>
          <p>
            <strong>Balance:</strong> R
            {Number(
              (item.quantity * item.unit_price || 0) -
                (item.quantity * item.unit_price || 0) * (depositPercentage / 100)
            ).toFixed(2)}
          </p>
        </div>

        <button type="submit" disabled={saving} style={button}>
          {saving ? "Saving Quote..." : "Create Quote"}
        </button>
      </form>

      <section style={grid}>
        {quotes.map((quote) => (
          <div key={quote.id} style={card}>
            <h3>{quote.quote_number}</h3>
            <label>
              Status
              <select
                value={quote.status}
                onChange={(event) =>
                  void updateQuoteStatus(quote.id, event.target.value)
                }
                style={input}
              >
                {quoteStatuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <p>Total: R{Number(quote.total_amount).toFixed(2)}</p>
            <p>Deposit: R{Number(quote.deposit_amount).toFixed(2)}</p>
            <p>Balance: R{Number(quote.balance_amount).toFixed(2)}</p>

            <button onClick={() => downloadQuotePdf(quote)} style={button}>
              Download Quotation
            </button>
            <button
              onClick={() => void emailQuotePdf(quote, "quotation")}
              disabled={emailingDocumentKey === `${quote.id}-quotation`}
              style={secondaryButton}
            >
              {emailingDocumentKey === `${quote.id}-quotation` ? "Sending..." : "Email Quotation"}
            </button>
            {quote.status === "Accepted" && (
              <>
                <button onClick={() => downloadProformaPdf(quote)} style={button}>
                  Download Proforma Invoice
                </button>
                <button
                  onClick={() => void emailQuotePdf(quote, "proforma")}
                  disabled={emailingDocumentKey === `${quote.id}-proforma`}
                  style={secondaryButton}
                >
                  {emailingDocumentKey === `${quote.id}-proforma` ? "Sending..." : "Email Proforma Invoice"}
                </button>
              </>
            )}
            {quote.status === "Accepted" && (
              <Link href="/admin/orders" style={orderLink}>
                Start Production
              </Link>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}

export default function AdminQuotesPage() {
  return (
    <Suspense
      fallback={
        <main style={page}>
          <p style={text}>Loading quotes...</p>
        </main>
      }
    >
      <AdminQuotesPageContent />
    </Suspense>
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

const sectionTitle: React.CSSProperties = {
  fontSize: "24px",
  margin: 0,
};

const text: React.CSSProperties = {
  color: "#6C5A45",
};

const formBox: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  maxWidth: "760px",
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "24px",
  marginBottom: "36px",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  border: "1px solid #D8C29B",
  background: "#FFFDF7",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: "100px",
};

const leadPreview: React.CSSProperties = {
  background: "#F4EFE6",
  border: "1px solid #D8C29B",
  padding: "14px",
  color: "#2B241B",
};

const summaryBox: React.CSSProperties = {
  background: "#F4EFE6",
  border: "1px solid #D8C29B",
  padding: "14px",
  color: "#2B241B",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "20px",
};

const card: React.CSSProperties = {
  background: "#FFF9EF",
  border: "1px solid #D8C29B",
  padding: "20px",
};

const orderLink: React.CSSProperties = {
  display: "inline-block",
  marginLeft: "10px",
  padding: "12px 16px",
  background: "#2E6B3E",
  color: "white",
  textDecoration: "none",
  fontWeight: 700,
};
