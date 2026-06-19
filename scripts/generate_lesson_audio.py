#!/usr/bin/env python3
import os
import sys
import re
import json
import argparse
import urllib.request
import urllib.error

def load_api_key_from_env_file(filepath):
    if not os.path.exists(filepath):
        print(f"[{filepath}] not found, checking environment variables...")
        return None
    print(f"Reading API key from {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, val = line.split('=', 1)
                    key = key.strip()
                    val = val.strip()
                    if val.startswith('"') and val.endswith('"'):
                        val = val[1:-1]
                    elif val.startswith("'") and val.endswith("'"):
                        val = val[1:-1]
                    if key == 'ELEVENLABS_API_KEY':
                        return val
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)
    return None

def parse_markdown_narration(filepath):
    print(f"Parsing markdown script at: {filepath}")
    if not os.path.exists(filepath):
        print(f"Error: Script file {filepath} not found.", file=sys.stderr)
        sys.exit(1)
        
    all_narrations = []
    current_narration = []
    in_narration = False
    
    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line_stripped = line.strip()
            
            # Slide separator
            if line_stripped == '---':
                if in_narration:
                    narration_text = "\n".join(current_narration).strip()
                    if narration_text:
                        all_narrations.append(narration_text)
                    current_narration = []
                    in_narration = False
            # Narration start indicator
            elif re.match(r'^\s*(🎙|🎙️)?\s*\*\*Narration.*?\*\*', line_stripped):
                if in_narration:
                    narration_text = "\n".join(current_narration).strip()
                    if narration_text:
                        all_narrations.append(narration_text)
                    current_narration = []
                in_narration = True
                
                # Check for same-line text after the markdown indicator
                match = re.match(r'^\s*(🎙|🎙️)?\s*\*\*Narration.*?\*\*\s*(?::)?\s*(.*)$', line_stripped)
                if match:
                    extra = match.group(2).strip()
                    if extra:
                        current_narration.append(extra)
            elif in_narration:
                current_narration.append(line.rstrip('\r\n'))
                
    # EOF handling
    if in_narration:
        narration_text = "\n".join(current_narration).strip()
        if narration_text:
            all_narrations.append(narration_text)
            
    print(f"Successfully parsed {len(all_narrations)} narration blocks.")
    for idx, block in enumerate(all_narrations, 1):
        preview = block[:50].replace('\n', ' ') + '...' if len(block) > 50 else block
        print(f"  Block {idx}: {preview} ({len(block)} chars)")
    return all_narrations

def synthesize_audio(api_key, text, voice_id, model_id, output_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    
    print(f"Calling ElevenLabs API...")
    print(f"Voice ID: {voice_id}")
    print(f"Model ID: {model_id}")
    print(f"Text length: {len(text)} characters")
    print(f"Target Output: {output_path}")
    
    try:
        with urllib.request.urlopen(req) as response:
            audio_data = response.read()
            
            # Ensure the output directory exists
            output_dir = os.path.dirname(output_path)
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                
            with open(output_path, 'wb') as out_f:
                out_f.write(audio_data)
            print(f"Success! Audio saved to {output_path} ({len(audio_data)} bytes).")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        try:
            err_body = e.read().decode('utf-8')
            print(f"Response details: {err_body}", file=sys.stderr)
        except Exception:
            pass
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Network Connection Error: {e.reason}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected Error: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Generate Hebrew audio narration for Google Ads Course lessons using ElevenLabs.")
    parser.add_argument("--voice-id", "-v", default="bfGb7JTLUnZebZRiFYyq", help="ElevenLabs Voice ID (default: bfGb7JTLUnZebZRiFYyq)")
    parser.add_argument("--script", "-s", default="docs/scripts/L14-performance-max.md", help="Path to markdown script file")
    parser.add_argument("--output", "-o", default="scratch/lesson-14-narration.mp3", help="Output audio path")
    parser.add_argument("--model", "-m", default="eleven_multilingual_v3", help="ElevenLabs Model ID (default: eleven_multilingual_v3)")
    parser.add_argument("--env-file", default=".env.local", help="Path to environment file")
    
    args = parser.parse_args()
    
    # Load API Key
    api_key = load_api_key_from_env_file(args.env_file)
    if not api_key:
        api_key = os.environ.get('ELEVENLABS_API_KEY')
        if not api_key:
            print("Error: ELEVENLABS_API_KEY is not defined in .env.local or environment variables.", file=sys.stderr)
            print("Please add 'ELEVENLABS_API_KEY=your_key' to .env.local or set the environment variable.", file=sys.stderr)
            sys.exit(1)
            
    # Extract Narration Blocks
    blocks = parse_markdown_narration(args.script)
    if not blocks:
        print("Warning: No narration blocks found in the script file.", file=sys.stderr)
        sys.exit(1)
        
    # Combine blocks with newlines to form natural pauses
    combined_script = "\n\n\n".join(blocks)
    
    # Synthesize
    synthesize_audio(
        api_key=api_key,
        text=combined_script,
        voice_id=args.voice_id,
        model_id=args.model,
        output_path=args.output
    )

if __name__ == "__main__":
    main()
