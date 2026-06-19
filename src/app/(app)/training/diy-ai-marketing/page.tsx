'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { DIY_COURSE_DATA, Phase, Lesson } from '@/data/diy-course-data';

export default function DiyAiMarketingDashboard() {
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [userNiche, setUserNiche] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Load progress and niche from localStorage
    const savedProgress = localStorage.getItem('wao_diy_completed_lessons');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setTimeout(() => setCompletedLessons(parsed), 0);
      } catch {
        setTimeout(() => setCompletedLessons([]), 0);
      }
    }

    const savedNiche = localStorage.getItem('wao_user_niche');
    setTimeout(() => {
      setUserNiche(savedNiche);
      setIsHydrated(true);
    }, 0);
  }, []);

  // Get dynamic labels for niche
  const getNicheLabel = (nicheKey: string | null) => {
    if (!nicheKey) return null;
    const labels: Record<string, string> = {
      clinic: "🏥 קליניקה / קוסמטיקאית",
      lawyer: "⚖️ עורך דין / רואה חשבון מקומי",
      ecommerce: "🛍️ חנות בוטיק דיגיטלית",
      other: "💼 עסק עצמאי"
    };
    return labels[nicheKey] ?? null;
  };

  // Helper to determine if a lesson is unlocked
  const isLessonUnlocked = (phaseIndex: number, lessonIndex: number) => {
    // Flat list of all lessons
    const flatLessons: { phaseId: string; lesson: Lesson }[] = [];
    DIY_COURSE_DATA.forEach((phase) => {
      phase.lessons.forEach((lesson) => {
        flatLessons.push({ phaseId: phase.id, lesson });
      });
    });

    const targetLesson = DIY_COURSE_DATA[phaseIndex].lessons[lessonIndex];
    const targetFlatIndex = flatLessons.findIndex((item) => item.lesson.slug === targetLesson.slug);

    // First lesson is always unlocked
    if (targetFlatIndex === 0) return true;

    // A lesson is unlocked if the previous lesson in the flat hierarchy is completed
    const previousLesson = flatLessons[targetFlatIndex - 1].lesson;
    return completedLessons.includes(previousLesson.slug);
  };

  // Calculate overall progress percentage
  const totalLessonsCount = DIY_COURSE_DATA.flatMap(p => p.lessons).length;
  const completedCount = completedLessons.filter(slug => 
    DIY_COURSE_DATA.flatMap(p => p.lessons).some(l => l.slug === slug)
  ).length;
  const progressPercent = totalLessonsCount > 0 ? Math.round((completedCount / totalLessonsCount) * 100) : 0;

  return (
    <section className="py-24 bg-[var(--bg)] min-height-[90vh] text-[var(--text)]">
      <div className="wao-container max-w-[960px] mx-auto px-4" dir="rtl">
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-8 font-rubik">
          <Link href="/" className="hover:text-[var(--text)] transition-colors">דף הבית</Link>
          <span>/</span>
          <Link href="/training" className="hover:text-[var(--text)] transition-colors">הכשרות</Link>
          <span>/</span>
          <span className="text-[var(--accent)]">DIY שיווק עצמי עם AI</span>
        </div>

        {/* Hero Section */}
        <div className="text-center md:text-right max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent-border)] bg-[var(--accent-dim)] text-[var(--accent)] text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            מסלול מובנה מאפס לתוצאות
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-rubik mb-4 leading-tight">
            DIY שיווק עצמי בעזרת AI לעסקים B2C
          </h1>
          <p className="text-sm md:text-lg text-[var(--muted)] leading-relaxed">
            במקום ללכת לאיבוד בשפע של תוכן חינמי, בנינו עבורך מסלול שיווק מובנה בקצב נכון.
            תעבור שלב-שלב, תבצע את המשימות בעזרת ה-AI שלכם, ותבנה את המערך שלכם מאפס.
          </p>
        </div>

        {/* Personalized Welcomer Banner */}
        {isHydrated && userNiche && (
          <div className="relative p-6 rounded-[var(--radius-md)] border border-[var(--accent-border)] bg-[var(--accent-dim)] mb-12 overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base md:text-lg mb-1 font-rubik">מותאם אישית עבור: {getNicheLabel(userNiche)}</h3>
                <p className="text-xs md:text-sm text-[var(--muted)]">
                  המערכת התאימה את שיעורי הבית והפרומפטים לצרכים הספציפיים של העסק שלך.
                </p>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('wao_user_niche');
                  setUserNiche(null);
                }}
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline cursor-pointer"
              >
                שינוי סוג העסק
              </button>
            </div>
          </div>
        )}

        {/* Progress Tracker */}
        {isHydrated && completedCount > 0 && (
          <div className="p-6 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] mb-12">
            <div className="flex items-center justify-between mb-3 text-sm font-semibold">
              <span>התקדמות במסלול השיווק</span>
              <span className="text-[var(--accent)] font-rubik">{progressPercent}% ({completedCount}/{totalLessonsCount} שיעורים)</span>
            </div>
            <div className="w-full h-2 bg-[var(--subtle)] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[var(--accent)] transition-all duration-500 shadow-glow"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Curriculum Phases */}
        <div className="space-y-8">
          {DIY_COURSE_DATA.map((phase: Phase, phaseIndex: number) => {
            // Check if phase is locked (locked if first lesson of phase is locked)
            const isPhaseLocked = isHydrated ? !isLessonUnlocked(phaseIndex, 0) : phaseIndex > 0;

            return (
              <div 
                key={phase.id}
                className={`relative rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8 transition-all duration-300 ${
                  isPhaseLocked ? 'opacity-50 select-none' : 'hover:border-[var(--accent-border)]'
                }`}
              >
                {/* Phase Number Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-bold font-rubik text-[var(--accent)] uppercase tracking-wider block mb-1">
                      שלב {phaseIndex + 1}
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold font-rubik mb-2">
                      {phase.title}
                    </h2>
                    <p className="text-xs md:text-sm text-[var(--muted)]">
                      {phase.desc}
                    </p>
                  </div>
                  {isPhaseLocked && (
                    <div className="w-10 h-10 rounded-full border border-[var(--border)] bg-[var(--elevated)] flex items-center justify-center text-sm shadow-sm" aria-hidden="true">
                      🔒
                    </div>
                  )}
                </div>

                {/* Lessons List */}
                <div className="space-y-4 pt-4 border-t border-[var(--border)]/40">
                  {phase.lessons.map((lesson: Lesson, lessonIndex: number) => {
                    const isUnlocked = isHydrated ? isLessonUnlocked(phaseIndex, lessonIndex) : (phaseIndex === 0 && lessonIndex === 0);
                    const isCompleted = isHydrated ? completedLessons.includes(lesson.slug) : false;

                    return (
                      <div 
                        key={lesson.slug}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-[var(--radius-md)] border transition-all ${
                          isCompleted 
                            ? 'bg-[var(--accent-dim)]/20 border-[var(--accent-border)]/40' 
                            : isUnlocked 
                              ? 'bg-[var(--elevated)] border-[var(--border)] hover:border-[var(--accent-border)]/40' 
                              : 'bg-black/20 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status Icon */}
                          <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isCompleted 
                              ? 'bg-[var(--accent)] text-[var(--bg)]' 
                              : isUnlocked 
                                ? 'border border-[var(--accent)] text-[var(--accent)] shadow-sm' 
                                : 'border border-[var(--border)] text-[var(--muted)]'
                          }`}>
                            {isCompleted ? '✓' : '▶'}
                          </div>

                          <div>
                            <h3 className={`text-sm md:text-base font-semibold ${
                              isUnlocked ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                            }`}>
                              {lesson.title}
                            </h3>
                            <p className="text-xs text-[var(--muted)] mt-1 line-clamp-1">
                              {lesson.desc}
                            </p>
                          </div>
                        </div>

                        {/* Action Link */}
                        <div className="shrink-0 flex justify-end">
                          {isUnlocked ? (
                            <Link
                              href={`/training/diy-ai-marketing/${phase.id}/${lesson.slug}`}
                              className={`px-4 py-2 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                                isCompleted 
                                  ? 'border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)]'
                                  : 'bg-[var(--accent)] text-[var(--bg)] hover:shadow-glow hover:border-transparent'
                              }`}
                            >
                              {isCompleted ? 'חזרה לשיעור' : 'התחל שיעור'}
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--subtle)] text-[var(--muted)] border border-[var(--border)] select-none">
                              <span>🔒</span>
                              <span>נעול</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
