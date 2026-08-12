#!/usr/bin/env python3
"""
restitch-website-videos.py -- fix the 08-08/08-10 compile batch that wrote
modules in order [5, 3, 4, 6] into sequential slugs 6-21.

Each output/lesson-N dir is internally consistent (its slides + cached
ElevenLabs audio match each other) but sits under the WRONG number:
  target 6-9   <- output/lesson-11..14 (L3-1..L3-4)
  target 10-13 <- output/lesson-15..18 (L4-1..L4-4)
  target 14-18 <- output/lesson-6..10  (L5-1..L5-5)
  target 19-21 <- output/lesson-19..21 (already correct)

We re-stitch slides+audio with the ffmpeg concat demuxer (course GATE 5:
"ffmpeg concat demuxer → MP4 (לא MoviePy)") -- ZERO new TTS credits.

Safety: writes to public/media/videos/website-lesson-N.mp4.RESTITCHED
(copy to the real name only after vision-verifying the first slide).

Usage: python3 scripts/restitch-website-videos.py [--only 6 7 ...]
"""
import argparse
import os
import shutil
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'output')
VIDS = os.path.join(REPO, 'public', 'media', 'videos')

CUR = {
    6: 11, 7: 12, 8: 13, 9: 14,      # L3-1..L3-4
    10: 15, 11: 16, 12: 17, 13: 18,  # L4-1..L4-4
    14: 6, 15: 7, 16: 8, 17: 9, 18: 10,  # L5-1..L5-5
}

SLIDE_PAUSE = 1.5  # must match compile_lesson_video.generate_video default


def find_audio(audio_dir, i):
    """Audio naming drifted between batches: slide_N.mp3 (compile script)
    vs slide-N.mp3 (08-10 batch). Accept both."""
    for name in (f'slide_{i}.mp3', f'slide-{i}.mp3'):
        p = os.path.join(audio_dir, name)
        if os.path.exists(p):
            return p
    return None


def stitch(target, cur):
    slides = os.path.join(OUT, f'lesson-{cur}', 'slides')
    audio = os.path.join(OUT, f'lesson-{cur}', 'audio')
    if not os.path.isdir(slides):
        print(f'  ERROR: {slides} missing'); return False

    entries = []
    i = 1
    while os.path.exists(os.path.join(slides, f'slide.{i:03d}.png')):
        dur = SLIDE_PAUSE
        mp3 = find_audio(audio, i)
        if mp3:
            r = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=nw=1:nk=1', mp3],
                capture_output=True, text=True)
            dur += float(r.stdout.strip())
        entries.append(f"file '{slides}/slide.{i:03d}.png'\nduration {dur:.3f}")
        i += 1
    if not entries:
        print(f'  ERROR: no slides in {slides}'); return False
    entries.append(f"file '{slides}/slide.{i-1:03d}.png'")  # concat-demuxer tail

    concat = f'/tmp/concat-{target}.txt'
    with open(concat, 'w') as f:
        f.write('\n'.join(entries) + '\n')

    dst = os.path.join(VIDS, f'website-lesson-{target}.mp4.RESTITCHED')
    return two_step(target, slides, audio, i, dst)


def two_step(target, slides, audio, n_slides, dst):
    # step 1: silent video from concat demuxer
    concat = f'/tmp/concat-{target}.txt'
    silent = f'/tmp/silent-{target}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat',
                    '-safe', '0', '-i', concat, '-pix_fmt', 'yuv420p',
                    '-r', '24', silent], check=True)
    # step 2: concat the per-slide mp3s (3s silence where missing)
    aconcat = f'/tmp/aconcat-{target}.txt'
    with open(aconcat, 'w') as f:
        for j in range(1, n_slides):
            mp3 = find_audio(audio, j)
            f.write(f"file '{mp3 if mp3 else '/tmp/silence.mp3'}'\n")
    if not os.path.exists('/tmp/silence.mp3'):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi',
                        '-i', 'anullsrc=r=44100:cl=stereo', '-t', '3',
                        '/tmp/silence.mp3'], check=True)
    if not os.path.exists('/tmp/pause.mp3'):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi',
                        '-i', 'anullsrc=r=44100:cl=stereo', '-t', str(SLIDE_PAUSE),
                        '/tmp/pause.mp3'], check=True)
    audio_all = f'/tmp/audio-{target}.mp3'
    with open(aconcat, 'a') as f:
        f.write(f"file '/tmp/pause.mp3'\n")  # keep the last slide's pause
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat',
                    '-safe', '0', '-i', aconcat, '-c', 'copy', audio_all],
                   check=True)
    # step 3: mux (write to a .mp4 path -- ffmpeg infers the muxer from the
    # extension), then move to the .RESTITCHED staging name
    staged = f'/tmp/restitched-{target}.mp4'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', silent,
                    '-i', audio_all, '-c:v', 'copy', '-c:a', 'aac',
                    '-shortest', staged], check=True)
    shutil.move(staged, dst)
    print(f'  Wrote {dst}')
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='*', type=int)
    args = parser.parse_args()
    targets = args.only or sorted(CUR)
    ok = 0
    for t in targets:
        print(f'lesson-{t} <- output/lesson-{CUR[t]}')
        if stitch(t, CUR[t]):
            ok += 1
    print(f'Done: {ok}/{len(targets)} re-stitched (.RESTITCHED files).')
    if ok != len(targets):
        sys.exit(1)


if __name__ == '__main__':
    main()
