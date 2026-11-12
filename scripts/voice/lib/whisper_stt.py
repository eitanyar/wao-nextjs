"""Local Hebrew STT fallback (faster-whisper) with word timestamps.

Prints a Scribe-shaped JSON response on stdout:
  {"language_code": "he", "text": "...", "words": [{"text", "start", "end", "type": "word", "logprob"}]}

usage: python whisper_stt.py <audio> [--model ivrit-ai/whisper-large-v3-turbo-ct2] [--device auto|cuda|cpu]
Run with the venv in scratch/voice-venv (pip install faster-whisper).
"""
import argparse
import json
import subprocess
import sys

import numpy as np

from faster_whisper import WhisperModel


def load(model, device):
    if device in ("auto", "cuda"):
        try:
            return WhisperModel(model, device="cuda", compute_type="float16")
        except Exception as e:  # missing CUDA libs -> CPU
            if device == "cuda":
                raise
            print(f"cuda unavailable ({e}); using cpu", file=sys.stderr)
    return WhisperModel(model, device="cpu", compute_type="int8")


def decode(path):
    # ffmpeg -> 16 kHz mono float32 (avoids PyAV version drift).
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--model", default="ivrit-ai/whisper-large-v3-turbo-ct2")
    ap.add_argument("--device", default="cpu")
    a = ap.parse_args()
    m = load(a.model, a.device)
    segs, _info = m.transcribe(decode(a.audio), language="he", word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False)
    words, text = [], []
    for s in segs:
        text.append(s.text.strip())
        for w in s.words or []:
            words.append({"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3), "type": "word", "logprob": round(w.probability, 4)})
    json.dump({"language_code": "he", "text": " ".join(text), "words": words, "provider": f"faster-whisper:{a.model}"}, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
