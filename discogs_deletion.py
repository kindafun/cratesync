#!/usr/bin/env python3
"""
Discogs Deletion Script - Remove digital releases from old account
Run this AFTER the migration script finishes adding to new account
"""

import time
from datetime import datetime

import requests

# Configuration
OLD_USERNAME = "tranque"
OLD_ACCOUNT_TOKEN = "ROTATE_ME_REPLACED_COMPROMISED_TOKEN"  # Get a fresh token from Settings → Developers on tranque
CUTOFF_DATE = (
    "2009-08-20T07:00:00-07:00"  # Everything with this date or older gets deleted
)

BASE_URL = "https://api.discogs.com"
REQUEST_DELAY = 1.1  # 60 requests/minute rate limit


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def get_releases_to_delete():
    """Fetch all releases that need to be deleted (same as migration script)."""
    log(f"Fetching releases from {OLD_USERNAME} to delete...")
    releases = []
    page = 1
    cutoff_dt = datetime.fromisoformat(CUTOFF_DATE.replace("Z", "+00:00"))
    found_cutoff = False

    headers = {"Authorization": f"Discogs token={OLD_ACCOUNT_TOKEN}"}

    while True:
        url = f"{BASE_URL}/users/{OLD_USERNAME}/collection/folders/0/releases"
        params = {"page": page, "per_page": 100, "sort": "added", "sort_order": "desc"}

        resp = requests.get(url, headers=headers, params=params)
        time.sleep(REQUEST_DELAY)

        if resp.status_code != 200:
            log(f"Error fetching page {page}: {resp.status_code}")
            break

        data = resp.json()
        items = data.get("releases", [])

        if not items:
            break

        for item in items:
            added_dt = datetime.fromisoformat(item["date_added"].replace("Z", "+00:00"))

            if added_dt <= cutoff_dt:
                found_cutoff = True
                releases.append(
                    {
                        "release_id": item["id"],
                        "instance_id": item["instance_id"],
                        "folder_id": item.get("folder_id", 1),
                        "artist": item["basic_information"]["artists"][0]["name"],
                        "title": item["basic_information"]["title"],
                        "date_added": item["date_added"],
                    }
                )

        # If we've passed the cutoff point, stop
        if found_cutoff and all(
            datetime.fromisoformat(i["date_added"].replace("Z", "+00:00")) > cutoff_dt
            for i in items
        ):
            log(f"Found all releases to delete. Total: {len(releases)}")
            break

        pagination = data.get("pagination", {})
        if page >= pagination.get("pages", 0):
            break

        page += 1
        log(f"Fetched page {page - 1}... ({len(releases)} releases so far)")

    return releases


def delete_from_old_account(release_id, instance_id, folder_id):
    """Delete a release from the old account."""
    url = f"{BASE_URL}/users/{OLD_USERNAME}/collection/folders/{folder_id}/releases/{release_id}/instances/{instance_id}"
    headers = {"Authorization": f"Discogs token={OLD_ACCOUNT_TOKEN}"}

    resp = requests.delete(url, headers=headers)
    time.sleep(REQUEST_DELAY)

    return resp.status_code == 204  # 204 = successful deletion


def main():
    log("=" * 70)
    log("Discogs Collection Cleanup - Removing from Old Account")
    log("=" * 70)
    log(f"Account: {OLD_USERNAME}")
    log(f"Cutoff: {CUTOFF_DATE}")
    log("=" * 70)

    # Verify token is set
    if OLD_ACCOUNT_TOKEN == "YOUR_OLD_ACCOUNT_TOKEN_HERE":
        log("\nERROR: You need to set OLD_ACCOUNT_TOKEN in the script!")
        log("Get your token from: https://www.discogs.com/settings/developers")
        log("Generate a Personal Access Token and paste it into this script.")
        return

    # Fetch releases
    releases = get_releases_to_delete()
    log(f"\nFound {len(releases)} releases to delete\n")

    if not releases:
        log("No releases found. Exiting.")
        return

    # Show first 5
    log("First 5 releases to be deleted:")
    for i, r in enumerate(releases[:5], 1):
        log(f"  {i}. {r['artist']} - {r['title']}")

    # Safety confirmation
    log(f"\n{'=' * 70}")
    log(
        f"WARNING: This will PERMANENTLY DELETE {len(releases)} releases from {OLD_USERNAME}"
    )
    log(f"{'=' * 70}")
    confirm = input("\nType 'DELETE' to confirm, or Ctrl+C to cancel: ")

    if confirm != "DELETE":
        log("Cancelled by user.")
        return

    # Delete from old account
    log("\nStarting deletion...\n")
    success = 0
    failed = 0

    for i, release in enumerate(releases, 1):
        artist = release["artist"]
        title = release["title"]
        release_id = release["release_id"]
        instance_id = release["instance_id"]
        folder_id = release["folder_id"]

        log(f"[{i}/{len(releases)}] {artist} - {title}")

        if delete_from_old_account(release_id, instance_id, folder_id):
            log(f"  ✓ Deleted from {OLD_USERNAME}")
            success += 1
        else:
            log(f"  ✗ Failed to delete")
            failed += 1

        if i % 50 == 0:
            log(f"\nProgress: {success} deleted, {failed} failed\n")

    log("\n" + "=" * 70)
    log("Cleanup Complete!")
    log(f"Deleted from {OLD_USERNAME}: {success}")
    log(f"Failed: {failed}")
    log("=" * 70)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        log("\n\nDeletion cancelled by user")
