'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DIY_COURSE_DATA, Lesson } from '@/data/diy-course-data';
import LessonDashboard from '@/components/LessonDashboard';

type NicheType = 'clinic' | 'lawyer' | 'ecommerce' | 'other';

export default function DiyLessonPage() {
  const params = useParams();
  
  const phaseSlug = params.phase as string;
  const lessonSlug = params.lesson as string;

  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedNiche, setSelectedNiche] = useState<NicheType>('other');
  const [isHydrated, setIsHydrated] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLessonFinished, setIsLessonFinished] = useState(false);

  // Find current phase and lesson
  const phaseIndex = DIY_COURSE_DATA.findIndex((p) => p.id === phaseSlug);
  const phase = DIY_COURSE_DATA[phaseIndex];
  
  const lessonIndex = phase?.lessons.findIndex((l) => l.slug === lessonSlug) ?? -1;
  const lesson = phase?.lessons[lessonIndex];

  // Flat lessons map
  const flatLessons: { phaseId: string; lesson: Lesson }[] = [];
  DIY_COURSE_DATA.forEach((p) => {
    p.lessons.forEach((l) => {
      flatLessons.push({ phaseId: p.id, lesson: l });
    });
  });

  const currentFlatIndex = flatLessons.findIndex((item) => item.lesson.slug === lessonSlug);
  const previousLesson = currentFlatIndex > 0 ? flatLessons[currentFlatIndex - 1] : null;
  const nextLesson = currentFlatIndex < flatLessons.length - 1 ? flatLessons[currentFlatIndex + 1] : null;

  useEffect(() => {
    // Hydrate progress and niche from localStorage
    const savedProgress = localStorage.getItem('wao_diy_completed_lessons');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress) as string[];
        setTimeout(() => {
          setCompletedLessons(parsed);
          if (parsed.includes(lessonSlug)) {
            setIsLessonFinished(true);
          }
        }, 0);
      } catch {
        setTimeout(() => setCompletedLessons([]), 0);
      }
    }

    const savedNiche = localStorage.getItem('wao_user_niche') as NicheType;
    if (savedNiche && ['clinic', 'lawyer', 'ecommerce', 'other'].includes(savedNiche)) {
      setTimeout(() => setSelectedNiche(savedNiche), 0);
    }

    setTimeout(() => setIsHydrated(true), 0);
  }, [lessonSlug]);

  if (!phase || !lesson) {
    return (
      <div className="py-24 text-center text-[var(--text)]">
        <h2 className="text-2xl font-bold font-rubik">השיעור לא נמצא</h2>
        <Link href="/training/diy-ai-marketing" className="btn-primary mt-4 inline-block">
          חזרה ללוח הקורס
        </Link>
      </div>
    );
  }

  // Check locking state
  const isUnlocked = currentFlatIndex === 0 || completedLessons.includes(previousLesson?.lesson.slug ?? '');

  const handleCopyPrompt = () => {
    // Replace dynamic placeholders in prompt based on selected niche
    let promptText = lesson.prompt;
    const nicheLabels: Record<NicheType, string> = {
      clinic: 'קליניקה אסתטית / קוסמטיקאית',
      lawyer: 'משרד עורכי דין / רואה חשבון מקומי',
      ecommerce: 'חנות בוטיק דיגיטלית',
      other: 'עסק עצמאי',
    };
    
    promptText = promptText
      .replace('[הזן כאן את סוג העסק שלך]', nicheLabels[selectedNiche])
      .replace('[סוג העסק]', nicheLabels[selectedNiche])
      .replace('[הזן את קהל היעד]', 'לקוחות פרטיים B2C בישראל')
      .replace('[קהל]', 'לקוחות B2C בשוק המקומי')
      .replace('[הבעיה]', 'קושי להחליט באיזה ספק לבחור / חשש מחוסר מקצועיות')
      .replace('[הבעיה המרכזית שאני פותר]', 'קושי בבחירת ספק מקצועי')
      .replace('[הפתרון]', 'שירות אישי, שקוף ואיכותי עם ליווי מלא')
      .replace('[המוצר/השירות]', 'שירות פרימיום מותאם אישית');

    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleComplete = (checked: boolean) => {
    setIsLessonFinished(checked);
    let updated: string[];

    if (checked) {
      updated = [...completedLessons, lessonSlug];
    } else {
      updated = completedLessons.filter((slug) => slug !== lessonSlug);
    }

    setCompletedLessons(updated);
    localStorage.setItem('wao_diy_completed_lessons', JSON.stringify(updated));
  };

  if (isHydrated && !isUnlocked) {
    return (
      <section className="py-24 bg-[var(--bg)] min-height-[90vh] text-[var(--text)] flex items-center justify-center">
        <div className="wao-container max-w-[580px] mx-auto px-4 text-center" dir="rtl">
          <div className="text-5xl mb-6">🔒</div>
          <h1 className="text-2xl md:text-3xl font-bold font-rubik mb-4">שיעור זה נעול</h1>
          <p className="text-sm md:text-base text-[var(--muted)] mb-8">
            במשפך הלמידה של WAO אנו שומרים על סדר וקצב נכונים. 
            עליך להשלים את המשימה המעשית של השיעור הקודם ({previousLesson?.lesson.title}) כדי לפתוח שיעור זה.
          </p>
          <div className="flex justify-center gap-4">
            {previousLesson && (
              <Link
                href={`/training/diy-ai-marketing/${previousLesson.phaseId}/${previousLesson.lesson.slug}`}
                className="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
              >
                מעבר לשיעור הקודם
              </Link>
            )}
            <Link
              href="/training/diy-ai-marketing"
              className="btn-outline px-6 py-2.5 rounded-full text-sm font-semibold cursor-pointer"
            >
              חזרה ללוח הקורס
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const lessonListForDashboard = phase.lessons.map((l) => ({
    title: l.title,
    slug: l.slug,
  }));

  return (
    <section className="py-16 bg-[var(--bg)] min-height-[90vh] text-[var(--text)]">
      <div className="wao-container max-w-[840px] mx-auto px-4" dir="rtl">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4 mb-8 text-xs font-semibold font-rubik text-[var(--muted)]">
          <Link href="/training/diy-ai-marketing" className="hover:text-[var(--text)] flex items-center gap-1">
            <span>←</span> חזרה ללוח הקורס
          </Link>
          <div className="text-left">
            שלב {phaseIndex + 1} · שיעור {lessonIndex + 1} מתוך {phase.lessons.length}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-bold font-rubik mb-3 leading-tight">
          {lesson.title}
        </h1>
        <p className="text-sm md:text-base text-[var(--muted)] mb-8">
          {lesson.desc}
        </p>

        {/* Video Player Section */}
        <div className="relative aspect-video rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-card)] mb-12 flex items-center justify-center">
          {/* Glow backdrop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 to-transparent pointer-events-none" />
          
          <div className="text-center p-6 space-y-4 z-10">
            <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center text-2xl mx-auto shadow-glow">
              🎬
            </div>
            <div>
              <h3 className="font-bold text-lg font-rubik">שיעור וידאו מוקלט</h3>
              <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mt-1">
                סרטון השיעור המלא נבנה ברגעים אלו באולפן ה-AI של הצוות (Marp + ElevenLabs + MoviePy) ויהיה זמין בקרוב.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Niche Selector */}
        <div className="p-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-bold text-base md:text-lg font-rubik">התאמת המשימה השיווקית לסוג העסק שלך:</h3>
              <p className="text-xs text-[var(--muted)]">בחר את הנישה שלך כדי לחשוף את שיעורי הבית והפרומפט המותאמים לך.</p>
            </div>
            <select
              value={selectedNiche}
              onChange={(e) => {
                const val = e.target.value as NicheType;
                setSelectedNiche(val);
                localStorage.setItem('wao_user_niche', val);
              }}
              className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--elevated)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              <option value="clinic">🏥 קליניקה / קוסמטיקאית</option>
              <option value="lawyer">⚖️ עורך דין / רואה חשבון</option>
              <option value="ecommerce">🛍️ חנות בוטיק דיגיטלית</option>
              <option value="other">💼 עסק עצמאי אחר</option>
            </select>
          </div>

          {/* Dynamic homework content */}
          <div className="p-4 rounded-[var(--radius-sm)] bg-[var(--elevated)] border border-[var(--border)] text-sm leading-relaxed mb-6">
            <span className="font-bold text-[var(--accent)] block mb-1">המשימה המעשית שלך:</span>
            {selectedNiche === 'clinic' && lesson.homework.clinic}
            {selectedNiche === 'lawyer' && lesson.homework.lawyer}
            {selectedNiche === 'ecommerce' && lesson.homework.ecommerce}
            {selectedNiche === 'other' && lesson.homework.other}
          </div>

          {/* Prompt Copy Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--muted)]">העתק את הפרומפט המוכן ל-ChatGPT:</span>
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-3 py-1 rounded bg-[var(--subtle)] hover:bg-[var(--accent-dim)] text-[var(--muted)] hover:text-[var(--accent)] text-xs font-semibold transition-colors cursor-pointer"
              >
                {copied ? '✓ הועתק לקליפבורד' : '📋 העתק פרומפט'}
              </button>
            </div>
            
            <div className="relative rounded-[var(--radius-sm)] border border-[var(--border)] bg-black/40 p-4 overflow-hidden max-h-[160px] overflow-y-auto">
              <pre className="text-xs text-[var(--muted)] font-mono whitespace-pre-wrap leading-relaxed text-right" dir="ltr">
                {lesson.prompt}
              </pre>
            </div>
            
            <a
              href={lesson.gptLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:underline mt-2"
            >
              <span>🤖 מעבר ל-Custom GPT הייעודי לשיעור זה</span>
              <span>↗</span>
            </a>
          </div>
        </div>

        {/* Retrieval Quiz & Pre-reqs Dashboard */}
        <LessonDashboard
          key={lesson.slug}
          currentLessonSlug={lesson.slug}
          lessons={lessonListForDashboard}
          activeTask={lesson.homework[selectedNiche]}
          retrievalCheck={lesson.quiz}
        />

        {/* Scaffold Lock Completion Toggle */}
        <div className="border-t border-[var(--border)] pt-8 mt-12 flex flex-col items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              checked={isLessonFinished}
              onChange={(e) => handleToggleComplete(e.target.checked)}
              className="w-5 h-5 accent-[var(--accent)] cursor-pointer"
            />
            <span className="text-sm md:text-base font-semibold group-hover:text-[var(--accent)] transition-colors">
              סיימתי את המשימה המעשית והגדרתי את ה-AI בשיעור זה
            </span>
          </label>

          {isLessonFinished && (
            <div className="w-full text-center space-y-4 animate-fade-in">
              <div className="text-xs text-[var(--accent)] font-semibold font-rubik">
                ✨ מעולה! השיעור הבא נפתח כעת ללמידה.
              </div>
              
              <div className="flex justify-center gap-3">
                {nextLesson ? (
                  <Link
                    href={`/training/diy-ai-marketing/${nextLesson.phaseId}/${nextLesson.lesson.slug}`}
                    className="btn-primary px-8 py-3 text-sm font-semibold rounded-full shadow-glow cursor-pointer"
                  >
                    מעבר לשיעור הבא ➔
                  </Link>
                ) : (
                  <div className="p-4 rounded-[var(--radius-md)] bg-[var(--accent-dim)] border border-[var(--accent-border)] font-bold text-sm">
                    🏆 כל הכבוד! השלמת את כל השיעורים במסלול השיווק העצמי בעזרת AI!
                  </div>
                )}
                
                <Link
                  href="/training/diy-ai-marketing"
                  className="btn-outline px-6 py-3 text-sm font-semibold rounded-full cursor-pointer"
                >
                  חזרה ללוח הקורס
                </Link>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
