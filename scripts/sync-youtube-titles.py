#!/usr/bin/env python3
"""
Prefix YouTube video titles with their module number so a flat playlist can't
show two bare "שיעור 1" entries (module 3 lesson 1 vs module 4 lesson 1).

The course titles in src/data/website-course-data.ts are immutable waocopy
strings (see upload-website-course.py: "do not reword them"), so the prefix is
applied ONLY to the YouTube title at sync time -- the data file and the site
UI stay byte-identical.

For every lesson that (a) has a videoId in the course data and (b) is a member
of the course playlist on the WAO channel, sets:
    YouTube title = "מודול {module} | {title}"   (module >= 1)
Module 0 (pinned intro) keeps its unique title, no prefix.

Safety gates (same as refresh-youtube-thumbnails.py):
  - token must resolve to EXPECTED_CHANNEL_ID, else abort.
  - only touches videoIds present in the course playlist.
  - reads the current snippet first so description/tags/category are preserved.

Usage:
  python3 scripts/sync-youtube-titles.py            # apply
  python3 scripts/sync-youtube-titles.py --dry-run  # list what would change
"""
import os
import re
import sys
import argparse

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.upload',
]

TOKEN_CACHE = 'scratch/youtube_website_token.json'
COURSE_DATA = 'src/data/website-course-data.ts'

EXPECTED_CHANNEL_ID = 'UCBQXMUIQPC82kXKqihQ8pRw'  # WAO- לא רק ייעוץ שיווקי ברשת
PLAYLIST_TITLE = 'בניה + קידום אתרים בעידן ה-AI | WAO'


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
            print('Error: no valid token. Run the upload script auth flow first.')
            sys.exit(1)
    return build('youtube', 'v3', credentials=creds)


def assert_wao_channel(yt):
    res = yt.channels().list(part='snippet', mine=True).execute()
    channels = res.get('items', [])
    if not channels or channels[0]['id'] != EXPECTED_CHANNEL_ID:
        got = channels[0]['id'] if channels else 'none'
        print(f'ABORT: token resolves to {got}, expected {EXPECTED_CHANNEL_ID}.')
        sys.exit(2)
    print(f"Channel confirmed: {channels[0]['snippet']['title']} ({channels[0]['id']})")


def parse_lessons():
    """Return {videoId: (module, title)} from website-course-data.ts."""
    with open(COURSE_DATA, encoding='utf-8') as f:
        src = f.read()
    out = {}
    marks = list(re.finditer(r"\bnum:\s*(\d+),", src))
    for i, m in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(src)
        block = src[m.start():end]
        mod = int(m.group(1))
        for lm in re.finditer(
            r'slug:\s*"(website-lesson-\d+)"([\s\S]*?)\n\s*\},', block):
            body = lm.group(2)
            title = re.search(r'title:\s*"([^"]+)"', body)
            vid = re.search(r'videoId:\s*"([^"]+)"', body)
            if title and vid:
                out[vid.group(1)] = (mod, title.group(1))
    # pinned Module 0 intro
    intro = re.search(
        r'export const WEBSITE_COURSE_INTRO[\s\S]*?title:\s*"([^"]+)"[\s\S]*?'
        r'videoId:\s*"([^"]+)"', src)
    if intro:
        out[intro.group(2)] = (0, intro.group(1))
    return out


def playlist_video_ids(yt, playlist_id):
    ids, token = [], None
    while True:
        res = yt.playlistItems().list(
            part='snippet', playlistId=playlist_id, maxResults=50, pageToken=token
        ).execute()
        ids += [i['snippet']['resourceId']['videoId'] for i in res.get('items', [])]
        token = res.get('nextPageToken')
        if not token:
            break
    return ids


def find_playlist(yt):
    res = yt.playlists().list(part='snippet', mine=True, maxResults=50).execute()
    for item in res.get('items', []):
        if item['snippet']['title'] == PLAYLIST_TITLE:
            return item['id']
    print(f'ABORT: playlist "{PLAYLIST_TITLE}" not found on this channel.')
    sys.exit(2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    lessons = parse_lessons()
    yt = get_youtube()
    assert_wao_channel(yt)
    playlist_id = find_playlist(yt)
    in_playlist = set(playlist_video_ids(yt, playlist_id))

    changed = 0
    for vid in sorted(in_playlist, key=lambda v: lessons.get(v, (99, ''))[1]):
        if vid not in lessons:
            print(f'  SKIP {vid}: not in course data.')
            continue
        mod, title = lessons[vid]
        new_title = title if mod == 0 else f"מודול {mod} | {title}"

        cur = yt.videos().list(part='snippet', id=vid).execute()['items'][0]
        snippet = cur['snippet']
        if snippet['title'] == new_title:
            print(f'  OK   {vid}: already "{new_title}"')
            continue
        print(f'  SET  {vid}:\n    old: {snippet["title"]}\n    new: {new_title}')
        if args.dry_run:
            continue
        snippet['title'] = new_title
        yt.videos().update(
            part='snippet',
            body={'id': vid, 'snippet': snippet},
        ).execute()
        changed += 1

    print(f'\nDone. {changed} title(s) updated.' +
          (' (--dry-run: nothing written.)' if args.dry_run else ''))


if __name__ == '__main__':
    main()
