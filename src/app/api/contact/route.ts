import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    // Validate request data
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = "fedele.davide@gmail.com";
    const fromEmail = "Portfolio Contact <onboarding@resend.dev>";

    // If Resend API key is configured, send actual email via Resend
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: [recipientEmail],
        replyTo: email.trim(),
        subject: `New Portfolio Message from ${name.trim()}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; color: #1e293b;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px; font-weight: 700;">New Contact Form Message</h2>
            <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">You received a new inquiry from your portfolio website.</p>
            
            <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f8fafc; border-radius: 8px;">
              <span style="display: block; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Sender Name</span>
              <strong style="font-size: 15px; color: #0f172a;">${escapeHtml(name.trim())}</strong>
            </div>

            <div style="margin-bottom: 16px; padding: 12px 16px; background-color: #f8fafc; border-radius: 8px;">
              <span style="display: block; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Email Address</span>
              <a href="mailto:${escapeHtml(email.trim())}" style="font-size: 15px; color: #2563eb; text-decoration: none;">${escapeHtml(email.trim())}</a>
            </div>

            <div style="margin-bottom: 24px; padding: 16px; background-color: #f8fafc; border-radius: 8px;">
              <span style="display: block; font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Message</span>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap;">${escapeHtml(message.trim())}</p>
            </div>

            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
              Sent from Next.js Portfolio Contact Form
            </div>
          </div>
        `,
        text: `New Portfolio Message from ${name.trim()} (${email.trim()}):\n\n${message.trim()}`,
      });

      if (error) {
        console.error("Resend API error:", error);
        return NextResponse.json(
          { error: error.message || "Failed to send email via provider." },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, id: data?.id });
    }

    // Fallback log for local development when RESEND_API_KEY is not set
    console.log("--------------------------------------------------");
    console.log("[CONTACT FORM SUBMISSION]");
    console.log(`From: ${name.trim()} <${email.trim()}>`);
    console.log(`To: ${recipientEmail}`);
    console.log(`Message:\n${message.trim()}`);
    console.log("--------------------------------------------------");

    return NextResponse.json({
      success: true,
      mock: true,
      message: "Form submission logged (RESEND_API_KEY not configured).",
    });
  } catch (err) {
    console.error("Error processing contact form submission:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending your message." },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
