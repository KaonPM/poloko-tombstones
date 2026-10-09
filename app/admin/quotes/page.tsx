"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import PaginationControls from "@/components/admin/PaginationControls";

type Lead = {
  id: string;
  interest_type: string;
  message: string | null;
  customer_id: string;
  customer: Related<{ full_name: string; phone: string | null; email: string | null }>;
};

type Related<T> = T | T[] | null;

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
  document_type: "Memorial" | "Raw Materials";
  created_at: string;
};

type Customer = {
  full_name: string;
  phone: string | null;
  email: string | null;
};

type Product = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  price: string | null;
  product_code: string;
};

function first<T>(value: Related<T> | undefined) {
  return Array.isArray(value) ? value[0] : value || null;
}

type StoredQuoteItem = Omit<QuoteItem, "material" | "dimensions" | "square_meters" | "kilograms"> & { total_price: number; material: string | null; dimensions: string | null; square_meters: number | null; kilograms: number | null };
type DocumentKind = "quotation" | "proforma";

type QuoteItem = {
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  material: string;
  dimensions: string;
  square_meters: number | "";
  kilograms: number | "";
};

const quoteStatuses = ["Draft", "Sent", "Accepted", "Declined", "Expired"];

function AdminQuotesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadFromUrl = searchParams.get("lead");

  const [checking, setChecking] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [captureMode, setCaptureMode] = useState<"lead" | "manual">("lead");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [emailingDocumentKey, setEmailingDocumentKey] = useState<string | null>(null);
  const [isQuoteWorkspaceOpen, setIsQuoteWorkspaceOpen] = useState(false);
  const [quotePage, setQuotePage] = useState(1);
  const [quotePageSize, setQuotePageSize] = useState(5);

  const emptyItem = (): QuoteItem => ({
    item_name: "",
    description: "",
    quantity: 1,
    unit_price: 0,
    material: "",
    dimensions: "",
    square_meters: "",
    kilograms: "",
  });
  const [items, setItems] = useState<QuoteItem[]>([emptyItem()]);

  const [documentType, setDocumentType] = useState<"Memorial" | "Raw Materials">("Memorial");
  const [depositPercentage, setDepositPercentage] = useState(50);
  const [notes, setNotes] = useState("Quote valid for 30 days.");
  const [manualCustomer, setManualCustomer] = useState({ fullName: "", phone: "", email: "" });

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
        setItems([{
          item_name: matchingLead.interest_type || "",
          description: matchingLead.message || "",
          quantity: 1,
          unit_price: 0,
          material: "",
          dimensions: "",
          square_meters: "",
          kilograms: "",
        }]);
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

  const fetchProducts = useCallback(async () => {
    const { data, error } = await supabase
      .from("tombstone_products")
      .select("id,title,category,description,price,product_code")
      .eq("is_active", true)
      .order("title");
    if (error) {
      alert(error.message);
      return;
    }
    setProducts((data as Product[]) || []);
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
      await Promise.all([fetchLeads(), fetchQuotes(), fetchProducts()]);
    }

    void checkSession();
  }, [fetchLeads, fetchProducts, fetchQuotes, router]);

  function productPrice(value: string | null) {
    const parsed = Number((value || "").replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function selectFinishedProduct(productId: string) {
    setSelectedProductId(productId);
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setItems((current) => current.map((item, index) => index === 0 ? {
      ...item,
      item_name: product.title,
      description: [product.category, product.product_code, product.description].filter(Boolean).join(" — "),
      unit_price: productPrice(product.price),
    } : item));
  }

  function generateQuoteNumber() {
    const year = new Date().getFullYear();
    const number = String(Date.now()).slice(-5);
    return `PT-${year}-${number}`;
  }

  async function createQuote(e: React.FormEvent) {
    e.preventDefault();

    if (items.some((item) => !item.item_name.trim() || item.unit_price <= 0 || item.quantity <= 0)) {
      alert("Please complete every quotation item, quantity and price.");
      return;
    }

    let lead = leads.find((leadItem) => leadItem.id === selectedLeadId);
    if (captureMode === "lead" && !lead) {
      alert("Please select a customer enquiry.");
      return;
    }
    if (captureMode === "manual" && !manualCustomer.fullName.trim()) {
      alert("Please enter the customer's full name.");
      return;
    }

    const totalAmount = items.reduce((total, item) => total + item.quantity * item.unit_price, 0);
    const depositAmount = totalAmount * (depositPercentage / 100);
    const balanceAmount = totalAmount - depositAmount;
    setSaving(true);
    if (captureMode === "manual") {
      const { data: customer, error: customerError } = await supabase
        .from("poloko_customers")
        // Keep an empty value while the live schema still requires this column.
        // The form deliberately does not require a phone number or email address.
        .insert({ full_name: manualCustomer.fullName.trim(), phone: manualCustomer.phone.trim(), email: manualCustomer.email.trim() || null, location: null })
        .select("id, full_name, phone, email")
        .single();
      if (customerError || !customer) {
        setSaving(false);
        alert(customerError?.message || "Customer could not be saved.");
        return;
      }
      const { data: manualLead, error: leadError } = await supabase
        .from("poloko_leads")
        .insert({ customer_id: customer.id, interest_type: items[0].item_name, message: items.map((item) => item.description).filter(Boolean).join(" | ") || null, source: "Manual", status: "Quote Sent" })
        .select("id, customer_id")
        .single();
      if (leadError || !manualLead) {
        setSaving(false);
        alert(leadError?.message || "Customer enquiry could not be saved.");
        return;
      }
      lead = { id: manualLead.id, customer_id: manualLead.customer_id, interest_type: items[0].item_name, message: items.map((item) => item.description).filter(Boolean).join(" | ") || null, customer: [{ full_name: customer.full_name, phone: customer.phone, email: customer.email }] };
    }
    if (!lead) {
      setSaving(false);
      return;
    }
    const quoteNumber = generateQuoteNumber();

    const { data: quote, error: quoteError } = await supabase
      .from("poloko_quotes")
      .insert({
        quote_number: quoteNumber,
        customer_id: lead.customer_id,
        lead_id: lead.id,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        balance_amount: balanceAmount,
        document_type: documentType,
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
      .insert(items.map((item) => ({
        quote_id: quote.id,
        item_name: item.item_name.trim(),
        description: item.description.trim() || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        material: documentType === "Raw Materials" ? item.item_name.trim() : null,
        dimensions: documentType === "Raw Materials" ? item.dimensions.trim() || null : null,
        square_meters: documentType === "Raw Materials" && item.square_meters !== "" ? Number(item.square_meters) : null,
        kilograms: documentType === "Raw Materials" && item.kilograms !== "" ? Number(item.kilograms) : null,
      })));

    if (itemError) {
      // Do not leave a quote behind that can generate a misleading PDF with no
      // line items. In particular, this catches deployments where the raw
      // materials migration has not yet been applied.
      await supabase.from("poloko_quotes").delete().eq("id", quote.id);
      setSaving(false);
      alert(`Quotation items could not be saved. ${itemError.message}`);
      return;
    }

    await supabase
      .from("poloko_leads")
      .update({ status: "Quote Sent" })
      .eq("id", lead.id);

    setSaving(false);
    alert("Quote created successfully.");

    setSelectedLeadId("");
    setCaptureMode("lead");
    setManualCustomer({ fullName: "", phone: "", email: "" });
    setItems([emptyItem()]);
    setDocumentType("Memorial");
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
      supabase.from("poloko_quote_items").select("item_name,description,quantity,unit_price,total_price,material,dimensions,square_meters,kilograms").eq("quote_id", quote.id).order("created_at", { ascending: true }),
    ]);

    if (itemsResult.error) {
      alert(`The quotation items could not be loaded. ${itemsResult.error.message}`);
      return;
    }

    const customer = (customerResult.data as Customer | null) || { full_name: "Customer", phone: null, email: null };
    const items = (itemsResult.data as StoredQuoteItem[] | null) || [];
    if (!items.length) {
      alert("This quotation has no saved line items, so a document cannot be generated. Delete it and create it again after applying the raw-materials database migration.");
      return;
    }
    const title = documentKind === "quotation" ? "FORMAL QUOTATION" : "PROFORMA INVOICE";
    const isRawMaterials = quote.document_type === "Raw Materials";
    const reference = documentKind === "quotation" ? quote.quote_number : `PI-${quote.quote_number.replace(/^PT-/, "")}`;
    const date = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });

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
    doc.setFillColor(20, 17, 13);
    doc.rect(15, tableY, 180, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isRawMaterials ? 5.8 : 7.5);
    const rawColumnWidths = [27, 34, 25, 11, 12, 12, 23, 36];
    const rawColumnStarts = rawColumnWidths.reduce<number[]>((starts, _width, index) => {
      starts.push(index === 0 ? 15 : starts[index - 1] + rawColumnWidths[index - 1]);
      return starts;
    }, []);
    const columns = isRawMaterials ? rawColumnStarts : [15, 32, 105, 128, 153];
    const headings = isRawMaterials ? ["MATERIAL", "DESCRIPTION", "L X W X H", "QTY", "M2", "KG", "UNIT PRICE", "AMOUNT"] : ["ITEM", "DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT"];
    headings.forEach((heading, index) => {
      const width = isRawMaterials ? rawColumnWidths[index] : undefined;
      const alignment = isRawMaterials && index >= 3 ? "right" : "left";
      const x = alignment === "right" && width ? columns[index] + width - 3 : columns[index] + 3;
      doc.text(heading, x, tableY + 6.5, { align: alignment });
    });
    let y = tableY + 10;
    items.forEach((item, index) => {
      const itemNameLines = isRawMaterials ? [] : doc.splitTextToSize(item.item_name, 14);
      const descriptionLines = isRawMaterials ? [] : doc.splitTextToSize(item.description || "-", 66);
      const rawCellLines = isRawMaterials
        ? [
            doc.splitTextToSize(item.material || item.item_name, rawColumnWidths[0] - 6),
            doc.splitTextToSize(item.description || "-", rawColumnWidths[1] - 6),
            doc.splitTextToSize(item.dimensions || "-", rawColumnWidths[2] - 6),
          ]
        : [];
      const rowHeight = isRawMaterials
        ? Math.max(13, Math.max(...rawCellLines.map((lines) => lines.length)) * 3.5 + 6)
        : Math.max(13, Math.max(itemNameLines.length, descriptionLines.length) * 4 + 6);
      doc.setFillColor(index % 2 ? 255 : 250, index % 2 ? 252 : 247, index % 2 ? 248 : 239);
      doc.rect(15, y, 180, rowHeight, "F");
      doc.setDrawColor(218, 194, 155);
      doc.rect(15, y, 180, rowHeight);
      doc.setTextColor(20, 17, 13);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(isRawMaterials ? 6.5 : 8);
      if (isRawMaterials) {
        rawCellLines.forEach((lines, cellIndex) => doc.text(lines, rawColumnStarts[cellIndex] + 3, y + 5));
        const rawValues = [
          String(item.quantity),
          item.square_meters === null ? "-" : Number(item.square_meters).toFixed(3),
          item.kilograms === null ? "-" : Number(item.kilograms).toFixed(1),
          formatMoney(Number(item.unit_price)),
          formatMoney(Number(item.total_price)),
        ];
        rawValues.forEach((value, valueIndex) => {
          const columnIndex = valueIndex + 3;
          doc.text(value, rawColumnStarts[columnIndex] + rawColumnWidths[columnIndex] - 3, y + 6, { align: "right" });
        });
      } else {
        doc.text(itemNameLines, 18, y + 6);
        doc.text(descriptionLines, 35, y + 6);
        doc.text(String(item.quantity), 108, y + 6);
        doc.text(formatMoney(Number(item.unit_price)), 131, y + 6);
        doc.text(formatMoney(Number(item.total_price)), 192, y + 6, { align: "right" });
      }
      y += rowHeight;
    });

    const summaryY = y + 12;
    doc.setDrawColor(218, 194, 155);
    const summaryHeight = documentKind === "quotation" ? 52 : 42;
    doc.roundedRect(117, summaryY, 78, summaryHeight, 2, 2);
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
    doc.setDrawColor(218, 194, 155);
    doc.line(122, summaryY + (documentKind === "quotation" ? 33 : 24), 190, summaryY + (documentKind === "quotation" ? 33 : 24));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(155, 116, 52);
    doc.text("PAYMENT TERMS", 122, summaryY + (documentKind === "quotation" ? 39 : 30));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.setTextColor(20, 17, 13);
    doc.text(documentKind === "quotation" ? "50% deposit secures the order. Valid for 30 days." : "50% deposit secures the order.", 122, summaryY + (documentKind === "quotation" ? 45 : 36), { maxWidth: 65 });

    const detailsY = Math.max(summaryY + summaryHeight + 10, 185);
    doc.setTextColor(155, 116, 52);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("BANKING DETAILS", 15, detailsY);
    doc.setTextColor(20, 17, 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(["Account name: Poloko Tombstones (Pty) Ltd", "Bank: Capitec Business", "Account number: 1055336916", "Branch code: 250 066", `Reference: ${reference}`], 15, detailsY + 7);
    doc.text("VAT: Not registered - no VAT charged", 15, detailsY + 42);
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
    if (!doc) return;
    doc.save(`${quote.quote_number}-quotation.pdf`);
  }

  async function downloadProformaPdf(quote: Quote) {
    const doc = await buildQuotePdf(quote, "proforma");
    if (!doc) return;
    doc.save(`${quote.quote_number}-proforma-invoice.pdf`);
  }

  async function emailQuotePdf(quote: Quote, documentKind: DocumentKind) {
    const documentKey = `${quote.id}-${documentKind}`;
    setEmailingDocumentKey(documentKey);
    try {
      const doc = await buildQuotePdf(quote, documentKind);
      if (!doc) return;
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

  async function deleteQuote(quote: Quote) {
    const confirmed = confirm(
      `Delete ${quote.quote_number}? This permanently removes the quotation and its line items.`,
    );

    if (!confirmed) return;

    const { error: itemError } = await supabase
      .from("poloko_quote_items")
      .delete()
      .eq("quote_id", quote.id);

    if (itemError) {
      alert(itemError.message);
      return;
    }

    const { error } = await supabase
      .from("poloko_quotes")
      .delete()
      .eq("id", quote.id);

    if (error) {
      alert(error.message);
      return;
    }

    setQuotes((current) => current.filter((item) => item.id !== quote.id));
    alert(`${quote.quote_number} deleted.`);
  }

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
  const selectedCustomer = first(selectedLead?.customer);
  const paginatedQuotes = quotes.slice((quotePage - 1) * quotePageSize, quotePage * quotePageSize);

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
        <div style={workspaceHeader}>
          <h2 style={sectionTitle}>Create Formal Quotation</h2>
          <button
            type="button"
            aria-expanded={isQuoteWorkspaceOpen}
            onClick={() => setIsQuoteWorkspaceOpen((open) => !open)}
            style={workspacePill}
          >
            {isQuoteWorkspaceOpen ? "Close form" : "Open form"}
          </button>
        </div>

        {isQuoteWorkspaceOpen ? <>

        <label style={formLabel}>
          What are you quoting for?
          <select value={documentType} onChange={(e) => setDocumentType(e.target.value as "Memorial" | "Raw Materials")} style={input}>
            <option value="Memorial">Finished Product — use the tombstone catalogue</option>
            <option value="Raw Materials">Raw Materials — enter material and measurements</option>
          </select>
        </label>

        {documentType === "Memorial" ? <label style={formLabel}>
          Option 1 — Select an active finished product from the catalogue
          <select value={selectedProductId} onChange={(e) => selectFinishedProduct(e.target.value)} style={input}>
            <option value="">Choose from the active product catalogue (optional)</option>
            {products.map((product) => <option key={product.id} value={product.id}>{product.title} — {product.category} {product.price ? `(${product.price})` : "(price on request)"}</option>)}
          </select>
          <span style={fieldHelp}>Selecting a product fills the first quotation item automatically.</span>
        </label> : <div style={leadPreview}>
          <strong>Raw materials quotation</strong>
          <p style={workspaceHint}>Enter the material, description, L × W × H, quantity, square metres, kilograms, and price for each line.</p>
        </div>}

        <div style={captureToggle}>
          <button type="button" onClick={() => setCaptureMode("lead")} style={captureMode === "lead" ? activeCaptureButton : captureButton}>
            Use Website Enquiry
          </button>
          <button type="button" onClick={() => setCaptureMode("manual")} style={captureMode === "manual" ? activeCaptureButton : captureButton}>
            Manual Customer Capture
          </button>
        </div>

        {captureMode === "lead" ? <select
          value={selectedLeadId}
          onChange={(e) => {
            const newLeadId = e.target.value;
            setSelectedLeadId(newLeadId);

            const selected = leads.find((lead) => lead.id === newLeadId);

            if (selected) {
              setItems([{
                item_name: selected.interest_type || "",
                description: selected.message || "",
                quantity: 1,
                unit_price: 0,
                material: "",
                dimensions: "",
                square_meters: "",
                kilograms: "",
              }]);
            }
          }}
          required
          style={input}
        >
          <option value="">Select lead</option>
          {leads.map((lead) => {
            const customer = first(lead.customer);

            return (
              <option key={lead.id} value={lead.id}>
                {customer?.full_name || "Unknown Customer"} - {lead.interest_type}
              </option>
            );
          })}
        </select> : <div style={formGrid}>
          <input placeholder="Customer full name" value={manualCustomer.fullName} onChange={(e) => setManualCustomer({ ...manualCustomer, fullName: e.target.value })} required style={input} />
          <input placeholder="Phone / WhatsApp (optional)" value={manualCustomer.phone} onChange={(e) => setManualCustomer({ ...manualCustomer, phone: e.target.value })} style={input} />
          <input type="email" placeholder="Email address (optional)" value={manualCustomer.email} onChange={(e) => setManualCustomer({ ...manualCustomer, email: e.target.value })} style={input} />
        </div>}

        {captureMode === "lead" && selectedLead ? (
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

        <p style={workspaceHint}>{documentType === "Memorial" ? "Option 2 — or add a custom item below. You can also add extras such as a photo, transport, or an allowance." : "Add each raw material line with its measurements and price."}</p>
        {items.map((item, index) => {
          const updateItem = (changes: Partial<QuoteItem>) => setItems((current) => current.map((currentItem, currentIndex) => currentIndex === index ? { ...currentItem, ...changes } : currentItem));
          return <div key={index} style={leadPreview}>
            <div style={workspaceHeader}>
              <strong>Quotation item {index + 1}</strong>
              {items.length > 1 ? <button type="button" onClick={() => setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))} style={quoteDeleteButton}>Remove item</button> : null}
            </div>
            <div style={formGrid}>
              <label style={formLabel}>{documentType === "Raw Materials" ? "Material" : "Item name"}
                <input placeholder={documentType === "Raw Materials" ? "e.g. Rustenburg Black Granite" : "e.g. Tombstone, Photo, or Transport"} value={item.item_name} onChange={(e) => updateItem({ item_name: e.target.value })} required style={input} />
              </label>
              <label style={formLabel}>Quantity
                <input type="number" min="1" placeholder="e.g. 1" value={item.quantity} onChange={(e) => updateItem({ quantity: Number(e.target.value) })} required style={input} />
              </label>
              <label style={formLabel}>Unit price (R)
                <input type="number" min="0" step="0.01" placeholder="e.g. 66000.00" value={item.unit_price} onChange={(e) => updateItem({ unit_price: Number(e.target.value) })} required style={input} />
              </label>
            </div>
            <label style={formLabel}>Description
              <textarea placeholder={documentType === "Raw Materials" ? "e.g. Polished black granite" : "e.g. Photo size 18 × 24 or Single trip (discounted)"} value={item.description} onChange={(e) => updateItem({ description: e.target.value })} style={textarea} />
            </label>
            {documentType === "Raw Materials" ? <div style={formGrid}>
              <label style={formLabel}>L × W × H
                <input placeholder="e.g. 80 × 60 × 5 cm" value={item.dimensions} onChange={(e) => updateItem({ dimensions: e.target.value })} style={input} />
              </label>
              <label style={formLabel}>Square metres (m²)
                <input type="number" min="0" step="0.001" placeholder="e.g. 0.480" value={item.square_meters} onChange={(e) => updateItem({ square_meters: e.target.value === "" ? "" : Number(e.target.value) })} style={input} />
              </label>
              <label style={formLabel}>Weight (kg)
                <input type="number" min="0" step="0.001" placeholder="e.g. 35" value={item.kilograms} onChange={(e) => updateItem({ kilograms: e.target.value === "" ? "" : Number(e.target.value) })} style={input} />
              </label>
            </div> : null}
          </div>;
        })}
        <button type="button" onClick={() => setItems((current) => [...current, emptyItem()])} style={secondaryButton}>Add quotation item or allowance</button>

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
            <strong>Total:</strong> R{Number(items.reduce((total, item) => total + item.quantity * item.unit_price, 0)).toFixed(2)}
          </p>
          <p>
            <strong>Deposit:</strong> R
            {Number(items.reduce((total, item) => total + item.quantity * item.unit_price, 0) * (depositPercentage / 100)).toFixed(2)}
          </p>
          <p>
            <strong>Balance:</strong> R
            {Number(
              items.reduce((total, item) => total + item.quantity * item.unit_price, 0) -
                items.reduce((total, item) => total + item.quantity * item.unit_price, 0) * (depositPercentage / 100)
            ).toFixed(2)}
          </p>
        </div>

        <button type="submit" disabled={saving} style={button}>
          {saving ? "Saving Quotation..." : "Create Formal Quotation"}
        </button>
        </> : <p style={workspaceHint}>Open this workspace when you are ready to capture a formal quotation.</p>}
      </form>

      <section style={grid}>
        {paginatedQuotes.map((quote) => (
          <div key={quote.id} style={card}>
            <h3>{quote.quote_number}</h3>
            <p style={documentTypeLabel}>{quote.document_type === "Raw Materials" ? "Raw Materials" : "Memorial / Tombstone"}</p>
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
            <button onClick={() => void deleteQuote(quote)} style={quoteDeleteButton}>
              Delete Quotation
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

      <PaginationControls
        itemLabel="quotes"
        page={quotePage}
        pageSize={quotePageSize}
        totalItems={quotes.length}
        onPageChange={setQuotePage}
        onPageSizeChange={(pageSize) => { setQuotePageSize(pageSize); setQuotePage(1); }}
      />
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

const workspaceHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "14px",
  flexWrap: "wrap",
};

const workspacePill: React.CSSProperties = {
  border: "1px solid #C8A96A",
  borderRadius: "999px",
  background: "#FFF9EF",
  color: "#14110D",
  padding: "5px 10px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "12px",
  whiteSpace: "nowrap",
};

const workspaceHint: React.CSSProperties = {
  margin: 0,
  color: "#6C5A45",
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

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "12px",
};

const formLabel: React.CSSProperties = {
  display: "grid",
  gap: "7px",
  color: "#5C5145",
  fontWeight: 700,
};

const fieldHelp: React.CSSProperties = {
  color: "#6C5A45",
  fontWeight: 400,
  fontSize: "12px",
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

const quoteDeleteButton: React.CSSProperties = {
  background: "transparent",
  color: "#8A2E27",
  border: "1px solid #B65B52",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700,
};

const documentTypeLabel: React.CSSProperties = {
  margin: "-6px 0 14px",
  color: "#9B7434",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "1px",
  textTransform: "uppercase",
};

const captureToggle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const captureButton: React.CSSProperties = {
  border: "1px solid #BBA57E",
  background: "#FFFDF7",
  color: "#2B241B",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 700,
};

const activeCaptureButton: React.CSSProperties = {
  ...captureButton,
  background: "#14110D",
  color: "#C8A96A",
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
