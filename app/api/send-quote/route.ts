import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { name, phone, email, service, message } = await request.json();

    if (!name || !phone || !service || !message) {
      return NextResponse.json(
        { success: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Poloko Tombstones <info@polokotombstones.co.za>",
      to: ["info@polokotombstones.co.za"],
      replyTo: email || "info@polokotombstones.co.za",
      subject: "New Quote Request - Poloko Tombstones",
      text: `
New quote request from the Poloko Tombstones website.

Name: ${name}
Phone / WhatsApp: ${phone}
Email: ${email || "Not provided"}
Product of Interest: ${service}

Message / Requirements:
${message}
      `,
    });

    if (email) {
      await resend.emails.send({
        from: "Poloko Tombstones <info@polokotombstones.co.za>",
        to: [email],
        subject: "We have received your quote request",
        text: `
Dear ${name},

Thank you for contacting Poloko Tombstones.

We have received your quote request and our team will review the details you submitted. We will get back to you as soon as possible.

Your request details:

Product of Interest: ${service}
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
    console.error("Resend quote email error:", error);

    return NextResponse.json(
      { success: false, error: "Failed to send quote request." },
      { status: 500 }
    );
  }
}