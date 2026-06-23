#!/usr/bin/env python3
"""
view_narration.py — Extract narration blocks from a Marp lesson file
and render them as a browser-viewable RTL HTML file.

Usage:
  python3 scripts/view_narration.py docs/scripts/website-course/L1-1-domain.md
  python3 scripts/view_narration.py docs/scripts/website-course/L1-2-domain-naming.md
"""

import sys
import re
import os

def extract_narration_blocks(md_path):
    with open(md_path, encoding="utf-8") as f:
        content = f.read()

    # Split on slide separators
    slides = re.split(r'\n---\n', content)

    blocks = []
    slide_num = 0

    # Detect format
    new_format = '🎙️ Narration:' not in content and '<!--' in content

    for section in slides:
        # Skip frontmatter (has marp: true)
        if 'marp: true' in section:
            continue

        if new_format:
            # New format: narration inside <!-- --> HTML comments
            # Skip pure comment/label sections
            comment_match = re.search(r'<!--(.*?)-->', section, re.DOTALL)
            # Check if section has actual slide content (heading or bullet)
            has_content = bool(re.search(r'^#{1,3} .+', section, re.MULTILINE) or
                               re.search(r'^[-*] .+', section, re.MULTILINE))
            if has_content and comment_match:
                narration = comment_match.group(1).strip()
                if narration:
                    slide_num += 1
                    blocks.append((slide_num, narration))
        else:
            # Old format: separate --- narration slides with 🎙️ Narration: marker
            if '🎙️ Narration:' in section:
                narration = section.split('🎙️ Narration:', 1)[1].strip()
                slide_num += 1
                blocks.append((slide_num, narration))

    return blocks


def generate_html(blocks, lesson_title, output_path):
    items_html = ""
    for i, (slide_num, text) in enumerate(blocks, 1):
        # Escape HTML
        text_html = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        # Wrap each line in a <p>
        lines = [f"<p>{line}</p>" if line.strip() else "" for line in text_html.split("\n")]
        text_block = "\n".join(lines)

        items_html += f"""
        <div class="card">
          <div class="label">שקופית {slide_num}</div>
          <div class="narration">{text_block}</div>
        </div>
"""

    html = f"""<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>נארציה — {lesson_title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      direction: rtl;
      text-align: right;
      font-family: 'Rubik', Arial, sans-serif;
      background: #0f1117;
      color: #eee9e2;
      padding: 40px 20px;
      line-height: 1.8;
    }}
    h1 {{
      color: #4ae3b5;
      font-size: 1.6rem;
      margin-bottom: 8px;
      border-bottom: 2px solid #4ae3b5;
      padding-bottom: 10px;
    }}
    .subtitle {{
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 40px;
    }}
    .card {{
      background: #1a1e2e;
      border-right: 4px solid #4ae3b5;
      border-radius: 8px;
      padding: 24px 28px;
      margin-bottom: 24px;
      max-width: 860px;
    }}
    .label {{
      font-size: 0.78rem;
      color: #ffd000;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
      text-transform: uppercase;
    }}
    .narration p {{
      font-size: 1.15rem;
      margin-bottom: 8px;
      color: #eee9e2;
    }}
    .narration p:empty {{ display: none; }}
  </style>
</head>
<body>
  <h1>🎙️ נארציה — {lesson_title}</h1>
  <p class="subtitle">קרא לפני ה-render. בדוק כל בלוק בנפרד.</p>
  {items_html}
</body>
</html>"""

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"✅ Viewer saved: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/view_narration.py <lesson.md>")
        sys.exit(1)

    md_path = sys.argv[1]
    lesson_title = os.path.basename(md_path).replace(".md", "")

    # Output next to the script
    output_dir = os.path.join(os.path.dirname(md_path))
    output_path = os.path.join(output_dir, lesson_title + "_narration_review.html")

    blocks = extract_narration_blocks(md_path)
    print(f"Found {len(blocks)} narration blocks")
    generate_html(blocks, lesson_title, output_path)
