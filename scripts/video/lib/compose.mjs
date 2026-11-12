// Stages 3, 6, 7: timeline math, ffmpeg argument builders (pure), ffprobe checks,
// frame export. Text is never drawn by ffmpeg: captions arrive as transparent PNGs.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const VIDEO_EXT = /\.(mp4|mov|webm|mkv)$/i;
const r3 = (x) => Math.round(x * 1000) / 1000;

export const sha256File = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");

/** {id}_{seconds}s_{aspect}_he_v{n} */
export function outputBase({ id, slotSeconds, version, lang = "he" }, aspect) {
  return `${id}_${slotSeconds}s_${aspect}_${lang}_v${version}`;
}

// ---------------------------------------------------------------- timeline

/**
 * Beat lengths from audio durations, snapped up to whole frames. Every beat is its
 * take plus a gap; the end screen is held at least endHold seconds.
 * beats: [{ audioDuration, isEnd }] -> { beats: [{ start, duration, audioDuration }], total }
 */
export function buildTimeline(beats, { fps, gap, endHold }) {
  let t = 0;
  const out = beats.map((b) => {
    const want = b.isEnd ? Math.max(b.audioDuration + gap, endHold) : b.audioDuration + gap;
    const frames = Math.ceil(want * fps - 1e-6);
    const beat = { start: r3(t / fps), duration: r3(frames / fps), frames, audioDuration: b.audioDuration };
    t += frames;
    return beat;
  });
  return { beats: out, total: r3(t / fps), frames: t };
}

// ---------------------------------------------------------------- ffmpeg args

/** One audio track: each take padded to its beat length, joined, optionally loudness-normalised. */
export function audioArgs({ takes, out, loudnorm = true }) {
  const args = ["-y", "-v", "error"];
  const parts = [];
  takes.forEach((t, i) => {
    args.push("-i", t.file);
    parts.push(`[${i}:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,apad=whole_dur=${t.duration},atrim=0:${t.duration},asetpts=PTS-STARTPTS[a${i}]`);
  });
  const joined = takes.map((_, i) => `[a${i}]`).join("");
  parts.push(`${joined}concat=n=${takes.length}:v=0:a=1${loudnorm ? ",loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000" : ""}[aout]`);
  args.push("-filter_complex", parts.join(";"), "-map", "[aout]", "-c:a", "pcm_s16le", out);
  return args;
}

/**
 * Final composite for one aspect.
 * segments: [{ file, duration, crop? }] (still image or video, scaled to cover the frame)
 * captions: [{ png, from, to }] full-frame transparent PNGs, absolute seconds
 */
export function composeArgs({ width, height, fps, crf = 18, segments, captions, audio, total, out }) {
  const args = ["-y", "-v", "error"];
  const parts = [];
  segments.forEach((s, i) => {
    if (VIDEO_EXT.test(s.file)) args.push("-stream_loop", "-1", "-t", String(s.duration), "-i", s.file);
    else args.push("-loop", "1", "-framerate", String(fps), "-t", String(s.duration), "-i", s.file);
    const crop = s.crop ? `crop=${s.crop.w}:${s.crop.h}:${s.crop.x}:${s.crop.y},` : "";
    parts.push(`[${i}:v]${crop}scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps},format=yuv420p,trim=duration=${s.duration},setpts=PTS-STARTPTS[v${i}]`);
  });
  const n = segments.length;
  parts.push(`${segments.map((_, i) => `[v${i}]`).join("")}concat=n=${n}:v=1:a=0[base0]`);
  captions.forEach((c, k) => {
    args.push("-i", c.png);
    parts.push(`[base${k}][${n + k}:v]overlay=0:0:enable='gte(t,${c.from})*lt(t,${c.to})'[base${k + 1}]`);
  });
  args.push("-i", audio);
  const audioIdx = n + captions.length;
  args.push(
    "-filter_complex", parts.join(";"),
    "-map", `[base${captions.length}]`, "-map", `${audioIdx}:a`,
    "-c:v", "libx264", "-preset", "medium", "-crf", String(crf), "-pix_fmt", "yuv420p", "-r", String(fps),
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
    "-t", String(total), "-movflags", "+faststart", out,
  );
  return args;
}

export function ffmpeg(args) {
  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"], maxBuffer: 64 * 1024 * 1024 });
}

// ---------------------------------------------------------------- checks

export function ffprobe(file) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height,pix_fmt,r_frame_rate,sample_rate,channels,duration", "-of", "json", file], { encoding: "utf8" });
  const j = JSON.parse(raw);
  const v = j.streams.find((s) => s.codec_type === "video");
  const a = j.streams.find((s) => s.codec_type === "audio");
  return {
    duration: Number(j.format.duration),
    bytes: Number(j.format.size),
    video: v ? { codec: v.codec_name, width: v.width, height: v.height, pixFmt: v.pix_fmt, fps: v.r_frame_rate } : null,
    audio: a ? { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels } : null,
  };
}

/** Compare an ffprobe result with what the timeline promised. Returns failure strings. */
export function probeProblems(probe, { width, height, fps, total, slotSeconds, endHold, endHoldMin, tolerance = 0.1 }) {
  const e = [];
  if (!probe.video) e.push("no video stream");
  else {
    if (probe.video.width !== width || probe.video.height !== height) e.push(`resolution ${probe.video.width}x${probe.video.height}, expected ${width}x${height}`);
    if (probe.video.codec !== "h264" || probe.video.pixFmt !== "yuv420p") e.push(`video is ${probe.video.codec}/${probe.video.pixFmt}, expected h264/yuv420p`);
    if (probe.video.fps !== `${fps}/1`) e.push(`frame rate ${probe.video.fps}, expected ${fps}/1`);
  }
  if (!probe.audio) e.push("no audio stream");
  if (Math.abs(probe.duration - total) > tolerance) e.push(`duration ${probe.duration}s, timeline says ${total}s`);
  if (probe.duration > slotSeconds + tolerance) e.push(`duration ${probe.duration}s exceeds the ${slotSeconds}s slot`);
  if (endHold < endHoldMin) e.push(`end screen held ${endHold}s, minimum ${endHoldMin}s`);
  return e;
}

export function extractFrame(video, t, png) {
  mkdirSync(path.dirname(png), { recursive: true });
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(r3(t)), "-i", video, "-frames:v", "1", png]);
}
