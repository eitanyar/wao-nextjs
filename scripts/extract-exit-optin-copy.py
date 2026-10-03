from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent.parent
lines = (root / 'docs/copy/exit-prompt-optin-copy-2026-10-03.md').read_text().splitlines()
pairs = [match.groups() for line in lines[12:59] if (match := re.fullmatch(r'(optin\.[\w.]+): (.+)', line))]
assert len(pairs) == len(dict(pairs)) == 23
(root / 'src/content/exit-optin-copy.json').write_text(json.dumps(dict(pairs), ensure_ascii=False, indent=2) + '\n')
print('Extracted:', len(pairs))
source = (root / 'src/components/ExitSurveyPopup.tsx').read_text().splitlines()
icons = ('\U0001f3e5', '\u2696', '\U0001f6cd', '\U0001f4bc')
labels = [line.strip() for line in source if line.strip().startswith(icons)]
assert len(labels) == 4
(root / 'src/content/exit-optin-niches.json').write_text(json.dumps(dict(zip(('clinic', 'lawyer', 'ecommerce', 'other'), labels)), ensure_ascii=False, indent=2) + '\n')
