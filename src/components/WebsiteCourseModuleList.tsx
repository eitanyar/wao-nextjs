'use client';

import Link from "next/link";
import { renderMixed } from "@/lib/bidi";
import { WebsiteLesson, WebsiteModule } from "@/data/website-course-data";

interface LessonCardProps {
  lesson: WebsiteLesson;
  index: number;
  module: WebsiteModule;
}

function LessonCard({ lesson, index, module }: LessonCardProps) {
  return (
    <Link
      href={`/training/website-course/${lesson.slug}`}
      style={{ textDecoration: "none" }}
    >
      <div
        className="website-lesson-card"
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          transition: "border-color 0.2s, box-shadow 0.2s",
          cursor: "pointer",
          // Custom property for per-module accent color
          ["--module-accent" as string]: module.color,
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = module.color + "88";
          (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${module.color}18`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        }}
      >
        {/* Thumbnail */}
        <div
          style={{
            flexShrink: 0,
            width: "120px",
            height: "68px",
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            background: "#0b0f19",
            position: "relative",
          }}
        >
          <img
            src={lesson.thumbnail}
            alt={lesson.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.28)",
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>▶</span>
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: module.color,
              fontWeight: 600,
              marginBottom: "4px",
              fontFamily: "var(--font-body), sans-serif",
            }}
          >
            שיעור {index + 1} · {lesson.duration}
          </div>
          <div
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              marginBottom: "6px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderMixed(lesson.title)}
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--muted)",
              fontFamily: "var(--font-body), sans-serif",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {renderMixed(lesson.description)}
          </div>
        </div>

        {/* RTL back-arrow */}
        <span style={{ color: "var(--muted)", fontSize: "1.2rem", flexShrink: 0 }} aria-hidden>
          ‹
        </span>
      </div>
    </Link>
  );
}

interface ModuleListProps {
  modules: WebsiteModule[];
}

export default function WebsiteCourseModuleList({ modules }: ModuleListProps) {
  return (
    <>
      {modules.map((module) => (
        <div key={module.num} style={{ marginBottom: "3rem" }}>
          {/* Module header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              marginBottom: "1.5rem",
              paddingBottom: "1rem",
              borderBottom: `2px solid ${module.color}22`,
            }}
          >
            <span style={{ fontSize: "1.8rem" }}>{module.icon}</span>
            <div>
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: module.color,
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body), sans-serif",
                  marginBottom: "2px",
                }}
              >
                מודול {module.num} — {module.subtitle}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-rubik), sans-serif",
                  fontWeight: 700,
                  fontSize: "1.15rem",
                }}
              >
                {renderMixed(module.title)}
              </div>
            </div>
          </div>

          {/* Lessons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {module.lessons.map((lesson, idx) => (
              <LessonCard key={lesson.slug} lesson={lesson} index={idx} module={module} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
