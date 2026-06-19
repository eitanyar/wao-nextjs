#!/usr/bin/env python3
import os
import sys
import re
import json
import argparse
import urllib.request
import urllib.error
import subprocess

# Force MoviePy / ImageIO to use our local static ffmpeg binary
os.environ["IMAGEIO_FFMPEG_EXE"] = os.path.abspath("scratch/ffmpeg/ffmpeg")

def load_api_key(env_path=".env.local"):
    if not os.path.exists(env_path):
        return os.environ.get('ELEVENLABS_API_KEY')
    with open(env_path, 'r', encoding='utf-8') as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                key, val = line.split('=', 1)
                if key.strip() == 'ELEVENLABS_API_KEY':
                    val = val.strip()
                    if val.startswith(('"', "'")) and val.endswith(('"', "'")):
                        val = val[1:-1]
                    return val
    return os.environ.get('ELEVENLABS_API_KEY')

def parse_narration_blocks(script_path):
    print(f"Parsing script: {script_path}")
    if not os.path.exists(script_path):
        print(f"Error: Script {script_path} not found.")
        sys.exit(1)
        
    with open(script_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Standardize newlines
    content = content.replace('\r\n', '\n')
    
    # Split by slide separator
    # Marp slides are separated by '---' on a line by itself
    raw_slides = re.split(r'\n---\n|^---\n', content)
    
    # Filter out empty blocks or frontmatter
    slides = []
    for slide in raw_slides:
        slide = slide.strip()
        if not slide:
            continue
        # If it's the frontmatter (contains marp: true or config), skip it
        if 'marp:' in slide or 'theme:' in slide:
            continue
        slides.append(slide)
        
    blocks = []
    for idx, slide_content in enumerate(slides, 1):
        lines = slide_content.split('\n')
        narration_lines = []
        in_narration = False
        for line in lines:
            line_str = line.strip()
            if re.match(r'^\s*(🎙|🎙️)?\s*\*\*Narration.*?\*\*', line_str):
                in_narration = True
                match = re.match(r'^\s*(🎙|🎙️)?\s*\*\*Narration.*?\*\*\s*(?::)?\s*(.*)$', line_str)
                if match and match.group(2).strip():
                    narration_lines.append(match.group(2).strip())
            elif in_narration:
                narration_lines.append(line.rstrip('\r\n'))
        blocks.append("\n".join(narration_lines).strip())
        
    print(f"Parsed {len(blocks)} actual slide narration blocks.")
    return blocks

def synthesize_slide_audio(api_key, text, voice_id, model_id, output_path):
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "accept": "audio/mpeg"
    }
    payload = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75}
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as response:
            audio_data = response.read()
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(audio_data)
            return True
    except urllib.error.HTTPError as e:
        print(f"TTS HTTP Error {e.code}: {e.reason}", file=sys.stderr)
        try:
            err_body = e.read().decode('utf-8')
            print(f"Details: {err_body}", file=sys.stderr)
        except Exception:
            pass
        return False
    except Exception as e:
        print(f"TTS Error on text '{text[:30]}...': {e}", file=sys.stderr)
        return False

def generate_video(audio_dir, slides_dir, output_video_path, num_slides, slide_pause=1.5):
    # Import moviepy inside the function after setting the environment variable
    try:
        from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
    except ImportError:
        try:
            from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
        except ImportError:
            print("Error: moviepy is not installed. Run 'pip install moviepy' first.")
            sys.exit(1)
        
    clips = []
    print("Stitching slides and audio together...")
    
    for i in range(1, num_slides + 1):
        # Marp CLI outputs files with 1-based indexing, padded with 3 zeros by default (e.g. slide.001.png)
        image_path = os.path.join(slides_dir, f"slide.{i:03d}.png")
        if not os.path.exists(image_path):
            # Try 1-based non-padded or other naming conventions
            image_path = os.path.join(slides_dir, f"slide.{i}.png")
            if not os.path.exists(image_path):
                print(f"Warning: Slide image {image_path} not found. Skipping slide {i}.")
                continue
                
        audio_path = os.path.join(audio_dir, f"slide_{i}.mp3")
        if not os.path.exists(audio_path):
            print(f"Warning: Audio file {audio_path} not found. Using 3-second silent slide.")
            # Create a silent dummy clip
            img_clip = ImageClip(image_path)
            img_clip = img_clip.with_duration(3.0) if hasattr(img_clip, "with_duration") else img_clip.set_duration(3.0)
            clips.append(img_clip)
            continue
            
        print(f"Processing slide {i}: {image_path} + {audio_path}")
        audio_clip = AudioFileClip(audio_path)
        img_clip = ImageClip(image_path)
        clip_duration = audio_clip.duration + slide_pause
        img_clip = img_clip.with_duration(clip_duration) if hasattr(img_clip, "with_duration") else img_clip.set_duration(clip_duration)
        img_clip = img_clip.with_audio(audio_clip) if hasattr(img_clip, "with_audio") else img_clip.set_audio(audio_clip)
        clips.append(img_clip)
        
    if not clips:
        print("Error: No video clips were generated.")
        sys.exit(1)
        
    print(f"Concatenating {len(clips)} slide clips...")
    final_clip = concatenate_videoclips(clips, method="compose")
    
    os.makedirs(os.path.dirname(output_video_path), exist_ok=True)
    print(f"Writing final video file to {output_video_path}...")
    final_clip.write_videofile(
        output_video_path,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        temp_audiofile="scratch/temp-audio.m4a",
        remove_temp=True
    )
    print("Video compilation finished successfully!")

