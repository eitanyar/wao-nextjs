"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function YaadSandboxContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [amount, setAmount] = useState("9.90");
  const [masof, setMasof] = useState("1234567890");
  const [info, setInfo] = useState("WAO Campaign Setup");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const a = searchParams.get("amount");
    const m = searchParams.get("masof");
    const i = searchParams.get("info");
    if (a) setAmount(parseFloat(a).toFixed(2));
    if (m) setMasof(m);
    if (i) setInfo(i);
  }, [searchParams]);

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaying(true);
    setTimeout(() => {
      // Redirect back to onboarding page with success parameter
      router.push("/google-ads/onboarding?payment=success");
    }, 1500);
  };

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#F5F5F5", display: "flex", justifyContent: "center", alignItems: "center", fontFamily: "Arial, sans-serif", padding: "20px", color: "#333" }}>
      <div style={{ backgroundColor: "#FFFFFF", width: "100%", maxWidth: "480px", borderRadius: "8px", border: "1px solid #D2D2D2", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        
        {/* Header */}
        <div style={{ backgroundColor: "#2C3E50", padding: "20px", color: "#FFFFFF", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "bold" }}>יעד שריג - מסוף תשלום מאובטח</h2>
          <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: "4px" }}>מספר מסוף: {masof}</div>
        </div>

        {/* Details Card */}
        <div style={{ padding: "20px", borderBottom: "1px solid #EAEAEA", backgroundColor: "#FDFDFD" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#7F8C8D" }}>פרטי העסקה:</span>
            <span style={{ fontWeight: "bold" }}>{info}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "#7F8C8D" }}>סכום לתשלום:</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#27AE60" }}>₪ {amount}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handlePayment} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px", color: "#34495E" }}>שם בעל הכרטיס</label>
            <input type="text" required style={{ width: "100%", padding: "10px", border: "1px solid #BDC3C7", borderRadius: "4px" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px", color: "#34495E" }}>מספר כרטיס אשראי</label>
            <input type="text" placeholder="xxxx-xxxx-xxxx-xxxx" required style={{ width: "100%", padding: "10px", border: "1px solid #BDC3C7", borderRadius: "4px", textAlign: "left", direction: "ltr" }} />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px", color: "#34495E" }}>תוקף (חודש/שנה)</label>
              <input type="text" placeholder="MM/YY" required style={{ width: "100%", padding: "10px", border: "1px solid #BDC3C7", borderRadius: "4px", textAlign: "center", direction: "ltr" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "bold", marginBottom: "6px", color: "#34495E" }}>CVV</label>
              <input type="text" placeholder="3 ספרות" required style={{ width: "100%", padding: "10px", border: "1px solid #BDC3C7", borderRadius: "4px", textAlign: "center", direction: "ltr" }} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isPaying}
            style={{ 
              backgroundColor: "#27AE60", 
              color: "#FFFFFF", 
              border: "none", 
              padding: "14px", 
              borderRadius: "4px", 
              fontSize: "1.1rem", 
              fontWeight: "bold", 
              cursor: isPaying ? "not-allowed" : "pointer",
              transition: "background 0.2s",
              marginTop: "10px"
            }}
          >
            {isPaying ? "מבצע תשלום..." : `בצע תשלום בסך ₪ ${amount}`}
          </button>
        </form>

        {/* Footer */}
        <div style={{ padding: "16px", backgroundColor: "#F9F9F9", textAlign: "center", fontSize: "0.75rem", color: "#95A5A6", borderTop: "1px solid #EAEAEA" }}>
          החיוב יבוצע תחת "WAO Digital LTD" • PCI-DSS Compliant
        </div>
      </div>
    </div>
  );
}

export default function YaadSandbox() {
  return (
    <Suspense fallback={<div>טוען מסוף תשלום...</div>}>
      <YaadSandboxContent />
    </Suspense>
  );
}
