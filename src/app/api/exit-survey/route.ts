import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

async function sendSurveyEmail(data: {
  name: string;
  phone?: string;
  email?: string;
  niche: string;
  challenge: string;
  aiUsage: string;
}) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyTo = process.env.LEAD_NOTIFY_EMAIL ?? "eitan@wao.co.il";

  if (!smtpHost || !smtpUser || !smtpPass) return; // silent skip if not configured

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: smtpUser, pass: smtpPass },
  });

  const nicheLabel: Record<string, string> = {
    clinic: "קליניקה / קוסמטיקאית",
    lawyer: "עורך דין / רואה חשבון מקומי",
    ecommerce: "חנות בוטיק דיגיטלית",
    other: "אחר",
  };

  const subject = `סקר יציאה חדש מ-WAO (Ask Method) — ${data.name}`;
  const text = [
    `שם: ${data.name}`,
    `טלפון: ${data.phone ?? "—"}`,
    `אימייל: ${data.email ?? "—"}`,
    `נישה: ${nicheLabel[data.niche] ?? data.niche}`,
    `רמת שימוש ב-AI: ${data.aiUsage}`,
    `\nהאתגר המרכזי בעסק (SMIC):`,
    data.challenge,
  ].join("\n");

  await transporter.sendMail({
    from: `"WAO סקר יציאה" <${smtpUser}>`,
    to: notifyTo,
    subject,
    text,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const surveyData = {
      name: String(body.name ?? "").trim(),
      phone: String(body.phone ?? "").trim() || undefined,
      email: String(body.email ?? "").trim() || undefined,
      niche: String(body.niche ?? "other").trim(),
      challenge: String(body.challenge ?? "").trim(),
      aiUsage: String(body.aiUsage ?? "בכלל לא").trim(),
    };

    if (!surveyData.name || !surveyData.challenge) {
      return NextResponse.json(
        { ok: false, error: "שם ואתגר מרכזי הם שדות חובה" },
        { status: 400 }
      );
    }

    // Fire-and-forget email trigger
    sendSurveyEmail(surveyData).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405 });
}
