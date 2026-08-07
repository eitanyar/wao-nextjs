import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import { getClientRecord } from "@/lib/geo/client";
import { getGscTokenRecord } from "@/lib/geo/gsc-token";

// Post-payment self-serve GSC OAuth landing (VISION.md line 247). Also the
// redirect target of /api/geo/gsc/oauth/callback, so it doubles as the
// success/error landing for that flow (?success=1 / ?error=1).
export const metadata = { robots: { index: false }, title: "חיבור Search Console | WAO" };

export default async function ConnectGscPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; success?: string; error?: string }>;
}) {
  const { clientId, success, error } = await searchParams;

  if (!clientId) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)" }}>{renderMixed("חסר מזהה לקוח. חזור לדף ההרשמה והתחל שוב.")}</p>
      </Shell>
    );
  }

  const client = getClientRecord(clientId);
  if (!client) {
    return (
      <Shell>
        <p style={{ color: "#e05555" }}>{renderMixed("לא מצאנו לקוח כזה.")}</p>
      </Shell>
    );
  }

  const gscToken = getGscTokenRecord(clientId);
  const connected = Boolean(client.gscConnected && gscToken);

  return (
    <Shell>
      {success === "1" && !error && (
        <p style={{ color: "#4ae3b5", marginBottom: "16px" }}>
          {renderMixed("Search Console חובר בהצלחה!")}
        </p>
      )}
      {error === "1" && (
        <p style={{ color: "#e05555", marginBottom: "16px" }}>
          {renderMixed("החיבור נכשל. אפשר לנסות שוב, או לדלג ולחבר מאוחר יותר מהאזור האישי.")}
        </p>
      )}

      {connected ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <p style={{ marginBottom: "8px" }}>{renderMixed("Search Console מחובר.")}</p>
          {gscToken && gscToken.sites.length > 0 && (
            <p style={{ color: "var(--muted)", fontSize: "0.85rem" }} dir="ltr">
              {gscToken.sites.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
          <p style={{ color: "var(--muted)", marginBottom: "16px" }}>
            {renderMixed("כדי שהבוט יוכל למצוא הזדמנויות באתר שלך, הוא צריך גישת קריאה בלבד לנתוני Search Console שלך.")}
          </p>
          <a
            href={`/api/geo/gsc/oauth/start?clientId=${encodeURIComponent(clientId)}`}
            className="btn-primary"
            style={{ display: "block", textAlign: "center", padding: "14px" }}
          >
            {renderMixed("חבר את Search Console שלי")}
          </a>
        </div>
      )}

      <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
        <Link href="/client/dashboard" style={{ color: "var(--accent)" }}>
          {renderMixed(connected ? "המשך לאזור האישי ←" : "דלג לעכשיו, אחבר מאוחר יותר מהאזור האישי ←")}
        </Link>
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section style={{ minHeight: "100vh", paddingTop: "120px", paddingBottom: "80px" }}>
      <div className="wao-container" style={{ maxWidth: "480px" }}>
        <h1
          style={{
            fontFamily: "var(--font-rubik), sans-serif",
            fontWeight: 900,
            fontSize: "1.6rem",
            marginBottom: "20px",
          }}
        >
          {renderMixed("חיבור Search Console")}
        </h1>
        {children}
      </div>
    </section>
  );
}
