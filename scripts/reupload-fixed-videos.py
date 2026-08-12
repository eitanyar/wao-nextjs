#!/usr/bin/env python3
"""
reupload-fixed-videos.py -- replace the 5 playlist videos (slugs 6-10) whose
rendered content was mis-numbered by the Aug-10 compile batch.

Per slug: upload the corrected local mp4 (snippet from upload-website-course
LESSONS), set its thumbnail, add to the playlist, THEN delete the old
playlist item and the old video, and point website-course-data.ts at the new
videoId. Run scripts/sync-youtube-titles.py afterwards for the "מודול N |"
title prefix.

Run with ~/wao-yt-venv/bin/python. Quota: ~5x(1600+50+100+50) ≈ 11k units.
"""
import importlib.util
import sys
import time

HERE = '/home/eitanya/wao/scripts'
spec = importlib.util.spec_from_file_location('uwc', f'{HERE}/upload-website-course.py')
uwc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uwc)

PLAYLIST_ID = 'PLAVPP3EEWWx0'
SLUGS = ['website-lesson-6', 'website-lesson-7', 'website-lesson-8',
         'website-lesson-9', 'website-lesson-10']


def main():
    yt = uwc.get_youtube()
    uwc.assert_wao_channel(yt)

    # current playlist items: slug -> (playlist_item_id, old_video_id)
    items = yt.playlistItems().list(part='snippet', playlistId=PLAYLIST_ID,
                                    maxResults=50).execute()['items']
    old = {}
    for it in items:
        title = it['snippet']['title']
        for slug in SLUGS:
            n = slug.split('-')[-1]
            # match by the lesson's bare title from LESSONS
            lesson = next((l for l in uwc.LESSONS if l['slug'] == slug), None)
            if lesson and lesson['title'] in title:
                old[slug] = (it['id'], it['snippet']['resourceId']['videoId'])

    missing = [s for s in SLUGS if s not in old]
    if missing:
        print(f'ERROR: could not locate playlist items for {missing}')
        sys.exit(1)

    for slug in SLUGS:
        lesson = next(l for l in uwc.LESSONS if l['slug'] == slug)
        item_id, old_vid = old[slug]
        print(f'\n── {slug} (old {old_vid}) ──')

        new_vid = uwc.upload_video(yt, lesson)
        if not new_vid:
            print('  upload failed — aborting.'); sys.exit(1)
        time.sleep(2)
        uwc.upload_thumbnail(yt, new_vid, lesson['thumbnail'], 0)
        uwc.add_to_playlist(yt, PLAYLIST_ID, new_vid)
        yt.playlistItems().delete(id=item_id).execute()
        print(f'  removed old playlist item {item_id}')
        yt.videos().delete(id=old_vid).execute()
        print(f'  deleted old video {old_vid}')
        uwc.patch_course_data(slug, new_vid)
        print(f'  ✓ {slug} → https://youtu.be/{new_vid}')

    print('\nDone. Next: ~/wao-yt-venv/bin/python scripts/sync-youtube-titles.py')


if __name__ == '__main__':
    main()
