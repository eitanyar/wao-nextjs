#!/usr/bin/env python3
import os
import sys
import json
import argparse
import subprocess
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Scopes required for uploading to YouTube
SCOPES = ['https://www.googleapis.com/auth/youtube.upload']

def get_authenticated_service(client_secrets_file, token_file):
    creds = None
    if os.path.exists(token_file):
        try:
            creds = Credentials.from_authorized_user_file(token_file, SCOPES)
        except Exception as e:
            print(f"Error loading token cache: {e}")
            
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                creds = None
                
        if not creds:
            if not os.path.exists(client_secrets_file):
                print(f"Error: {client_secrets_file} not found.")
                print("Please follow the instructions to download client_secrets.json from Google Cloud Console.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(client_secrets_file, SCOPES)
            # Run local server for auth
            creds = flow.run_local_server(
                port=0, 
                authorization_prompt_message="Please visit this URL to authorize YouTube upload: {url}",
                success_message="The authorization flow was completed. You can close this window."
            )
        # Save the credentials for the next run
        os.makedirs(os.path.dirname(token_file), exist_ok=True)
        with open(token_file, 'w', encoding='utf-8') as f:
            f.write(creds.to_json())
            
    return build('youtube', 'v3', credentials=creds)

def upload_video(youtube, file_path, title, description, tags=None):
    if not os.path.exists(file_path):
        print(f"Error: Video file {file_path} not found.")
        sys.exit(1)
        
    print(f"Uploading {file_path} to YouTube...")
    body = {
        'snippet': {
            'title': title,
            'description': description,
            'tags': tags or [],
            'categoryId': '27' # Education category
        },
        'status': {
            'privacyStatus': 'public', # Make it public
            'selfDeclaredMadeForKids': False
        }
    }
    
    media = MediaFileUpload(
        file_path,
        chunksize=1024*1024,
        resumable=True,
        mimetype='video/mp4'
    )
    
    request = youtube.videos().insert(
        part='snippet,status',
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%...")
            
    video_id = response.get('id')
    print(f"Upload complete! Video ID: {video_id}")
    return video_id

def main():
    parser = argparse.ArgumentParser(description="Upload Google Ads lesson video to YouTube and update website config.")
    parser.add_argument("--slug", required=True, help="Lesson slug to upload (e.g. ai-first-ppc-mindset)")
    parser.add_argument("--client-secrets", default="client_secrets.json", help="Path to Google Cloud client_secrets.json")
    parser.add_argument("--token-cache", default="scratch/youtube_token.json", help="Path to save persistent token cache")
    parser.add_argument("--video-map", default="content-migration/video-map.json", help="Path to video-map.json")
    
    args = parser.parse_args()
    
    # 1. Load video map
    if not os.path.exists(args.video_map):
        print(f"Error: Video map {args.video_map} not found.")
        sys.exit(1)
        
    with open(args.video_map, 'r', encoding='utf-8') as f:
        video_map = json.load(f)
        
    # 2. Find target lesson
    target_entry = None
    target_course_key = None
    target_idx = None
    
    for course_key, lessons in video_map.items():
        for idx, lesson in enumerate(lessons):
            if lesson.get("slug") == args.slug:
                target_entry = lesson
                target_course_key = course_key
                target_idx = idx
                break
        if target_entry:
            break
            
    if not target_entry:
        print(f"Error: Lesson with slug '{args.slug}' not found in {args.video_map}.")
        sys.exit(1)
        
    local_video_path = target_entry.get("localVideoUrl")
    if not local_video_path:
        print(f"Error: Lesson '{args.slug}' does not have a localVideoUrl configured.")
        sys.exit(1)
        
    # Standardize path: localVideoUrl has a leading slash, resolve relative to public/
    full_video_path = os.path.join("public", local_video_path.lstrip("/"))
    if not os.path.exists(full_video_path):
        print(f"Error: Video file {full_video_path} not found.")
        sys.exit(1)
        
    # 3. Authenticate with YouTube API
    youtube = get_authenticated_service(args.client_secrets, args.token_cache)
    
    # 4. Prepare metadata
    title = target_entry.get("title", f"Google Ads Course - {args.slug}")
    if len(title) > 100:
        title = title[:97] + "..."
    
    # Generate description incorporating resources/links
    description_lines = [
        f"שיעור מתוך קורס Google Ads המעשי.",
        "",
        target_entry.get("activeTask", ""),
        "",
        "קישורים ומשאבים המוזכרים בשיעור:"
    ]
    for link in target_entry.get("links", []):
        description_lines.append(f"- {link['label']}: {link['href']}")
        
    description = "\n".join(description_lines)
    tags = ["גוגל אדס", "פרסום בגוגל", "Google Ads", "שיווק דיגיטלי"]
    
    # 5. Upload video
    video_id = upload_video(youtube, full_video_path, title, description, tags)
    
    # 6. Update video-map.json
    target_entry["videoIds"] = [video_id]
    target_entry["localVideoUrl"] = ""
    
    with open(args.video_map, 'w', encoding='utf-8') as f:
        json.dump(video_map, f, indent=2, ensure_ascii=False)
    print(f"Updated {args.video_map} successfully.")
    
    # 7. Delete local video file
    try:
        os.remove(full_video_path)
        print(f"Deleted local video file: {full_video_path}")
    except Exception as e:
        print(f"Warning: Could not delete local video file: {e}")
        
    # 8. Rebuild the Next.js site
    print("Running Next.js production build to update static pages...")
    try:
        subprocess.run(["python3", "scratch/run_build.py"], check=True)
        print("Site rebuilt successfully!")
    except Exception as e:
        print(f"Warning: Rebuild failed: {e}")
        
    print(f"Successfully uploaded lesson '{args.slug}' to YouTube ({video_id}) and updated the site!")

if __name__ == "__main__":
    main()
