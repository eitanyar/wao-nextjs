#!/usr/bin/env python3
"""
One-time YouTube sign-in for the WAO channel. It refreshes the saved token that the upload
scripts use, then prints which channel the token belongs to. It uploads nothing.

  /home/eitanya/wao-yt-venv/bin/python3 scripts/youtube-login.py

It prints a Google sign-in URL. Open it in your browser and pick the WAO Marketing channel.
The token is saved to scratch/youtube_website_token.json, the same file that
upload-website-course.py, sync-youtube-titles.py and refresh-youtube-thumbnails.py use.
"""
import os

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/youtube', 'https://www.googleapis.com/auth/youtube.upload']
CLIENT_SECRETS = 'client_secrets.json'
TOKEN_CACHE = 'scratch/youtube_website_token.json'


def main():
    creds = None
    if os.path.exists(TOKEN_CACHE):
        try:
            creds = Credentials.from_authorized_user_file(TOKEN_CACHE, SCOPES)
            if not creds.valid and creds.refresh_token:
                creds.refresh(Request())
        except Exception as err:  # expired or revoked: fall through to a fresh sign-in
            print(f'Saved token unusable ({err.__class__.__name__}); signing in again.')
            creds = None
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRETS, SCOPES)
        creds = flow.run_local_server(port=0, open_browser=False)
    os.makedirs(os.path.dirname(TOKEN_CACHE), exist_ok=True)
    with open(TOKEN_CACHE, 'w', encoding='utf-8') as f:
        f.write(creds.to_json())
    yt = build('youtube', 'v3', credentials=creds)
    for item in yt.channels().list(part='snippet', mine=True).execute().get('items', []):
        snip = item['snippet']
        print(f"Signed in as channel: {snip['title']} ({snip.get('customUrl', '')}, id {item['id']})")
    print(f'Token saved to {TOKEN_CACHE}')


if __name__ == '__main__':
    main()
