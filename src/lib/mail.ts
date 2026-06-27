export async function sendLeadNotificationEmail(lead: any) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY is not set. Email notification skipped.");
    return;
  }

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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "WAO Leads <leads@wao.co.il>",
        to: ["eitan@wao.co.il", "leads@wao.co.il"], // In production this would be the client's email, for MVP we send it to WAO
        subject: `ליד חדש התקבל: ${lead.name || "לקוח פוטנציאלי"}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Resend API error:", errorData);
      throw new Error("Failed to send email");
    }

    console.log("[WAO Mail] Lead notification email sent successfully!");
  } catch (error) {
    console.error("[WAO Mail] Error sending email notification:", error);
  }
}
