import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type SelectedProduct = {
  id: string;
  title: string;
  price: string | null;
  image_url: string | null;
  category: string;
};

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  try {
    const {
      name,
      phone,
      email,
      service,
      message,
      productId,
      selectedProduct,
    }: {
      name: string;
      phone: string;
      email?: string;
      service: string;
      message: string;
      productId?: string;
      selectedProduct?: SelectedProduct | null;
    } = await request.json();

    if (!name || !phone || !service || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const finalProductId = productId || selectedProduct?.id || null;

    const { data: customer, error: customerError } = await supabaseAdmin
      .from("poloko_customers")
      .insert({
        full_name: name,
        phone,
        email: email || null,
        location: null,
      })
      .select()
      .single();

    if (customerError) {
      console.error("Customer insert error:", customerError);
      return NextResponse.json(
        { success: false, error: "Failed to save customer." },
        { status: 500 }
      );
    }

    const { error: leadError } = await supabaseAdmin.from("poloko_leads").insert({
      customer_id: customer.id,
      product_id: finalProductId,
      interest_type: service,
      message,
      source: "Website",
      status: "New",
    });

    if (leadError) {
      console.error("Lead insert error:", leadError);
      return NextResponse.json(
        { success: false, error: "Failed to save lead." },
        { status: 500 }
      );
    }

    const productImageHtml = selectedProduct?.image_url
      ? `
        <p style="margin:16px 0 8px;"><strong>Selected Tombstone Image:</strong></p>
        <img
          src="${escapeHtml(selectedProduct.image_url)}"
          alt="${escapeHtml(selectedProduct.title)}"
          style="width:100%;max-width:520px;height:auto;border-radius:12px;border:1px solid #ddd;display:block;"
        />
      `
      : "";

    const internalEmailHtml = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;">
        <h2 style="margin-bottom:10px;">New Quote Request</h2>

        <p>A new quote request has been submitted from the Poloko Tombstones website.</p>

        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Phone / WhatsApp:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email || "Not provided")}</p>
        <p><strong>Product of Interest:</strong> ${escapeHtml(service)}</p>

        ${
          selectedProduct
            ? `
              <h3>Selected Tombstone</h3>
              <p><strong>Name:</strong> ${escapeHtml(selectedProduct.title)}</p>
              <p><strong>Category:</strong> ${escapeHtml(selectedProduct.category)}</p>
              <p><strong>Price:</strong> ${escapeHtml(selectedProduct.price || "Quote Required")}</p>
              ${productImageHtml}
            `
            : ""
        }

        <h3>Message / Requirements</h3>
        <p>${escapeHtml(message).replaceAll("\n", "<br />")}</p>
      </div>
    `;

    const selectedProductText = selectedProduct
      ? `
Selected Tombstone:
Name: ${selectedProduct.title}
Category: ${selectedProduct.category}
Price: ${selectedProduct.price || "Quote Required"}
Image: ${selectedProduct.image_url || "No image available"}
`
      : "";

    await resend.emails.send({
      from: "Poloko Tombstones <info@polokotombstones.co.za>",
      to: ["info@polokotombstones.co.za"],
      replyTo: email || "info@polokotombstones.co.za",
      subject: "New Quote Request - Poloko Tombstones",
      html: internalEmailHtml,
      text: `
New quote request from the Poloko Tombstones website.

Name: ${name}
Phone / WhatsApp: ${phone}
Email: ${email || "Not provided"}
Product of Interest: ${service}

${selectedProductText}

Message / Requirements:
${message}
      `,
    });

    if (email) {
      const customerEmailHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222;">
          <p>Dear ${escapeHtml(name)},</p>

          <p>Thank you for contacting Poloko Tombstones.</p>

          <p>We have received your quote request and our team will review the details you submitted. We will get back to you as soon as possible.</p>

          <h3>Your Request Details</h3>
          <p><strong>Product of Interest:</strong> ${escapeHtml(service)}</p>

          ${
            selectedProduct
              ? `
                <p><strong>Selected Tombstone:</strong> ${escapeHtml(selectedProduct.title)}</p>
                <p><strong>Price:</strong> ${escapeHtml(selectedProduct.price || "Quote Required")}</p>
              `
              : ""
          }

          <p><strong>Phone / WhatsApp:</strong> ${escapeHtml(phone)}</p>

          <p><strong>Message:</strong><br />${escapeHtml(message).replaceAll("\n", "<br />")}</p>

          <p>
            Kind regards,<br />
            Poloko Tombstones<br />
            A legacy carved in stone.<br />
            info@polokotombstones.co.za<br />
            073 163 3836
          </p>
        </div>
      `;

      await resend.emails.send({
        from: "Poloko Tombstones <info@polokotombstones.co.za>",
        to: [email],
        subject: "We have received your quote request",
        html: customerEmailHtml,
        text: `
Dear ${name},

Thank you for contacting Poloko Tombstones.

We have received your quote request and our team will review the details you submitted. We will get back to you as soon as possible.

Your request details:

Product of Interest: ${service}
${
  selectedProduct
    ? `Selected Tombstone: ${selectedProduct.title}
Price: ${selectedProduct.price || "Quote Required"}
`
    : ""
}
Phone / WhatsApp: ${phone}

Message:
${message}

Kind regards,
Poloko Tombstones
A legacy carved in stone.
info@polokotombstones.co.za
073 163 3836
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quote request error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to submit quote request." },
      { status: 500 }
    );
  }
}