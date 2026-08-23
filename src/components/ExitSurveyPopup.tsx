'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NicheBucket = 'clinic' | 'lawyer' | 'ecommerce' | 'other';
type PopupVariant = 'course' | 'commercial';

// Reuses the same WhatsApp deep link used across the site (see Header.tsx, CtaBanner.tsx).
const WHATSAPP_URL = 'https://wa.me/972526148860';

// ── Persistent suppression gate (localStorage — survives reloads/new tabs/new sessions) ──
const GATE_KEY = 'wao_exit_survey_state';
const DISMISS_SUPPRESS_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

type GateStatus = 'dismissed' | 'submitted';
interface GateState {
  status: GateStatus;
  ts: number;
}

function readGateState(): GateState | null {
  try {
    const raw = localStorage.getItem(GATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.status === 'dismissed' || parsed.status === 'submitted') && typeof parsed.ts === 'number') {
      return parsed as GateState;
    }
    return null;
  } catch {
    return null;
  }
}

function writeGateState(status: GateStatus) {
  try {
    localStorage.setItem(GATE_KEY, JSON.stringify({ status, ts: Date.now() }));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — fail silently, non-critical.
  }
}

function isGateSuppressed(): boolean {
  const state = readGateState();
  if (!state) return false;
  if (state.status === 'submitted') return true; // converted — never show again
  if (state.status === 'dismissed' && Date.now() - state.ts < DISMISS_SUPPRESS_MS) return true;
  return false;
}

// ── Page routing: which pages get no popup, the course survey, or the commercial variant ──
// Internal / auth-gated / transactional tools and legal pages — never show any exit popup.
const NO_POPUP_PATHS = [
  '/training/google-ads-course',
  '/contact',
  '/account',
  '/admin',
  '/client',
  '/checkout',
  '/leads',
  '/trainer',
  '/privacy',
  '/accessibility',
  '/preview-lp',
  // GEO Bot task/tool surfaces — signup flow, auth, scan/audit tools, dashboard, and
  // per-action pages. NOT '/geo' itself, which is the marketing landing page and should
  // keep the commercial exit-intent popup. See mobile-audit fix #1 (Maya, approved by Eitan).
  '/geo/signup',
  '/geo/login',
  '/geo/scan',
  '/geo/action',
  '/geo/dashboard',
];

// Content/learning pages keep the existing 4-step course-lead survey.
const COURSE_VARIANT_PATHS = ['/training', '/blog', '/knowledge', '/glossary', '/about'];

function getVariant(pathname: string | null): PopupVariant | null {
  if (!pathname) return null;
  if (NO_POPUP_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null;
  }
  if (COURSE_VARIANT_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return 'course';
  }
  // Default: home, /seo, /consulting, and every other commercial/service page.
  return 'commercial';
}

