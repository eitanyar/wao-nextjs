import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import {
  MAX_UPLOAD_FILES,
  MAX_UPLOAD_REQUEST_BYTES,
  acceptedUploadExtension,
  resolveUploadDir,
} from "@/lib/uploads/intakeUploadPolicy";

// Called by the public Ads Bot onboarding page with no client session (see
// src/lib/uploads/intakeUploadPolicy.js): the write is made safe here; whether it must also
// be authenticated is an open decision.
export async function POST(req: NextRequest) {
  try {
    const declaredLength = Number(req.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > MAX_UPLOAD_REQUEST_BYTES) {
      return NextResponse.json({ error: "Upload too large" }, { status: 413 });
    }

    const formData = await req.formData();
    const sessionId = formData.get("sessionId");
    const uploadDir = resolveUploadDir(process.cwd(), sessionId);
    if (!uploadDir || typeof sessionId !== "string") {
      return NextResponse.json({ error: "Invalid sessionId" }, { status: 400 });
    }

    const files = formData.getAll("files").filter((f): f is File => typeof f !== "string");

    if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });
    if (files.length > MAX_UPLOAD_FILES) return NextResponse.json({ error: `Max ${MAX_UPLOAD_FILES} files` }, { status: 400 });

    const urls: string[] = [];
    let dirReady = false;

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = acceptedUploadExtension({ type: file.type, size: buffer.length }, buffer);
      if (!ext) continue;

      if (!dirReady) {
        await mkdir(uploadDir, { recursive: true });
        dirReady = true;
      }
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      await writeFile(path.join(uploadDir, filename), buffer);
      urls.push(`/uploads/${sessionId}/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (err: unknown) {
    console.error("[upload] error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
