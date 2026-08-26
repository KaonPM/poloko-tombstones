import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const ADMIN_EMAIL = "info@polokotombstones.co.za";
function first<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] || null : value; }

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    const { data: userResult, error: authError } = token ? await admin.auth.getUser(token) : { data: { user: null }, error: true };
    if (authError || userResult.user?.email?.toLowerCase() !== ADMIN_EMAIL) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { orderId }: { orderId?: string } = await request.json();
    const { data, error } = await admin.from("poloko_orders")
      .select("order_number,status,due_date,customer:poloko_customers(full_name,email)")
      .eq("id", orderId).single();
    if (error || !data) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const customer = first(data.customer as unknown as { full_name: string; email: string | null } | { full_name: string; email: string | null }[] | null);
    if (!customer?.email) return NextResponse.json({ sent: false, reason: "Customer has no email address." });
    const html = `<div style="background:#f2efe5;padding:28px;font-family:Arial;color:#1e1d1b"><div style="max-width:650px;margin:auto;background:#fffaf0;border:1px solid #d3ad58"><div style="text-align:center;padding:24px"><img src="https://www.polokotombstones.co.za/poloko-tombstones-logo.png" width="110" alt="Poloko Tombstones"><h1>ORDER PROGRESS UPDATE</h1></div><div style="padding:0 30px 30px"><p>Dear ${customer.full_name},</p><p>Your order <strong>${data.order_number}</strong> has progressed to:</p><div style="background:#1e1d1b;color:#d3ad58;padding:20px;text-align:center;font-size:22px;font-weight:bold">${data.status}</div><p>We will continue to keep you informed as your memorial moves through production.</p><p>Kind regards,<br><strong>Poloko Tombstones</strong></p></div></div></div>`;
    const { error: sendError } = await resend.emails.send({ from: "Poloko Tombstones <info@polokotombstones.co.za>", to: [customer.email], subject: `Order ${data.order_number} update: ${data.status}`, html });
    if (sendError) throw sendError;
    return NextResponse.json({ sent: true, email: customer.email });
  } catch (error) {
    console.error("Order update email error:", error);
    return NextResponse.json({ error: "Order update email could not be sent." }, { status: 500 });
  }
}
