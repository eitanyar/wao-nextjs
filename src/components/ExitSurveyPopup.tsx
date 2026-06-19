'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type NicheBucket = 'clinic' | 'lawyer' | 'ecommerce' | 'other';

export default function ExitSurveyPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
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

  useEffect(() => {
    // Check if popup was already shown in this session
    const hasBeenShown = sessionStorage.getItem('wao_exit_survey_shown');
    if (hasBeenShown === 'true') return;

    // 1. Exit intent trigger (desktop mouse leave)
    const handleMouseLeave = (e: MouseEvent) => {
      // If the mouse is moving into an iframe (like a YouTube video embed), do not trigger exit intent
      const target = e.relatedTarget as HTMLElement | null;
      if (target && target.tagName === 'IFRAME') {
        return;
      }

      if (e.clientY < 20) {
        openPopup();
      }
    };

    // 2. Mobile trigger (time delay of 30 seconds)
    const mobileTimeout = setTimeout(() => {
      openPopup();
    }, 30000);

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(mobileTimeout);
    };
  }, []);

  // Accessibility: Handle escape key and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopup();
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-survey-title"
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
          onClick={closePopup}
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