def create_clean_slides_file(original_script_path, output_temp_path):
    print(f"Creating cleaned slides markdown (removing narration blocks) to: {output_temp_path}")
    with open(original_script_path, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    cleaned_lines = []
    in_narration = False
    
    for line in lines:
        line_stripped = line.strip()
        
        # Check if this line starts a narration block
        if re.match(r'^\s*(🎙|🎙️)?\s*\*\*Narration.*?\*\*', line_stripped):
            in_narration = True
            continue
            
        # If we are in narration and find a slide separator, end narration mode
        if in_narration and line_stripped == '---':
            in_narration = False
            
        if not in_narration:
            cleaned_lines.append(line)
            
    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_temp_path), exist_ok=True)
    with open(output_temp_path, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)

def main():
    parser = argparse.ArgumentParser(description="Compile Google Ads Course lesson video (Marp CLI slides + ElevenLabs audio).")
    parser.add_argument("--script", "-s", default="docs/scripts/L1-ai-first-ppc-mindset.md", help="Path to markdown script")
    parser.add_argument("--output", "-o", default="public/videos/lesson-1.mp4", help="Output MP4 video path")
    parser.add_argument("--voice-id", default="bfGb7JTLUnZebZRiFYyq", help="ElevenLabs Voice ID")
    parser.add_argument("--model", default="eleven_v3", help="ElevenLabs Model ID")
    parser.add_argument("--skip-audio", action="store_true", help="Skip ElevenLabs audio synthesis (use existing cache)")
    parser.add_argument("--skip-slides", action="store_true", help="Skip Marp slide generation (use existing cache)")
    parser.add_argument("--slide-pause", type=float, default=1.5, help="Pause duration (in seconds) at the end of each slide")
    
    args = parser.parse_args()
    
    api_key = load_api_key()
    if not api_key and not args.skip_audio:
        print("Error: ELEVENLABS_API_KEY is missing. Use --skip-audio if you already have the audio files synthesized.")
        sys.exit(1)
        
    # 1. Parse narration blocks and count slides
    narration_blocks = parse_narration_blocks(args.script)
    slides_count = len(narration_blocks)
    print(f"Script has {slides_count} actual slides (excluding frontmatter).")
    
    audio_dir = "scratch/slides_audio"
    slides_dir = "scratch/slides"
    
    # 2. Synthesize audio per slide
    if not args.skip_audio:
        print("Starting ElevenLabs slide-by-slide synthesis...")
        for i, block in enumerate(narration_blocks, 1):
            output_file = os.path.join(audio_dir, f"slide_{i}.mp3")
            if not block.strip():
                print(f"Slide {i} has no narration. Skipping synthesis.")
                continue
            print(f"Synthesizing Slide {i} ({len(block)} characters)...")
            success = synthesize_slide_audio(
                api_key=api_key,
                text=block,
                voice_id=args.voice_id,
                model_id=args.model,
                output_path=output_file
            )
            if not success:
                print(f"Error synthesizing slide {i}. Aborting.")
                sys.exit(1)
    else:
        print("Skipping audio synthesis. Using cached audio files.")
        
    # 3. Generate slides as PNG using Marp CLI
    if not args.skip_slides:
        print("Generating slide images via Marp CLI...")
        os.makedirs(slides_dir, exist_ok=True)
        
        # Create a temp markdown file with narration blocks removed so they aren't rendered on screen
        temp_script_path = "scratch/temp_slides.md"
        create_clean_slides_file(args.script, temp_script_path)
        
        # Search for custom downloaded chrome first
        chrome_exe = os.path.abspath("/home/eitanya/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome")
        env = os.environ.copy()
        if os.path.exists(chrome_exe):
            env["CHROME_PATH"] = chrome_exe
            
        cmd = [
            "npx", "@marp-team/marp-cli",
            "--no-stdin",
            temp_script_path,
            "--images", "png",
            "-o", os.path.join(slides_dir, "slide.png")
        ]
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            print("Error running Marp CLI:", file=sys.stderr)
            print(result.stderr, file=sys.stderr)
            print("Note: If Chromium libraries are missing, please install them on WSL via:")
            print("sudo apt-get update && sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2 libxshmfence1")
            sys.exit(1)
        print("Marp slide images generated successfully.")
    else:
        print("Skipping slide generation. Using cached PNG files.")
        
    # 4. Stitch audio and slides
    generate_video(
        audio_dir=audio_dir,
        slides_dir=slides_dir,
        output_video_path=args.output,
        num_slides=slides_count,
        slide_pause=args.slide_pause
    )

if __name__ == "__main__":
    main()
