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
  total_amount: number;
  deposit_amount: number;
  balance_amount: number;
  status: string;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
};

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
  const [emailingQuoteId, setEmailingQuoteId] = useState<string | null>(null);

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

  async function buildQuotePdf(quote: Quote) {
    const doc = new jsPDF("p", "mm", "a4");
    const logoUrl = "/poloko-tombstones-logo.png";
    const logo = await loadImageAsBase64(logoUrl);
    doc.addImage(logo, "PNG", 60, 80, 90, 90, undefined, "FAST");
    doc.addImage(logo, "PNG", 15, 12, 32, 32, undefined, "FAST");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("POLOKO TOMBSTONES", 55, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("A legacy carved in stone.", 55, 29);
    doc.text("Email: info@polokotombstones.co.za", 55, 35);
    doc.text("Quote Document", 150, 22);

    doc.line(15, 48, 195, 48);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Quote No: ${quote.quote_number}`, 15, 60);
    doc.text(`Status: ${quote.status}`, 15, 68);
    doc.text(`Valid Until: ${quote.valid_until || "30 days"}`, 15, 76);

    doc.text("Financial Summary", 15, 100);

    doc.setFont("helvetica", "normal");
    doc.text(`Total Amount: R${Number(quote.total_amount).toFixed(2)}`, 15, 112);
    doc.text(`Deposit Required: R${Number(quote.deposit_amount).toFixed(2)}`, 15, 120);
    doc.text(`Balance Due: R${Number(quote.balance_amount).toFixed(2)}`, 15, 128);

    doc.setFont("helvetica", "bold");
    doc.text("Notes", 15, 148);

    doc.setFont("helvetica", "normal");
    doc.text(quote.notes || "Quote valid for 30 days.", 15, 158, {
      maxWidth: 170,
    });

    doc.setFontSize(9);
    doc.text("Thank you for choosing Poloko Tombstones.", 15, 280);

    const total = Number(quote.total_amount);
    const deposit = Number(quote.deposit_amount);
    const balance = Number(quote.balance_amount);
    const monthlyThree = balance / 2;
    const monthlySix = balance / 5;

    doc.addPage();
    doc.setFillColor(242, 239, 229);
    doc.rect(0, 0, 210, 297, "F");

    doc.addImage(logo, "PNG", 82, 10, 46, 46, undefined, "FAST");

    doc.setTextColor(30, 29, 27);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PAYMENT OPTIONS", 105, 68, { align: "center" });
    doc.setDrawColor(201, 155, 54);
    doc.line(76, 73, 134, 73);

    const drawOption = (
      x: number,
      y: number,
      heading: string,
      lines: string[]
    ) => {
      doc.setDrawColor(201, 155, 54);
      doc.roundedRect(x, y, 85, 35, 4, 4);
      doc.setTextColor(183, 137, 46);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(heading, x + 5, y + 8);
      doc.setTextColor(30, 29, 27);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      lines.forEach((line, index) => doc.text(line, x + 5, y + 17 + index * 6));
    };

    drawOption(15, 82, "OPTION 1 - FULL PAYMENT", [
      "Pay the full amount upfront.",
      `Total: R${total.toFixed(2)}`,
    ]);
    drawOption(110, 82, "OPTION 2 - 50 / 50", [
      `Deposit: R${deposit.toFixed(2)}`,
      `Final: R${balance.toFixed(2)} on completion`,
    ]);
    drawOption(15, 123, "OPTION 3 - LAY-BY (3 PAYMENTS)", [
      `Deposit: R${deposit.toFixed(2)}`,
      `Then: 2 x R${monthlyThree.toFixed(2)} monthly`,
    ]);
    drawOption(110, 123, "OPTION 4 - LAY-BY (6 PAYMENTS)", [
      `Deposit: R${deposit.toFixed(2)}`,
      `Then: 5 x R${monthlySix.toFixed(2)} monthly`,
    ]);

    doc.setTextColor(183, 137, 46);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("BANKING DETAILS", 15, 174);
    doc.line(15, 178, 195, 178);
    doc.setTextColor(30, 29, 27);
    doc.setFontSize(9);
    doc.text("BANK", 15, 187);
    doc.text("ACCOUNT NAME", 70, 187);
    doc.text("ACCOUNT NUMBER", 135, 187);
    doc.setFont("helvetica", "normal");
    doc.text("Capitec Business", 15, 193);
    doc.text("Poloko Tombstones", 70, 193);
    doc.text("1055336916", 135, 193);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNT TYPE", 15, 204);
    doc.text("REFERENCE", 70, 204);
    doc.text("PROOF OF PAYMENT", 135, 204);
    doc.setFont("helvetica", "normal");
    doc.text("Business Current", 15, 210);
    doc.text("Surname & Initials", 70, 210);
    doc.text("info@polokotombstones.co.za", 135, 210);

    doc.setDrawColor(201, 155, 54);
    doc.roundedRect(15, 222, 85, 45, 4, 4);
    doc.roundedRect(110, 222, 85, 45, 4, 4);
    doc.setFont("helvetica", "bold");
    doc.text("ACCEPTED PAYMENT METHODS", 20, 231);
    doc.text("TERMS & CONDITIONS", 115, 231);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(["- EFT / Bank Transfer", "- Cash deposit at a Capitec branch", "- In-store cash payment", "- Cards are not yet available"], 20, 239);
    doc.text(["- 50% deposit secures the order", "- Work starts after design approval", "- Installation upon full payment", "- Lay-by payments are due monthly", "- Payments and deposits are non-refundable"], 115, 239);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(
      "Payment towards this quotation confirms acceptance of these payment terms.",
      105,
      280,
      { align: "center" }
    );

    return doc;
  }

  async function downloadQuotePdf(quote: Quote) {
    const doc = await buildQuotePdf(quote);
    doc.save(`${quote.quote_number}.pdf`);
  }

  async function emailQuotePdf(quote: Quote) {
    setEmailingQuoteId(quote.id);
    try {
      const doc = await buildQuotePdf(quote);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your admin session has expired.");
      const response = await fetch("/api/send-formal-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ quoteId: quote.id, pdfBase64 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Quotation email failed.");
      if (!result.sent) { alert(result.reason); return; }
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Sent" } : item));
      alert(`Quotation emailed to ${result.email}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Quotation email failed.");
    } finally {
      setEmailingQuoteId(null);
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
              Download PDF
            </button>
            <button
              onClick={() => void emailQuotePdf(quote)}
              disabled={emailingQuoteId === quote.id}
              style={secondaryButton}
            >
              {emailingQuoteId === quote.id ? "Sending..." : "Email Quote"}
            </button>
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
