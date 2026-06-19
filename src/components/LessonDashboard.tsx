'use client';

import React, { useState } from 'react';
import { renderMixed } from '@/lib/bidi';

interface UIComponentLink {
  label: string;
  href: string;
  isMustWatch?: boolean;
}

interface CourseNode {
  title: string;
  slug: string;
  status: 'completed' | 'current' | 'next';
}

interface RetrievalQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface LessonDashboardProps {
  currentLessonSlug: string;
  lessons: { title: string; slug: string }[];
  uiGuides?: UIComponentLink[];
  activeTask?: string;
  retrievalCheck?: RetrievalQuestion | RetrievalQuestion[];
  uiNavigator?: {
    actionSequence: string[];
    hebrewGuideUrl: string;
    hebrewGuideLabel?: string;
    demoVideoUrl?: string;
    demoVideoLabel?: string;
    geminiPrompt: string;
    troubleshootingExamples: string[];
  };
}

export default function LessonDashboard({
  currentLessonSlug,
  lessons,
  uiGuides = [],
  activeTask = '',
  retrievalCheck,
  uiNavigator,
}: LessonDashboardProps) {
  const [activeTab, setActiveTab] = useState<'prereqs' | 'task' | 'guides'>('prereqs');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Normalize questions to an array
  const questions: RetrievalQuestion[] = retrievalCheck
    ? Array.isArray(retrievalCheck)
      ? retrievalCheck
      : [retrievalCheck]
    : [];

  const currentQuestion = questions[currentQuestionIndex];

  // Build the sliding window progress map (3 items: Previous, Current, Next)
  const currentIndex = lessons.findIndex((l) => l.slug === currentLessonSlug);
  const prNodes: CourseNode[] = [];

  if (currentIndex !== -1) {
    if (currentIndex > 0) {
      prNodes.push({
        title: lessons[currentIndex - 1].title,
        slug: lessons[currentIndex - 1].slug,
        status: 'completed',
      });
    }
    prNodes.push({
      title: lessons[currentIndex].title,
      slug: lessons[currentIndex].slug,
      status: 'current',
    });
    if (currentIndex < lessons.length - 1) {
      prNodes.push({
        title: lessons[currentIndex + 1].title,
        slug: lessons[currentIndex + 1].slug,
        status: 'next',
      });
    }
  }

  // Keyboard navigation support for tabs
  const handleKeyDown = (e: React.KeyboardEvent, targetTab: 'prereqs' | 'task' | 'guides') => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setActiveTab(targetTab);
      const targetId = `tab-${targetTab}`;
      document.getElementById(targetId)?.focus();
    }
  };

  const handleQuizSubmit = (idx: number) => {
    setSelectedAnswer(idx);
    setShowFeedback(true);
  };

  const handleNextQuestion = () => {
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCurrentQuestionIndex((prev) => prev + 1);
  };



  return (
    <div className="w-full max-w-[780px] mx-auto mt-6 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] overflow-hidden shadow-[var(--shadow-card)] transition-all">
      {/* Tablist navigation (RTL friendly) */}
      <div
        role="tablist"
        aria-label="מרכז המידע של השיעור"
        className="flex border-b border-[var(--border)] bg-[var(--bg)] p-1 gap-1"
      >
        <button
          role="tab"
          id="tab-prereqs"
          aria-selected={activeTab === 'prereqs'}
          aria-controls="panel-prereqs"
          tabIndex={activeTab === 'prereqs' ? 0 : -1}
          onClick={() => setActiveTab('prereqs')}
          onKeyDown={(e) => handleKeyDown(e, activeTab === 'prereqs' ? 'task' : 'prereqs')}
          className={`flex-1 py-3 px-2 text-center font-rubik text-xs sm:text-sm font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
            ${activeTab === 'prereqs'
              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
        >
          ידע מקדים נדרש
        </button>

        <button
          role="tab"
          id="tab-task"
          aria-selected={activeTab === 'task'}
          aria-controls="panel-task"
          tabIndex={activeTab === 'task' ? 0 : -1}
          onClick={() => setActiveTab('task')}
          onKeyDown={(e) => handleKeyDown(e, activeTab === 'task' ? 'guides' : 'prereqs')}
          className={`flex-1 py-3 px-2 text-center font-rubik text-xs sm:text-sm font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
            ${activeTab === 'task'
              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
        >
          משימה מעשית
        </button>

        <button
          role="tab"
          id="tab-guides"
          aria-selected={activeTab === 'guides'}
          aria-controls="panel-guides"
          tabIndex={activeTab === 'guides' ? 0 : -1}
          onClick={() => setActiveTab('guides')}
          onKeyDown={(e) => handleKeyDown(e, activeTab === 'guides' ? 'task' : 'guides')}
          className={`flex-1 py-3 px-2 text-center font-rubik text-xs sm:text-sm font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2
            ${activeTab === 'guides'
              ? 'bg-[var(--surface)] text-[var(--accent)] shadow-sm'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)]/50'
            }`}
        >
          מדריכי ממשק (UI)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="p-5 font-body">
        
        {/* Tab 1: Prerequisites & Progress */}
        <div
          role="tabpanel"
          id="panel-prereqs"
          aria-labelledby="tab-prereqs"
          hidden={activeTab !== 'prereqs'}
          className="space-y-4"
        >
          <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
            שיעור זה נבנה על בסיס ידע משיעורים קודמים בקורס. מומלץ לוודא היכרות עם התכנים הבאים:
          </p>

          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative">
            {prNodes.map((node, idx) => (
              <React.Fragment key={node.slug}>
                {idx > 0 && (
                  <div
                    className="hidden md:block flex-1 h-[2px] bg-[var(--border)] relative"
                    aria-hidden="true"
                  >
                    <div
                      className={`absolute inset-y-0 start-0 transition-all duration-500 bg-[var(--accent-border)] ${
                        node.status === 'completed' || node.status === 'current' ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}

                {idx > 0 && (
                  <div
                    className="md:hidden w-[2px] h-4 bg-[var(--border)] ms-6"
                    aria-hidden="true"
                  />
                )}

                <div
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border transition-all duration-300 w-full md:w-auto md:max-w-[200px]
                    ${node.status === 'current'
                      ? 'bg-[var(--accent-dim)] border-[var(--accent-border)] shadow-[0_0_12px_rgba(74,227,181,0.15)] ring-2 ring-[var(--accent-border)]/20'
                      : node.status === 'completed'
                      ? 'bg-[var(--surface)] border-[var(--border)] opacity-75'
                      : 'bg-[var(--surface)] border-[var(--border)] opacity-40'
                    }`}
                >
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0
                      ${node.status === 'completed'
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)]'
                        : node.status === 'current'
                        ? 'bg-[var(--accent)] text-[var(--bg)]'
                        : 'bg-[var(--subtle)] text-[var(--muted)]'
                      }`}
                  >
                    {node.status === 'completed' ? '✓' : idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-[var(--muted)] font-rubik font-medium uppercase tracking-wider">
                      {node.status === 'completed' && 'הושלם'}
                      {node.status === 'current' && 'השיעור הנוכחי'}
                      {node.status === 'next' && 'השלב הבא'}
                    </div>
                    {node.status === 'current' ? (
                      <span className="block text-xs font-semibold truncate text-[var(--text)]">
                        {renderMixed(node.title.split(' - ')[0].split(' · ')[0])}
                      </span>
                    ) : (
                      <a
                        href={`/training/google-ads-course/${node.slug}`}
                        className="block text-xs font-semibold truncate hover:text-[var(--accent)] text-[var(--muted)] hover:underline transition-colors"
                      >
                        {renderMixed(node.title.split(' - ')[0].split(' · ')[0])}
                      </a>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Tab 2: Active Task & Retrieval Quiz */}
        <div
          role="tabpanel"
          id="panel-task"
          aria-labelledby="tab-task"
          hidden={activeTab !== 'task'}
          className="space-y-5"
        >
          {activeTask ? (
            <div className="p-4 bg-[var(--accent-dim)]/30 border-s-4 border-[var(--accent)] rounded-e-[var(--radius-sm)] space-y-2">
              <h4 className="text-sm font-bold text-[var(--accent)] font-rubik">עצור ובצע (Pause & Act)</h4>
              <p className="text-sm text-[var(--text)] whitespace-pre-line leading-relaxed">
                {renderMixed(activeTask)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">אין משימה מוגדרת לשיעור זה.</p>
          )}

          {currentQuestion && (
            <div className="border-t border-[var(--border)] pt-5 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-[var(--text)] font-rubik">מבדק הבנה מבוסס תרחיש</h4>
                {questions.length > 1 && (
                  <span className="text-xs text-[var(--muted)] font-medium">
                    שאלה {currentQuestionIndex + 1} מתוך {questions.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-[var(--text)] leading-relaxed font-medium">
                {renderMixed(currentQuestion.question)}
              </p>
              
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    disabled={showFeedback}
                    onClick={() => handleQuizSubmit(idx)}
                    className={`w-full text-start p-3 text-xs sm:text-sm rounded-[var(--radius-sm)] border transition-all cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]
                      ${showFeedback
                        ? idx === currentQuestion.correctAnswer
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-medium'
                          : idx === selectedAnswer
                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                          : 'bg-[var(--bg)] border-[var(--border)] opacity-60'
                        : 'bg-[var(--bg)] border-[var(--border)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-dim)]/5'
                      }`}
                  >
                    <div className="flex gap-3 items-center">
                      <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center shrink-0 text-xs">
                        {String.fromCharCode(97 + idx).toUpperCase()}
                      </span>
                      <span>{renderMixed(option)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {showFeedback && (
                <div className="mt-4 p-3.5 rounded-[var(--radius-sm)] text-xs sm:text-sm leading-relaxed border transition-all">
                  {selectedAnswer === currentQuestion.correctAnswer ? (
                    <div className="space-y-3">
                      <div className="text-emerald-400 font-semibold">
                        🎉 כל הכבוד! תשובה נכונה.
                      </div>
                      {currentQuestion.explanation && (
                        <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
                          {renderMixed(currentQuestion.explanation)}
                        </p>
                      )}
                      {currentQuestionIndex < questions.length - 1 ? (
                        <button
                          onClick={handleNextQuestion}
                          className="mt-2 px-4 py-2 bg-[var(--accent)] text-[var(--bg)] text-xs sm:text-sm font-semibold rounded-[var(--radius-sm)] hover:opacity-90 transition-all cursor-pointer"
                        >
                          המשך לשאלה הבאה ←
                        </button>
                      ) : (
                        <div className="text-emerald-400 font-bold text-xs sm:text-sm pt-2">
                          🌟 מבדק ההבנה הושלם בהצלחה! רכשת את יסודות השיעור בצורה מעולה.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-rose-400 font-semibold">
                        ❌ תשובה לא מדויקת.
                      </div>
                      {currentQuestion.explanation && (
                        <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">
                          {renderMixed(currentQuestion.explanation)}
                        </p>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAnswer(null);
                          setShowFeedback(false);
                        }}
                        className="mt-3 text-xs text-[var(--accent)] hover:underline font-bold block cursor-pointer"
                      >
                        נסה שוב ↻
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tab 3: UI Guides */}
        <div
          role="tabpanel"
          id="panel-guides"
          aria-labelledby="tab-guides"
          hidden={activeTab !== 'guides'}
          className="space-y-4"
        >
          {uiNavigator ? (
            <div className="space-y-5">
              {/* a) Action Sequence */}
              {uiNavigator.actionSequence && uiNavigator.actionSequence.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text)] font-rubik">
                    רצף פעולות מעשי:
                  </h4>
                  <div className="space-y-1.5 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3">
                    {uiNavigator.actionSequence.map((action, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 py-1.5 px-2 rounded hover:bg-[var(--surface)]/50 cursor-pointer transition-all ${
                          checkedActions[idx] ? 'opacity-50 line-through' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!checkedActions[idx]}
                          onChange={() => {
                            setCheckedActions(prev => ({
                              ...prev,
                              [idx]: !prev[idx]
                            }));
                          }}
                          className="mt-1 accent-[var(--accent)] cursor-pointer"
                        />
                        <span className="text-xs sm:text-sm text-[var(--text)] leading-relaxed select-none">
                          {renderMixed(action)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* b) Verified Guide Link */}
              <div className="space-y-2">
                <h4 className="text-xs sm:text-sm font-bold text-[var(--text)] font-rubik">
                  קישור למדריך מפורט:
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={uiNavigator.hebrewGuideUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--accent-dim)] border border-[var(--accent-border)] rounded-[var(--radius-sm)] text-xs sm:text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-all duration-200 shadow-sm"
                  >
                    <span>{renderMixed(uiNavigator.hebrewGuideLabel || 'מדריך גוגל הרשמי בעברית')}</span>
                    <svg
                      className="w-3.5 h-3.5 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                  {uiNavigator.demoVideoUrl && (
                    <a
                      href={uiNavigator.demoVideoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs sm:text-sm font-semibold text-[var(--text)] hover:border-[var(--accent-border)] hover:text-[var(--accent)] transition-all duration-200 shadow-sm"
                    >
                      <span>▶ {renderMixed(uiNavigator.demoVideoLabel || 'סרטון הדגמה מעשי')}</span>
                    </a>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] sm:text-xs font-semibold">
                    <span>✓</span>
                    <span>מאומת בעברית</span>
                  </span>
                </div>
              </div>

              {/* c) AI UI Navigator Prompt */}
              {uiNavigator.geminiPrompt && (
                <div className="space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-[var(--text)] font-rubik">
                    פרומפט מנווט ממשק:
                  </h4>
                  <div className="bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] p-3.5 space-y-2.5">
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-2.5 max-h-[150px] overflow-y-auto">
                      <pre className="text-xs text-[var(--muted)] leading-relaxed whitespace-pre-wrap font-mono select-all">
                        {renderMixed(uiNavigator.geminiPrompt)}
                      </pre>
                    </div>
                    <button
                      onClick={() => handleCopyPrompt(uiNavigator.geminiPrompt)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition-all cursor-pointer ${
                        copied
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--accent-border)] hover:text-[var(--accent)]'
                      }`}
                    >
                      <span>{copied ? '✅ הועתק בהצלחה!' : '📋 העתק פרומפט ל-Gemini'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* d) Troubleshooting / Usage Examples */}
              {uiNavigator.troubleshootingExamples && uiNavigator.troubleshootingExamples.length > 0 && (
                <details className="mt-3">
                  <summary className="font-semibold text-xs cursor-pointer text-[var(--accent)] hover:underline">
                    שאלות נפוצות ומקרי קצה (Gemini / ChatGPT)
                  </summary>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-[var(--text)] leading-relaxed ps-2">
                    {uiNavigator.troubleshootingExamples.map((example, idx) => (
                      <li key={idx} className="marker:text-[var(--accent)]">
                        {renderMixed(example)}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Additional UI Guides if present */}
              {uiGuides.length > 0 && (
                <div className="pt-4 border-t border-[var(--border)] space-y-2">
                  <h5 className="text-xs font-bold text-[var(--muted)] font-rubik">מדריכי ממשק מקיפים נוספים:</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uiGuides.map((guide) => (
                      <a
                        key={guide.href}
                        href={guide.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-dim)]/5 transition-all duration-200"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          {guide.isMustWatch && (
                            <span className="inline-self-start text-[9px] font-bold text-[var(--bg)] bg-[var(--accent)] px-1.5 py-0.5 rounded-[3px] w-max">
                              מדריך חובה
                            </span>
                          )}
                          <span className="block text-xs sm:text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
                            {renderMixed(guide.label)}
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0 ms-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {uiGuides.length > 0 ? (
                <>
                  <p className="text-sm text-[var(--muted)] mb-4 leading-relaxed">
                    מדריכי ניווט מעשיים צעד-אחר-צעד בממשק Google Ads. מומלץ להיעזר בהם במקביל לתרגול:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {uiGuides.map((guide) => (
                      <a
                        key={guide.href}
                        href={guide.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-3.5 bg-[var(--bg)] border border-[var(--border)] rounded-[var(--radius-sm)] hover:border-[var(--accent-border)] hover:bg-[var(--accent-dim)]/5 transition-all duration-200"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          {guide.isMustWatch && (
                            <span className="inline-self-start text-[9px] font-bold text-[var(--bg)] bg-[var(--accent)] px-1.5 py-0.5 rounded-[3px] w-max">
                              מדריך חובה
                            </span>
                          )}
                          <span className="block text-xs sm:text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)] transition-colors truncate">
                            {renderMixed(guide.label)}
                          </span>
                        </div>
                        <svg
                          className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors shrink-0 ms-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--muted)]">אין מדריכי ממשק מוגדרים לשיעור זה.</p>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
