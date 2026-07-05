#!/usr/bin/env python3
"""
Upload website course lessons to YouTube, add to playlist,
and swap videoSrc → videoId in website-course-data.ts.

Usage:
  python3 scripts/upload-website-course.py                  # upload all pending lessons
  python3 scripts/upload-website-course.py --slug website-lesson-3  # single lesson

Requires:
  client_secrets.json in project root (already present)
  pip install google-auth-oauthlib google-auth-httplib2 google-api-python-client

OAuth token is cached to scratch/youtube_website_token.json after first login.
"""

import os
import re
import sys
import json
import time
import argparse

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
]

CLIENT_SECRETS = 'client_secrets.json'
TOKEN_CACHE    = 'scratch/youtube_website_token.json'
COURSE_DATA    = 'src/data/website-course-data.ts'

# Playlist title — will be created if it doesn't exist
PLAYLIST_TITLE = 'בניה + קידום אתרים בעידן ה-AI | WAO'
PLAYLIST_DESC  = 'קורס מלא לבעלי עסקים ישראלים: מבניית אתר עם AI ועד קידום אורגני ב-Google.'

# Lessons to upload — in order. Add new lessons here as they are produced.
LESSONS = [
    {
        'slug': 'website-lesson-3',
        'video': 'public/media/videos/website-lesson-3.mp4',
        'thumbnail': 'public/media/thumbnails/website-lesson-3.png',
        'title': 'שיעור 1 | בניה + קידום אתרים בעידן ה-AI | WAO',
        'description': (
            'שלושה מרכיבים למשפט תיאור עסק מדויק, דוגמה חיה של אינסטלטור, '
            'ותבנית מלאה לניסוח המשפט שיבנה את כל האתר שלך.\n\n'
            'משימה: תמלא את התבנית מהשיעור. תשמור את המשפט — תצטרך אותו בשיעור הבא.\n\n'
            '▶ הקורס המלא: https://wao.co.il/training/website-course'
        ),
        'tags': ['בניית אתר', 'AI', 'קידום אתרים', 'גוגל', 'WAO', 'עסק קטן', 'ישראל'],
    },
    {
        'slug': 'website-lesson-4',
        'video': 'public/media/videos/website-lesson-4.mp4',
        'thumbnail': 'public/media/thumbnails/website-lesson-4.png',
        'title': 'שיעור 2 | בניה + קידום אתרים בעידן ה-AI | WAO',
        'description': (
            'איך להפוך את תיאור העסק שלך לפרומפט ראשון, לקבל טיוטת עמוד בית תוך שניות, '
            'ולבדוק אם היא נשמעת כמוך.\n\n'
            'משימה: תדביק את המשפט שלך ל-AI ותריץ את שלוש הבדיקות. תשמור את הטיוטה — תצטרך אותה בשיעור הבא.\n\n'
            '▶ הקורס המלא: https://wao.co.il/training/website-course'
        ),
        'tags': ['בניית אתר', 'AI', 'Claude', 'ChatGPT', 'פרומפט', 'WAO', 'עסק קטן', 'ישראל'],
    },
    {
        'slug': 'website-lesson-5',
        'video': 'public/media/videos/website-lesson-5.mp4',
        'thumbnail': 'public/media/thumbnails/website-lesson-5.png',
        'title': 'שיעור 3 | בניה + קידום אתרים בעידן ה-AI | WAO',
        'description': (
            'שלוש שאלות לבדיקת כל טיוטה, נוסחת פרומפט תיקון, '
            'וכמה סבבים צריך עד שמגיעים לתוצאה אמיתית.\n\n'
            'משימה: תעביר את הטיוטה דרך שלוש השאלות ותכתוב פרומפט תיקון אחד. תשמור את הגרסה החדשה.\n\n'
            '▶ הקורס המלא: https://wao.co.il/training/website-course'
        ),
        'tags': ['בניית אתר', 'AI', 'איטרציה', 'פרומפט', 'WAO', 'עסק קטן', 'ישראל'],
    },
]


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_youtube():
    creds = None
    if os.path.exists(TOKEN_CACHE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_CACHE, SCOPES)
        except Exception as e:
            print(f'Warning: could not load token cache: {e}')

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None

        if not creds:
            if not os.path.exists(CLIENT_SECRETS):
                print(f'Error: {CLIENT_SECRETS} not found.')
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
            creds = flow.run_local_server(port=0, open_browser=False)

        os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
        with open(TOKEN_CACHE, 'w') as f:
            f.write(creds.to_json())

    return build('youtube', 'v3', credentials=creds)


# ── Playlist ──────────────────────────────────────────────────────────────────

def get_or_create_playlist(yt):
    """Return the playlist ID for the website course, creating it if needed."""
    # Search existing playlists
    res = yt.playlists().list(part='snippet', mine=True, maxResults=50).execute()
    for item in res.get('items', []):
        if item['snippet']['title'] == PLAYLIST_TITLE:
            pid = item['id']
            print(f'Found existing playlist: {pid}')
            return pid

    # Create new
    res = yt.playlists().insert(
        part='snippet,status',
        body={
            'snippet': {'title': PLAYLIST_TITLE, 'description': PLAYLIST_DESC, 'defaultLanguage': 'iw'},
            'status': {'privacyStatus': 'public'},
        }
    ).execute()
    pid = res['id']
    print(f'Created playlist: {pid}')
    return pid