export default function ExitSurveyPopup() {
  const pathname = usePathname();
  const variant = getVariant(pathname);

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states (course variant only)
  const [niche, setNiche] = useState<NicheBucket | ''>('');
  const [challenge, setChallenge] = useState('');
  const [aiUsage, setAiUsage] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Validation states
  const [error, setError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const openPopup = () => {
    setIsOpen(true);
    sessionStorage.setItem('wao_exit_survey_shown', 'true');
    // Lock body scroll
    document.body.style.overflow = 'hidden';
  };

  const closePopup = () => {
    setIsOpen(false);
    // Restore body scroll
    document.body.style.overflow = '';
  };

  // Closed without converting (X / Escape / backdrop) — mark dismissed, suppress 14 days.
  const dismissPopup = () => {
    writeGateState('dismissed');
    closePopup();
  };

  // Converted (course step-5 success, or commercial primary CTA click) — never show again.
  const markSubmitted = () => {
    writeGateState('submitted');
  };

  useEffect(() => {
    if (!variant) return; // page excluded from all exit popups

    // Dev/QA bypass: append ?no_exit_popup=1 to any URL to fully disable the popup for
    // that page load. Deliberately query-param based (not an automatic NODE_ENV skip) so
    // the popup can still be exercised end-to-end against `npm run dev`.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('no_exit_popup') === '1') return;
    }

    // Same-tab cheap guard (not the source of truth — see localStorage gate below).
    const hasBeenShownThisSession = sessionStorage.getItem('wao_exit_survey_shown');
    if (hasBeenShownThisSession === 'true') return;

    // Persistent gate: submitted → never again; dismissed → suppressed for 14 days.
    if (isGateSuppressed()) return;

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

    // Minimum time on page before any trigger (15 seconds)
    const pageLoadTime = Date.now();
    const MIN_TIME_MS = 15_000;

    if (!isMobile) {
      // ── Desktop: exit intent with a trajectory guard ──────────────────────
      // A raw `clientY <= 0` mouseleave fires on tab-switches, address-bar
      // clicks, and incidental top-edge grazes — none of which are genuine
      // exit intent. We track recent mousemove samples and only treat the
      // top-edge mouseleave as real if the cursor had meaningful net upward
      // velocity over the preceding ~300ms.
      const TRAJECTORY_WINDOW_MS = 300;
      const MIN_UPWARD_DISTANCE_PX = 20;
      const MIN_UPWARD_VELOCITY = 0.15; // px/ms moving upward (negative deltaY)

      let samples: { y: number; t: number }[] = [];

      const handleMouseMove = (e: MouseEvent) => {
        const now = Date.now();
        samples.push({ y: e.clientY, t: now });
        // Keep only samples within the trajectory window.
        samples = samples.filter((s) => now - s.t <= TRAJECTORY_WINDOW_MS);
      };

      const hasGenuineUpwardTrajectory = (): boolean => {
        if (samples.length < 2) return false;
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = last.t - first.t;
        if (dt <= 0) return false;
        const dy = last.y - first.y; // negative = moved up
        const velocity = dy / dt; // negative px/ms moving up
        return dy <= -MIN_UPWARD_DISTANCE_PX && velocity <= -MIN_UPWARD_VELOCITY;
      };

      const handleMouseLeave = (e: MouseEvent) => {
        // Ignore moves into iframes (e.g. YouTube embeds)
        const target = e.relatedTarget as HTMLElement | null;
        if (target && target.tagName === 'IFRAME') return;

        // Must be exiting from the top edge only
        if (e.clientY > 0) return;

        // Must have spent at least 15 s on the page
        if (Date.now() - pageLoadTime < MIN_TIME_MS) return;

        // Must show genuine upward velocity, not a tab-switch / incidental graze
        if (!hasGenuineUpwardTrajectory()) return;

        openPopup();
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      };
    } else {
      // ── Mobile: time-based only (60 s), with scroll-depth guard ─────────
      // mouseleave is NOT used on mobile — touch events fire it unreliably
      // during normal scrolling and swipe gestures.
      // The popup only appears after 60 seconds AND if the user has scrolled
      // at least 30% of the page (proving genuine engagement, not a bounce).
      const mobileTimeout = setTimeout(() => {
        const scrollDepth = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
        if (scrollDepth >= 0.30) {
          openPopup();
        }
      }, 60_000);

      return () => clearTimeout(mobileTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);


  // Accessibility: Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismissPopup();
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex="0"]'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus close button initially
    closeButtonRef.current?.focus();

    return () => document.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleNextStep = () => {
    setError('');
    if (step === 1 && !niche) {
      setError('אנא בחר את הנישה המתאימה ביותר לעסק שלך.');
      return;
    }
    if (step === 2) {
      if (challenge.trim().length < 10) {
        setError('אנא פרט מעט יותר על האתגר המרכזי שלך (לפחות 10 תווים).');
        return;
      }
    }
    if (step === 3 && !aiUsage) {
      setError('אנא בחר את רמת השימוש שלך ב-AI.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('אנא הזן את שמך.');
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setError('אנא הזן אימייל או מספר טלפון ליצירת קשר.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/exit-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          niche,
          challenge,
          aiUsage,
        }),
      });

      const result = await res.json();

      if (result.ok) {
        // Save selected niche to localStorage to customize training portal layout
        localStorage.setItem('wao_user_niche', niche);
        markSubmitted(); // converted — never show the exit popup again
        setStep(5);
      } else {
        setError(result.error ?? 'חלה שגיאה בשליחת הטופס. אנא נסה שנית.');
      }
    } catch {
      setError('שגיאת תקשורת. אנא ודא חיבור לרשת ונסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  const handleCommercialCtaClick = () => {
    markSubmitted(); // primary CTA click counts as a conversion, not a dismissal
    closePopup();
  };

  if (!isOpen || !variant) return null;

  // ── Commercial variant: single-step, no survey, no form POST ──────────────
  if (variant === 'commercial') {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-commercial-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dismissPopup();
        }}
      >
        <div
          ref={modalRef}
          dir="rtl"
          className="relative w-full max-w-[520px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 md:p-8 shadow-[var(--shadow-card)] text-[var(--text)] transition-all overflow-hidden text-center"
        >
          {/* Glow decoration */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-[80px] pointer-events-none" />

          {/* Close Button */}
          <button
            ref={closeButtonRef}
            onClick={dismissPopup}
            className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
            aria-label="סגור חלון"
          >
            ✕
          </button>

          <div className="space-y-4 pt-2">
            <h2 id="exit-commercial-title" className="text-xl md:text-2xl font-bold font-rubik">
              רגע לפני שאתה סוגר — ב-₪9.90 הבוט כבר מתחיל לבנות לך אתר
            </h2>
            <p className="text-sm md:text-base text-[var(--muted)] max-w-md mx-auto">
              את כל מה שקראת כאן, הבוט של WAO עושה בשבילך — ואתה רק מאשר.
              משלם ₪9.90, מקבל אתר חי תוך 24 שעות, וממשיך רק אם אהבת.
            </p>

            <div className="pt-4 space-y-3">
              <Link
                href="/site-bot"
                onClick={handleCommercialCtaClick}
                className="btn-primary block w-full px-8 py-3.5 text-sm md:text-base font-semibold text-center rounded-[var(--radius-pill)] cursor-pointer"
              >
                שהבוט יבנה לי ב-₪9.90
              </Link>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismissPopup}
                className="block text-xs md:text-sm text-[var(--muted)] hover:text-[var(--text)] underline underline-offset-2 transition-colors cursor-pointer"
              >
                מעדיף לדבר עם בן אדם קודם? דבר איתנו בוואטסאפ
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Course variant: existing 4-step survey ────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-survey-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && step < 5) dismissPopup();
      }}
    >
      <div
        ref={modalRef}
        dir="rtl"
        className="relative w-full max-w-[580px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 md:p-8 shadow-[var(--shadow-card)] text-[var(--text)] transition-all overflow-hidden"
      >
        {/* Glow decoration */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[var(--accent)]/10 rounded-full blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          ref={closeButtonRef}
          onClick={step < 5 ? dismissPopup : closePopup}
          className="absolute top-4 left-4 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--border)] hover:border-[var(--accent)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
          aria-label="סגור חלון"
        >
          ✕
        </button>

        {/* Header (Steps 1 to 4) */}
        {step < 5 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-[var(--accent)] font-rubik">
              <span>שלב {step} מתוך 4</span>
              <div className="flex-1 h-1.5 bg-[var(--subtle)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
            <h2 id="exit-survey-title" className="text-xl md:text-2xl font-bold font-rubik">
              {step === 1 && 'רגע לפני שאתה יוצא...'}
              {step === 2 && 'האתגר הכי גדול שלך'}
              {step === 3 && 'שילוב בינה מלאכותית (AI)'}
              {step === 4 && 'אחרון וסיימנו! שריון מקום בזום'}
            </h2>
          </div>
        )}

        {/* Step 1: Niche Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm md:text-base text-[var(--muted)]">
              אנחנו משיקים בית ספר דיגיטלי מתקדם ללימוד שיווק מעשי בעזרת AI לעסקים.
              איזה מהבאים מתאר הכי טוב את הפעילות שלך?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                type="button"
                onClick={() => setNiche('clinic')}
                className={`p-4 text-right rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                  niche === 'clinic'
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--muted)]'
                }`}
              >
                🏥 קליניקה / קוסמטיקאית / מרפאה
              </button>
              <button
                type="button"
                onClick={() => setNiche('lawyer')}
                className={`p-4 text-right rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                  niche === 'lawyer'
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--muted)]'
                }`}
              >
                ⚖️ עורך דין / רואה חשבון מקומי
              </button>
              <button
                type="button"
                onClick={() => setNiche('ecommerce')}
                className={`p-4 text-right rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                  niche === 'ecommerce'
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--muted)]'
                }`}
              >
                🛍️ חנות בוטיק דיגיטלית (E-commerce)
              </button>
              <button
                type="button"
                onClick={() => setNiche('other')}
                className={`p-4 text-right rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                  niche === 'other'
                    ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                    : 'border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--muted)]'
                }`}
              >
                💼 עסק אחר / יועץ חופשי
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Open-ended challenge */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm md:text-base text-[var(--muted)]">
              מה האתגר הגדול ביותר שלך בהבאת לקוחות ממוקדים לעסק?
              (למשל: תקציבי מודעות מבוזבזים, קושי בכתיבת תוכן שיווקי, או חוסר ידע טכנולוגי).
            </p>
            <textarea
              value={challenge}
              onChange={(e) => setChallenge(e.target.value)}
              placeholder="כתוב כאן לפחות משפט או שניים מפורטים..."
              rows={4}
              className="w-full p-4 rounded-[var(--radius-md)] bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] text-sm resize-none"
            />
          </div>
        )}

        {/* Step 3: AI usage */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm md:text-base text-[var(--muted)]">
              באיזו מידה אתה משלב כיום כלי בינה מלאכותית (כמו ChatGPT, Gemini) בשיווק העסק שלך?
            </p>
            <div className="flex flex-col gap-3">
              {[
                { val: 'בכלל לא', label: '❌ בכלל לא (עדיין עובד בשיטות הישנות)' },
                { val: 'משתמש לעיתים רחוקות', label: '✍️ משתמש לעיתים רחוקות (בעיקר לקבלת רעיונות לכתיבה)' },
                { val: 'משתמש באופן קבוע', label: '🚀 משתמש באופן קבוע (כתיבה, תמונות, אסטרטגיה)' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setAiUsage(item.val)}
                  className={`p-4 text-right rounded-[var(--radius-md)] border text-sm font-semibold transition-all cursor-pointer ${
                    aiUsage === item.val
                      ? 'border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--text)]'
                      : 'border-[var(--border)] bg-[var(--elevated)] hover:border-[var(--muted)]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Contact details */}
        {step === 4 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm md:text-base text-[var(--muted)]">
              הזן את פרטיך כדי לקבל את מדריך ה-AI המותאם אישית לנישה שלך ולהצטרף לרשימת ההמתנה למפגשי הזום החינמיים (2 מפגשי יישום פרקטיים):
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-[var(--muted)]">שם מלא *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="שם פרטי ומשפחה"
                  className="w-full p-3 rounded-[var(--radius-sm)] bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--muted)]">אימייל</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full p-3 rounded-[var(--radius-sm)] bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-[var(--muted)]">טלפון נייד</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="05x-xxxxxxx"
                    className="w-full p-3 rounded-[var(--radius-sm)] bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)] text-sm"
                  />
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Step 5: Success message */}
        {step === 5 && (
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full flex items-center justify-center mx-auto text-3xl shadow-glow">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-rubik">הרשמתך בוצעה בהצלחה!</h2>
              <p className="text-sm md:text-base text-[var(--muted)] max-w-md mx-auto">
                שמרנו את מקומך ברשימת ההמתנה למחזור הזום הקרוב.
                בנוסף, הכנו עבורך סביבת למידה מותאמת אישית לנישה שבחרת.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Link
                href="/training/diy-ai-marketing"
                onClick={closePopup}
                className="btn-primary px-8 py-3 text-sm font-semibold text-center rounded-[var(--radius-pill)] cursor-pointer"
              >
                כניסה לפורטל ההדרכה המותאם שלי
              </Link>
              <button
                type="button"
                onClick={closePopup}
                className="btn-outline px-6 py-3 text-sm font-semibold rounded-[var(--radius-pill)] hover:bg-[var(--subtle)] transition-colors cursor-pointer"
              >
                המשך גלישה באתר
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 rounded-[var(--radius-sm)] bg-red-950/40 border border-red-900/50 text-red-200 text-xs text-right">
            ⚠️ {error}
          </div>
        )}

        {/* Footer controls (Steps 1 to 4) */}
        {step < 5 && (
          <div className="flex items-center justify-between border-t border-[var(--border)] pt-5 mt-6 gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="px-5 py-2.5 rounded-[var(--radius-pill)] border border-[var(--border)] text-sm font-semibold hover:bg-[var(--subtle)] transition-colors cursor-pointer"
              >
                חזרה
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 rounded-[var(--radius-pill)] bg-[var(--accent)] text-[var(--bg)] font-semibold text-sm hover:shadow-[var(--shadow-glow)] transition-all cursor-pointer"
              >
                המשך לשלב הבא
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSubmit}
                className="px-8 py-2.5 rounded-[var(--radius-pill)] bg-[var(--accent)] text-[var(--bg)] font-semibold text-sm hover:shadow-[var(--shadow-glow)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'שולח...' : 'שריין מקום ושלח לי את המדריך'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
