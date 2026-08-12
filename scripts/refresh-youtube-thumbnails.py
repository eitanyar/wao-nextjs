#!/usr/bin/env python3
"""
Refresh custom thumbnails on already-uploaded YouTube videos of the
website course playlist (בניה + קידום אתרים בעידן ה-AI | WAO).

Reads the slug→videoId mapping from src/data/website-course-data.ts,
resolves each videoId's thumbnail file on disk (public/media/thumbnails/),
and calls thumbnails().set for every video that lives on the WAO channel
and belongs to the course playlist.

Safety gates (same as upload-website-course.py):
  - token must resolve to EXPECTED_CHANNEL_ID (WAO channel), else abort.
  - only touches videoIds that are (a) in the course data and (b) members
    of the course playlist on that channel.

Usage:
  python3 scripts/refresh-youtube-thumbnails.py            # refresh all mapped
  python3 scripts/refresh-youtube-thumbnails.py --slug website-lesson-6
  python3 scripts/refresh-youtube-thumbnails.py --dry-run  # list what would be set

Thumbnails().set is quota-free but rate-limited (~10/24h on unverified apps);
the script stops cleanly after 10 sets per run.
"""

import os
import re
import sys
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
THUMB_DIR      = 'public/media/thumbnails'

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


def slug_video_map():
    """Parse slug → videoId from website-course-data.ts (videoId only)."""
    with open(COURSE_DATA, encoding='utf-8') as f:
        src = f.read()
    out = {}
    for m in re.finditer(
        r'slug:\s*"(website-lesson-\d+)"(?:(?!slug:)[\s\S])*?videoId:\s*"([^"]+)"',
        src,
    ):
        out[m.group(1)] = m.group(2)
    return out


def thumb_path_for(slug):
    """Same convention as upload-website-course.py: lessons 3-5 are .png."""
    n = int(slug.rsplit('-', 1)[1])
    ext = 'png' if 3 <= n <= 5 else 'jpg'
    return os.path.join(THUMB_DIR, f'{slug}.{ext}')


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
    parser = argparse.ArgumentParser(description='Refresh YouTube thumbnails for course videos.')
    parser.add_argument('--slug', help='Refresh only this slug (e.g. website-lesson-6)')
    parser.add_argument('--dry-run', action='store_true', help='List targets without uploading')
    args = parser.parse_args()

    mapping = slug_video_map()
    if args.slug:
        if args.slug not in mapping:
            print(f'Error: {args.slug} has no videoId in {COURSE_DATA}.')
            sys.exit(1)
        mapping = {args.slug: mapping[args.slug]}

    yt = get_youtube()
    assert_wao_channel(yt)
    playlist_id = find_playlist(yt)
    print(f'Playlist: {playlist_id}')
    in_playlist = set(playlist_video_ids(yt, playlist_id))
    print(f'Playlist videos: {len(in_playlist)}')

    targets = []
    for slug, video_id in sorted(mapping.items(), key=lambda kv: int(kv[0].rsplit('-', 1)[1])):
        path = thumb_path_for(slug)
        if video_id not in in_playlist:
            print(f'  SKIP {slug}: videoId {video_id} not in the course playlist.')
            continue
        if not os.path.exists(path):
            print(f'  SKIP {slug}: thumbnail file missing: {path}')
            continue
        targets.append((slug, video_id, path))

    print(f'\nTargets ({len(targets)}):')
    for slug, video_id, path in targets:
        print(f'  {slug} → {video_id} ← {path}')
    if args.dry_run:
        print('\n--dry-run: nothing uploaded.')
        return

    sets = 0
    for slug, video_id, path in targets:
        if sets >= 10:
            print('\nRate limit (~10 sets/24h) reached — remaining slugs need a later run:')
            for s, _, _ in targets[targets.index((slug, video_id, path)):]:
                print(f'  {s}')
            break
        print(f'\n── {slug} ({video_id})')
        try:
            yt.thumbnails().set(
                videoId=video_id,
                media_body=MediaFileUpload(path, mimetype='image/png' if path.endswith('.png') else 'image/jpeg'),
            ).execute()
            sets += 1
            print(f'  Thumbnail set OK. https://youtu.be/{video_id}')
        except HttpError as e:
            print(f'  FAILED: {e}')
        time.sleep(2)

    print(f'\nDone. {sets} thumbnail(s) refreshed.')


if __name__ == '__main__':
    main()
