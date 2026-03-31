#!/usr/bin/env python3
"""
Discogs Migration Script - Run this on your local machine
Adds releases from tranque to aaa123bkp starting from release #63 onwards
"""

import requests
import time
from datetime import datetime

# Configuration
OLD_USERNAME = "tranque"
NEW_USERNAME = "aaa123bkp"
NEW_ACCOUNT_TOKEN = "ROTATE_ME_REPLACED_COMPROMISED_TOKEN"
CUTOFF_DATE = "2009-08-20T07:00:00-07:00"  # Everything from this date and older gets moved

BASE_URL = "https://api.discogs.com"
REQUEST_DELAY = 1.1  # 60 requests/minute rate limit

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_releases_to_move():
    """Fetch all releases from old account that should be moved."""
    log(f"Fetching releases from {OLD_USERNAME}...")
    releases = []
    page = 1
    cutoff_dt = datetime.fromisoformat(CUTOFF_DATE.replace('Z', '+00:00'))
    found_cutoff = False
    
    while True:
        url = f"{BASE_URL}/users/{OLD_USERNAME}/collection/folders/0/releases"
        params = {"page": page, "per_page": 100, "sort": "added", "sort_order": "desc"}
        
        resp = requests.get(url, params=params)
        time.sleep(REQUEST_DELAY)
        
        if resp.status_code != 200:
            log(f"Error fetching page {page}: {resp.status_code}")
            break
        
        data = resp.json()
        items = data.get("releases", [])
        
        if not items:
            break
        
        for item in items:
            added_dt = datetime.fromisoformat(item["date_added"].replace('Z', '+00:00'))
            
            if added_dt <= cutoff_dt:
                found_cutoff = True
                releases.append({
                    "release_id": item["id"],
                    "instance_id": item["instance_id"],
                    "folder_id": item.get("folder_id", 1),  # Default to folder 1 if not present
                    "artist": item["basic_information"]["artists"][0]["name"],
                    "title": item["basic_information"]["title"],
                    "date_added": item["date_added"]
                })
        
        # If we've passed the cutoff point, stop
        if found_cutoff and all(datetime.fromisoformat(i["date_added"].replace('Z', '+00:00')) > cutoff_dt for i in items):
            log(f"Found all releases up to cutoff. Total: {len(releases)}")
            break
        
        pagination = data.get("pagination", {})
        if page >= pagination.get("pages", 0):
            break
        
        page += 1
        log(f"Fetched page {page-1}... ({len(releases)} releases so far)")
    
    return releases

def add_to_new_account(release_id):
    """Add a release to the new account."""
    url = f"{BASE_URL}/users/{NEW_USERNAME}/collection/folders/1/releases/{release_id}"
    headers = {"Authorization": f"Discogs token={NEW_ACCOUNT_TOKEN}"}
    
    resp = requests.post(url, headers=headers)
    time.sleep(REQUEST_DELAY)
    
    return resp.status_code in [200, 201]

def main():
    log("=" * 70)
    log("Discogs Collection Migration - Adding to New Account")
    log("=" * 70)
    log(f"Old account: {OLD_USERNAME}")
    log(f"New account: {NEW_USERNAME}")
    log(f"Cutoff: {CUTOFF_DATE}")
    log("=" * 70)
    
    # Fetch releases
    releases = get_releases_to_move()
    log(f"\nFound {len(releases)} releases to migrate\n")
    
    if not releases:
        log("No releases found. Exiting.")
        return
    
    # Show first 5
    log("First 5 releases:")
    for i, r in enumerate(releases[:5], 1):
        log(f"  {i}. {r['artist']} - {r['title']}")
    
    input("\nPress Enter to start migration, or Ctrl+C to cancel...")
    
    # Add to new account
    log("\nStarting migration...\n")
    success = 0
    failed = 0
    
    for i, release in enumerate(releases, 1):
        artist = release['artist']
        title = release['title']
        release_id = release['release_id']
        
        log(f"[{i}/{len(releases)}] {artist} - {title}")
        
        if add_to_new_account(release_id):
            log(f"  ✓ Added to {NEW_USERNAME}")
            success += 1
        else:
            log(f"  ✗ Failed to add")
            failed += 1
        
        if i % 50 == 0:
            log(f"\nProgress: {success} added, {failed} failed\n")
    
    log("\n" + "=" * 70)
    log("Migration Complete!")
    log(f"Added to {NEW_USERNAME}: {success}")
    log(f"Failed: {failed}")
    log("=" * 70)
    log(f"\nIMPORTANT: Now remove these releases from {OLD_USERNAME} using Claude/MCP")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("\n\nMigration cancelled by user")
