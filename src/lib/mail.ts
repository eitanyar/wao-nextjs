import type { WeeklyDigest } from './crm/intelligence.js';

async function sendResendEmail(params: { subject: string; html: string; to: string[]; from: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set. Email notification skipped.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Resend API error:", errorData);
    throw new Error("Failed to send email");
  }
}

export async function sendLeadNotificationEmail(lead: any) {
  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">ליד חדש נכנס! 🚀</h2>
      <p>היי! יש לך ליד חדש שממתין לטיפול.</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
        <p><strong>שם מלא:</strong> ${lead.name || "לא הוזן"}</p>
        <p><strong>טלפון:</strong> <a href="tel:${lead.phone}">${lead.phone || "לא הוזן"}</a></p>
        <p><strong>קמפיין / מקור:</strong> ${lead.businessNiche || "דף נחיתה WAO"}</p>
        <p><strong>תאריך:</strong> ${lead.date}</p>
      </div>
      <p style="margin-top: 20px;">
        <a href="https://wao.co.il/leads" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">למעבר למערכת הניהול (Mini-CRM)</a>
      </p>
    </div>
  `;

  try {
    await sendResendEmail({
      from: "WAO Leads <leads@wao.co.il>",
      to: ["eitan@wao.co.il", "leads@wao.co.il"],
      subject: `ליד חדש התקבל: ${lead.name || "לקוח פוטנציאלי"}`,
      html: htmlContent,
    });

    console.log("[WAO Mail] Lead notification email sent successfully!");
  } catch (error) {
    console.error("[WAO Mail] Error sending email notification:", error);
  }
}

export async function sendGoogleAdsOperatorApprovalEmail(params: {
  clientId: string;
  title: string;
  recommendedAction: string;
  approvedBy: string;
  status?: string;
  error?: string;
}) {
  const isFailed = params.status === 'failed';
  const statusHeading = isFailed ? 'פעולת Google Ads נכשלה ❌' : 'פעולת Google Ads אושרה ✅';
  const statusText = isFailed
    ? `בוט הקמפיינים ניסה ליישם את המשימה אך נתקל בשגיאה: ${params.error || 'שגיאה לא ידועה'}`
    : 'בוט הקמפיינים קיבל אישור מפורש ויישם בהצלחה את המשימה הבאה:';

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: ${isFailed ? '#c0392b' : '#2c3e50'};">${statusHeading}</h2>
      <p>${statusText}</p>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
        <p><strong>לקוח:</strong> ${params.clientId}</p>
        <p><strong>משימה:</strong> ${params.title}</p>
        <p><strong>מה הוחלט:</strong> ${params.recommendedAction}</p>
        <p><strong>אושר על ידי:</strong> ${params.approvedBy}</p>
        ${params.status ? `<p><strong>סטטוס ביצוע:</strong> ${params.status}</p>` : ''}
        ${params.error ? `<p><strong>שגיאה:</strong> ${params.error}</p>` : ''}
      </div>
      <p style="margin-top: 20px;">המשימה נשמרה בתור ההפעלה הפנימי של WAO.</p>
    </div>
  `;

  try {
    await sendResendEmail({
      from: "WAO Operator <ads@wao.co.il>",
      to: ["eitan@wao.co.il", "leads@wao.co.il"],
      subject: `Google Ads operator status [${params.status || 'approved'}]: ${params.title}`,
      html: htmlContent,
    });

    console.log("[WAO Mail] Google Ads operator approval email sent successfully!");
  } catch (error) {
    console.error("[WAO Mail] Error sending Google Ads operator approval email:", error);
  }
}

/**
 * Sends the Google Ads weekly digest notification email to WAO operators.
 * Deliberately does NOT self-catch like sendLeadNotificationEmail /
 * sendGoogleAdsOperatorApprovalEmail above — the cron route needs to see
 * a thrown error to report 'email_failed' distinctly from 'sent'.
 */
export async function sendGoogleAdsWeeklyDigestEmail(params: {
  clientId: string;
  campaignName: string;
  digest: WeeklyDigest;
}): Promise<void> {
  const { clientId, campaignName, digest } = params;
  const alertsHtml = digest.alerts.length
    ? `<ul>${digest.alerts.map((a) => `<li><strong>${a.title}:</strong> ${a.message}</li>`).join('')}</ul>`
    : '<p>אין התראות פתוחות השבוע.</p>';

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">סיכום שבועי — ${campaignName} 📊</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
        <p><strong>לקוח:</strong> ${clientId}</p>
        <p><strong>לידים השבוע:</strong> ${digest.totals.leads}</p>
        <p><strong>עסקאות שנסגרו:</strong> ${digest.totals.closedDeals}</p>
        <p><strong>קצב תקציב:</strong> ${digest.pacing.status}</p>
      </div>
      <div style="margin-top: 15px;">${alertsHtml}</div>
      <p style="margin-top: 20px;">היכנס ל-<code>/geo/dashboard</code> כדי לשלוח את הסיכום לוואטסאפ הלקוח.</p>
    </div>
  `;

  await sendResendEmail({
    from: "WAO Ads Digest <ads@wao.co.il>",
    to: ["eitan@wao.co.il", "leads@wao.co.il"],
    subject: `Google Ads weekly digest [${clientId}]: ${digest.pacing.status}, ${digest.alerts.length} alert(s)`,
    html: htmlContent,
  });
}