def add_to_playlist(yt, playlist_id, video_id):
    yt.playlistItems().insert(
        part='snippet',
        body={'snippet': {
            'playlistId': playlist_id,
            'resourceId': {'kind': 'youtube#video', 'videoId': video_id},
        }}
    ).execute()
    print(f'  Added {video_id} to playlist.')


# ── Upload ────────────────────────────────────────────────────────────────────

def upload_video(yt, lesson):
    path = lesson['video']
    if not os.path.exists(path):
        print(f'  ERROR: video file not found: {path}')
        return None

    print(f'  Uploading {path} …')
    body = {
        'snippet': {
            'title': lesson['title'],
            'description': lesson['description'],
            'tags': lesson['tags'],
            'categoryId': '27',        # Education
            'defaultLanguage': 'iw',
        },
        'status': {
            'privacyStatus': 'public',
            'embeddable': True,
            'selfDeclaredMadeForKids': False,
        },
    }
    media = MediaFileUpload(path, chunksize=1024 * 1024, resumable=True, mimetype='video/mp4')
    req = yt.videos().insert(part='snippet,status', body=body, media_body=media)

    response = None
    while response is None:
        status, response = req.next_chunk()
        if status:
            print(f'  {int(status.progress() * 100)}%…', end='\r')

    video_id = response['id']
    print(f'  Upload complete → videoId: {video_id}')
    return video_id


def upload_thumbnail(yt, video_id, thumb_path, thumbnail_quota_used):
    """Upload thumbnail — non-fatal if quota (10/24h) is exceeded."""
    if thumbnail_quota_used >= 10:
        print(f'  SKIP thumbnail (quota 10/24h reached). Manual fallback: {thumb_path}')
        return thumbnail_quota_used

    if not os.path.exists(thumb_path):
        print(f'  SKIP thumbnail — file not found: {thumb_path}')
        return thumbnail_quota_used

    try:
        yt.thumbnails().set(
            videoId=video_id,
            media_body=MediaFileUpload(thumb_path, mimetype='image/png')
        ).execute()
        print(f'  Thumbnail uploaded.')
        return thumbnail_quota_used + 1
    except HttpError as e:
        print(f'  WARNING: thumbnail upload failed ({e}). Local path: {thumb_path}')
        return thumbnail_quota_used


# ── website-course-data.ts patch ─────────────────────────────────────────────

def patch_course_data(slug, video_id):
    """Swap videoSrc → videoId for the given slug in website-course-data.ts."""
    with open(COURSE_DATA, 'r', encoding='utf-8') as f:
        src = f.read()

    # Match the lesson block for this slug and replace videoSrc with videoId
    old = re.search(
        rf'(slug:\s*"{re.escape(slug)}".*?)(videoSrc:\s*"[^"]*")',
        src, re.DOTALL
    )
    if not old:
        print(f'  WARNING: could not find videoSrc for {slug} in {COURSE_DATA} — update manually.')
        return

    new_src = src[:old.start(2)] + f'videoId: "{video_id}"' + src[old.end(2):]
    with open(COURSE_DATA, 'w', encoding='utf-8') as f:
        f.write(new_src)
    print(f'  {COURSE_DATA}: videoSrc → videoId ({video_id})')


# ── Main ──────────────────────────────────────────────────────────────────────

def already_uploaded(slug):
    """Return True if this slug already has a videoId in course data."""
    with open(COURSE_DATA, 'r', encoding='utf-8') as f:
        src = f.read()
    block = re.search(rf'slug:\s*"{re.escape(slug)}".*?(?=slug:|$)', src, re.DOTALL)
    if not block:
        return False
    return 'videoId:' in block.group(0)


def main():
    parser = argparse.ArgumentParser(description='Upload website course lessons to YouTube.')
    parser.add_argument('--slug', help='Upload only this slug (e.g. website-lesson-3)')
    args = parser.parse_args()

    lessons = LESSONS
    if args.slug:
        lessons = [l for l in LESSONS if l['slug'] == args.slug]
        if not lessons:
            print(f'Error: slug "{args.slug}" not found in LESSONS list.')
            sys.exit(1)

    # Skip already-uploaded
    pending = [l for l in lessons if not already_uploaded(l['slug'])]
    if not pending:
        print('All lessons already have a videoId — nothing to upload.')
        sys.exit(0)

    print(f'Lessons to upload: {[l["slug"] for l in pending]}\n')

    yt = get_youtube()
    playlist_id = get_or_create_playlist(yt)
    thumbnail_quota_used = 0

    for lesson in pending:
        print(f'\n── {lesson["slug"]} ──')
        video_id = upload_video(yt, lesson)
        if not video_id:
            print(f'  FAILED — skipping remaining steps for this lesson.')
            continue

        time.sleep(2)  # brief pause before thumbnail
        thumbnail_quota_used = upload_thumbnail(yt, video_id, lesson['thumbnail'], thumbnail_quota_used)
        add_to_playlist(yt, playlist_id, video_id)
        patch_course_data(lesson['slug'], video_id)
        print(f'  ✓ {lesson["slug"]} done → https://youtu.be/{video_id}')

    print('\nAll done. Run Roni to verify lesson pages now embed YouTube videoId.')


if __name__ == '__main__':
    main()
