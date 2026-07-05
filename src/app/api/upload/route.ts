import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 6;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const sessionId = (formData.get("sessionId") as string) || "default";
    const files = formData.getAll("files") as File[];

    if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });
    if (files.length > MAX_FILES) return NextResponse.json({ error: `Max ${MAX_FILES} files` }, { status: 400 });

    const uploadDir = path.join(process.cwd(), "public", "uploads", sessionId);
    await mkdir(uploadDir, { recursive: true });

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) continue;
      if (file.size > MAX_SIZE_BYTES) continue;

      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(uploadDir, filename), buffer);
      urls.push(`/uploads/${sessionId}/${filename}`);
    }

    return NextResponse.json({ urls });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
