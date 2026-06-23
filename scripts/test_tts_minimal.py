import os, requests

with open("/home/eitanya/wao/.env.local") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ[k.strip()] = v.strip().strip('"')

api_key = os.environ["ELEVENLABS_API_KEY"]
voice_id = "bfGb7JTLUnZebZRiFYyq"
model_id = "eleven_v3"

url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
headers = {
    "Accept": "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": api_key,
}
payload = {
    "text": "שלום, מה שלומך? זהו מבחן קצר בעברית.",
    "model_id": model_id,
    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
}

os.makedirs("/home/eitanya/wao/output/test", exist_ok=True)
r = requests.post(url, json=payload, headers=headers)
print(f"Status: {r.status_code}")
if r.status_code == 200:
    with open("/home/eitanya/wao/output/test/minimal_test.mp3", "wb") as f:
        f.write(r.content)
    print(f"Saved: {len(r.content)} bytes -> output/test/minimal_test.mp3")
else:
    print(f"Error: {r.text}")
