"use client";

import React from "react";

export default function LandingPagePreview() {
  // Mobile-first, centered layout (simulating what the generated LP looks like)
  return (
    <div dir="rtl" style={{ backgroundColor: "#F7F9FC", minHeight: "100vh", paddingBottom: "100px", fontFamily: "var(--font-body), sans-serif", color: "#1a1a1a" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#FFFFFF", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "var(--accent)" }}>העסק שלי</div>
        <div style={{ fontSize: "1.5rem", color: "var(--accent)", cursor: "pointer" }}>☰</div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: "40px 20px", textAlign: "center", backgroundColor: "#FFFFFF", marginBottom: "8px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "16px", lineHeight: 1.2 }}>אינסטלטור מוסמך 24/7 בתל אביב</h1>
        <p style={{ fontSize: "1.1rem", color: "#4A5568", marginBottom: "24px" }}>הגעה תוך 20 דקות לתיקון כל סוגי הנזילות. שירות אמין ומחיר הוגן.</p>
        
        {/* Trust Assets (WhatsApp Gallery) */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "0.9rem", color: "#718096", marginBottom: "12px", fontWeight: "bold" }}>לקוחות ממליצים בוואטסאפ:</div>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", overflowX: "auto", paddingBottom: "8px" }}>
            <div style={{ width: "100px", height: "180px", backgroundColor: "#E2E8F0", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#A0AEC0", fontSize: "0.8rem" }}>צילום 1</div>
            <div style={{ width: "100px", height: "180px", backgroundColor: "#E2E8F0", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#A0AEC0", fontSize: "0.8rem" }}>צילום 2</div>
            <div style={{ width: "100px", height: "180px", backgroundColor: "#E2E8F0", borderRadius: "8px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#A0AEC0", fontSize: "0.8rem" }}>צילום 3</div>
          </div>
        </div>
      </section>

      {/* Lead Form */}
      <section style={{ padding: "32px 20px", backgroundColor: "#FFFFFF" }}>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "16px", textAlign: "center" }}>השאר פרטים ונחזור אליך מיד</h2>
        <form style={{ display: "flex", flexDirection: "column", gap: "16px" }} onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="שם מלא" style={{ padding: "14px", borderRadius: "8px", border: "1px solid #CBD5E0", fontSize: "1rem" }} required />
          {/* LTR enforcement for phone */}
          <input type="tel" placeholder="050-0000000" dir="ltr" style={{ padding: "14px", borderRadius: "8px", border: "1px solid #CBD5E0", fontSize: "1rem", textAlign: "right" }} required />
          
          <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", marginTop: "4px" }}>
            <input type="checkbox" required style={{ marginTop: "4px", accentColor: "var(--accent)" }} />
            <span style={{ fontSize: "0.8rem", color: "#4A5568", lineHeight: "1.4" }}>
              אני מאשר/ת קבלת חומר פרסומי והודעות בהתאם <strong>לחוק הספאם</strong>. אני מסכים/ה לתנאי התקנון ו<strong>מדיניות הפרטיות</strong>.
            </span>
          </label>

          <button type="submit" style={{ padding: "16px", backgroundColor: "var(--accent)", color: "#000", borderRadius: "8px", fontWeight: "bold", fontSize: "1.1rem", border: "none", cursor: "pointer", marginTop: "8px" }}>שלח פרטים</button>
        </form>
        
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "24px", fontSize: "0.75rem", color: "#A0AEC0" }}>
          <a href="#" style={{ textDecoration: "underline" }}>הצהרת נגישות</a>
          <a href="#" style={{ textDecoration: "underline" }}>מדיניות פרטיות</a>
          <a href="#" style={{ textDecoration: "underline" }}>תקנון חברה</a>
        </div>
      </section>

      {/* Sticky Bottom CTA */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#FFFFFF", padding: "16px 20px", display: "flex", gap: "12px", boxShadow: "0 -2px 10px rgba(0,0,0,0.1)", zIndex: 10 }}>
        <button style={{ flex: 1, backgroundColor: "var(--accent)", color: "#000", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>
          📞 התקשר עכשיו
        </button>
        <button style={{ flex: 1, backgroundColor: "#25D366", color: "white", border: "none", padding: "14px", borderRadius: "8px", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer" }}>
          💬 וואטסאפ
        </button>
      </div>
    </div>
  );
}
