import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type Customer = { full_name: string; email: string | null };
type Quote = {
  quote_number: string;
  total_amount: number;
  customer: Customer | Customer[] | null;
};
type Payment = {
  id: string;
  quote_id: string;
  amount: number;
  payment_type: string;
  payment_method: string;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  quote: Quote | Quote[] | null;
};

function first<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: number) {
  return `R${Number(value).toFixed(2)}`;
}

function receiptEmail(content: string) {
  return `
    <div style="margin:0;padding:28px 12px;background:#f2efe5;font-family:Arial,sans-serif;color:#1e1d1b;">
      <table role="presentation" style="width:100%;max-width:680px;margin:0 auto;border-collapse:collapse;background:#fffaf0;border:1px solid #d3ad58;">
        <tr><td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #d3ad58;">
          <img src="https://www.polokotombstones.co.za/poloko-tombstones-logo.png" alt="Poloko Tombstones" width="120" style="display:block;width:120px;height:auto;margin:0 auto 10px;" />
          <div style="color:#c29231;font-family:Georgia,serif;font-style:italic;font-size:17px;">A Legacy Carved in Stone</div>
          <div style="margin-top:9px;color:#51483d;font-size:12px;line-height:1.5;">Garankuwa: 073 163 3836 &nbsp;•&nbsp; Ganyesa: 083 928 0868<br />www.polokotombstones.co.za &nbsp;•&nbsp; info@polokotombstones.co.za</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <h1 style="margin:0 0 22px;text-align:center;font-size:25px;letter-spacing:1px;text-transform:uppercase;">Payment Confirmation</h1>
          <div style="width:90px;height:2px;background:#c29231;margin:-12px auto 26px;"></div>
          ${content}
        </td></tr>
        <tr><td style="padding:18px 32px;text-align:center;background:#1e1d1b;color:#d3ad58;font-weight:bold;font-size:13px;letter-spacing:.5px;">POLOKO TOMBSTONES &nbsp;•&nbsp; A LEGACY CARVED IN STONE</td></tr>
      </table>
    </div>
  `;
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { data: userResult, error: authError } =
      await supabaseAdmin.auth.getUser(token);
    if (authError || !userResult.user) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const { paymentId }: { paymentId?: string } = await request.json();
    if (!paymentId) {
      return NextResponse.json({ success: false, error: "Payment ID is required." }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("poloko_payments")
      .select("id, quote_id, amount, payment_type, payment_method, reference, paid_at, notes, quote:poloko_quotes(quote_number, total_amount, customer:poloko_customers(full_name, email))")
      .eq("id", paymentId)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false, error: "Payment could not be found." }, { status: 404 });
    }

    const payment = data as unknown as Payment;
    const quote = first(payment.quote);
    const customer = first(quote?.customer);
    if (!quote || !customer?.email) {
      return NextResponse.json({ success: true, sent: false, reason: "Customer has no email address." });
    }

    const { data: quotePayments, error: paymentsError } = await supabaseAdmin
      .from("poloko_payments")
      .select("amount, payment_type")
      .eq("quote_id", payment.quote_id);

    if (paymentsError) throw paymentsError;

    const totalPaid = (quotePayments || []).reduce(
      (total, item) =>
        total + (item.payment_type === "Refund" ? -Number(item.amount) : Number(item.amount)),
      0
    );
    const balance = Math.max(0, Number(quote.total_amount) - totalPaid);

    const html = receiptEmail(`
      <div style="line-height:1.65;">
        <p>Dear ${escapeHtml(customer.full_name)},</p>
        <p>Thank you. We confirm receipt of your payment to Poloko Tombstones.</p>
        <table role="presentation" style="width:100%;margin:22px 0;border-collapse:collapse;border:1px solid #d3ad58;">
          <tr><td style="padding:10px 14px;color:#9b7434;">Quotation</td><td style="padding:10px 14px;text-align:right;font-weight:bold;">${escapeHtml(quote.quote_number)}</td></tr>
          <tr style="background:#f2efe5;"><td style="padding:10px 14px;color:#9b7434;">Amount received</td><td style="padding:10px 14px;text-align:right;font-weight:bold;">${money(payment.amount)}</td></tr>
          <tr><td style="padding:10px 14px;color:#9b7434;">Payment type</td><td style="padding:10px 14px;text-align:right;">${escapeHtml(payment.payment_type)}</td></tr>
          <tr style="background:#f2efe5;"><td style="padding:10px 14px;color:#9b7434;">Payment method</td><td style="padding:10px 14px;text-align:right;">${escapeHtml(payment.payment_method)}</td></tr>
          <tr><td style="padding:10px 14px;color:#9b7434;">Reference</td><td style="padding:10px 14px;text-align:right;">${escapeHtml(payment.reference || "Not supplied")}</td></tr>
          <tr style="background:#f2efe5;"><td style="padding:10px 14px;color:#9b7434;">Payment date</td><td style="padding:10px 14px;text-align:right;">${escapeHtml(payment.paid_at)}</td></tr>
          <tr><td style="padding:10px 14px;color:#9b7434;">Total paid to date</td><td style="padding:10px 14px;text-align:right;font-weight:bold;">${money(totalPaid)}</td></tr>
          <tr style="background:#1e1d1b;color:#d3ad58;"><td style="padding:12px 14px;">Remaining balance</td><td style="padding:12px 14px;text-align:right;font-weight:bold;">${money(balance)}</td></tr>
        </table>
        <p>Please keep this email as confirmation of payment.</p>
        <p>Kind regards,<br /><strong>Poloko Tombstones</strong><br />A Legacy Carved in Stone</p>
      </div>
    `);

    const { error: emailError } = await resend.emails.send({
      from: "Poloko Tombstones <info@polokotombstones.co.za>",
      to: [customer.email],
      subject: `Payment confirmation - ${quote.quote_number}`,
      html,
      text: `Payment confirmation\n\nDear ${customer.full_name},\n\nAmount received: ${money(payment.amount)}\nQuotation: ${quote.quote_number}\nPayment type: ${payment.payment_type}\nPayment method: ${payment.payment_method}\nReference: ${payment.reference || "Not supplied"}\nPayment date: ${payment.paid_at}\nTotal paid to date: ${money(totalPaid)}\nRemaining balance: ${money(balance)}\n\nPoloko Tombstones\nA Legacy Carved in Stone`,
    });

    if (emailError) throw emailError;
    return NextResponse.json({ success: true, sent: true, email: customer.email });
  } catch (error) {
    console.error("Payment receipt email error:", error);
    return NextResponse.json({ success: false, error: "Payment was saved, but the receipt email could not be sent." }, { status: 500 });
  }
}

