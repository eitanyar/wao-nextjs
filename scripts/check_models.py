import os
with open('/home/eitanya/wao/.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, _, v = line.partition('=')
            os.environ[k] = v
from elevenlabs.client import ElevenLabs
c = ElevenLabs(api_key=os.environ['ELEVENLABS_API_KEY'])
models = c.models.list()
for m in models:
    print(m.model_id, '|', m.name)
