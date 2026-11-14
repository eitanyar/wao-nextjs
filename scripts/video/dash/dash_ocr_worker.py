"""OCR worker for the screen-text evidence (dash_screen_text.py). Runs under the OCR venv, not the system Python:

    scratch/ocr-venv/bin/python scripts/video/dash/dash_ocr_worker.py <list.json> <out.json>

list.json = ["/abs/frame.png", ...]. out.json = {path: [{"box": [x0, y0, x1, y1], "text": str, "score": float}]}.
Engine: RapidOCR (PP-OCR detection + Latin/Chinese recognition, ONNX, local, free). Detection finds text lines in any
script, Hebrew included, so the boxes serve the caption-overlap check; recognition reads Latin reliably (the test-string
blocklist is Latin) and returns noise for Hebrew, which the blocklist ignores. No Hebrew here.
Setup: python3 -m venv scratch/ocr-venv && scratch/ocr-venv/bin/pip install rapidocr_onnxruntime
"""
import json, sys

from rapidocr_onnxruntime import RapidOCR


def main():
    paths = json.load(open(sys.argv[1]))
    eng = RapidOCR()
    out = {}
    for p in paths:
        res, _ = eng(p)
        rows = []
        for box, text, score in (res or []):
            xs = [q[0] for q in box]; ys = [q[1] for q in box]
            rows.append(dict(box=[float(min(xs)), float(min(ys)), float(max(xs)), float(max(ys))], text=str(text), score=float(score)))
        out[p] = rows
    json.dump(out, open(sys.argv[2], "w"))


if __name__ == "__main__":
    main()
