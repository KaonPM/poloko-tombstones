import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function first<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] || null : value; }
function esc(value: unknown) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || (await admin.auth.getUser(token)).error) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { quoteId, pdfBase64, documentKind }: { quoteId?: string; pdfBase64?: string; documentKind?: "quotation" | "proforma" } = await request.json();
    if (!quoteId || !pdfBase64) return NextResponse.json({ error: "Quote and PDF are required." }, { status: 400 });
    if (documentKind && documentKind !== "quotation" && documentKind !== "proforma") return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
    const isProforma = documentKind === "proforma";

    const { data, error } = await admin.from("poloko_quotes")
      .select("quote_number, total_amount, deposit_amount, balance_amount, valid_until, status, customer:poloko_customers(full_name,email)")
      .eq("id", quoteId).single();
    if (error || !data) return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    if (isProforma && !["Accepted", "Approved"].includes(data.status)) return NextResponse.json({ error: "Accept the quotation before issuing a proforma invoice." }, { status: 409 });
    const customer = first(data.customer as unknown as { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null);
    if (!customer?.email) return NextResponse.json({ sent: false, reason: "Customer has no email address." });

    const documentTitle = isProforma ? "PROFORMA INVOICE" : "FORMAL QUOTATION";
    const introduction = isProforma ? "Please find your proforma invoice attached. A deposit is required to secure your order." : "Please find your Poloko Tombstones quotation attached.";
    const html = `<div style="background:#f2efe5;padding:28px;font-family:Arial;color:#1e1d1b"><div style="max-width:680px;margin:auto;background:#fffaf0;border:1px solid #d3ad58"><div style="text-align:center;padding:25px;border-bottom:1px solid #d3ad58"><img src="https://www.polokotombstones.co.za/poloko-tombstones-logo.png" width="120" alt="Poloko Tombstones"><p style="color:#c29231;font-family:Georgia;font-style:italic">A Legacy Carved in Stone</p></div><div style="padding:30px"><h1 style="text-align:center">${documentTitle}</h1><p>Dear ${esc(customer.full_name)},</p><p>${introduction}</p><div style="border:1px solid #d3ad58;padding:18px;margin:20px 0"><p><strong>Total:</strong> R${Number(data.total_amount).toFixed(2)}</p><p><strong>Deposit:</strong> R${Number(data.deposit_amount).toFixed(2)}</p><p><strong>Balance:</strong> R${Number(data.balance_amount).toFixed(2)}</p>${isProforma ? "" : `<p><strong>Valid until:</strong> ${esc(data.valid_until || "30 days")}</p>`}</div><p>${isProforma ? "Please use the reference shown on the attached document when making payment." : "Reply to this email if you would like us to proceed."}</p><p>Kind regards,<br><strong>Poloko Tombstones</strong></p></div><div style="background:#1e1d1b;color:#d3ad58;text-align:center;padding:18px">POLOKO TOMBSTONES • A LEGACY CARVED IN STONE</div></div></div>`;
    const { error: sendError } = await resend.emails.send({
      from: "Poloko Tombstones <info@polokotombstones.co.za>", to: [customer.email],
      subject: `${isProforma ? "Proforma Invoice" : "Quotation"} ${data.quote_number} - Poloko Tombstones`, html,
      attachments: [{ filename: `${data.quote_number}-${isProforma ? "proforma-invoice" : "quotation"}.pdf`, content: pdfBase64 }],
    });
    if (sendError) throw sendError;
    if (!isProforma) await admin.from("poloko_quotes").update({ status: "Sent" }).eq("id", quoteId);
    return NextResponse.json({ sent: true, email: customer.email });
  } catch (error) {
    console.error("Formal quote email error:", error);
    return NextResponse.json({ error: "Quotation email could not be sent." }, { status: 500 });
  }
}
