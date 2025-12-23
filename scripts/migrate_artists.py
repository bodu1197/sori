#!/usr/bin/env python3
"""
Migrate all music_artists to virtual members.
Creates auth.users entry and updates profiles for each artist.
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
import time

# Supabase Configuration
SUPABASE_URL = "https://nrtkbulkzhhlstaomvas.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydGtidWxremhobHN0YW9tdmFzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwMzM1MCwiZXhwIjoyMDgxNzc5MzUwfQ.mDX5Ua4Q8VYWTQsmFpEpx-1Ky_MhpNePs9SPOIuYxiI"

HEADERS = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}

def get_all_artists():
    """Get all artists from music_artists table."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/music_artists?select=browse_id,name,thumbnail_url",
        headers=HEADERS
    )
    return response.json() if response.ok else []

def check_existing_virtual_member(browse_id):
    """Check if artist already has a virtual member profile."""
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/profiles?artist_browse_id=eq.{browse_id}&select=id",
        headers=HEADERS
    )
    data = response.json() if response.ok else []
    return len(data) > 0

def create_virtual_member(artist):
    """Create a virtual member for an artist."""
    browse_id = artist["browse_id"]
    name = artist["name"].strip()
    thumbnail = artist.get("thumbnail_url", "")

    # Generate virtual email
    email = f"{browse_id.lower()}@sori.virtual"

    # Create auth user
    auth_response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=HEADERS,
        json={
            "email": email,
            "password": "virtual_member_secure_2024",
            "email_confirm": True,
            "user_metadata": {
                "full_name": name,
                "is_virtual_member": True,
                "artist_browse_id": browse_id
            }
        }
    )

    if not auth_response.ok:
        print(f"  ERROR creating auth user: {auth_response.text}")
        return False

    auth_data = auth_response.json()
    user_id = auth_data["id"]

    # Wait a moment for profile trigger
    time.sleep(0.5)

    # Update profile with virtual member data
    username = name.lower().replace(" ", "").replace("-", "")[:20]

    profile_response = requests.patch(
        f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}",
        headers={**HEADERS, "Prefer": "return=representation"},
        json={
            "member_type": "artist",
            "artist_browse_id": browse_id,
            "is_verified": True,
            "username": username,
            "avatar_url": thumbnail,
            "bio": f"Official SORI profile for {name}"
        }
    )

    if not profile_response.ok:
        print(f"  ERROR updating profile: {profile_response.text}")
        return False

    return True

def main():
    print("=" * 50)
    print("  SORI - Artist Virtual Member Migration")
    print("=" * 50)
    print()

    artists = get_all_artists()
    print(f"Found {len(artists)} artists in music_artists table")
    print()

    created = 0
    skipped = 0
    errors = 0

    for i, artist in enumerate(artists, 1):
        name = artist["name"].strip()
        browse_id = artist["browse_id"]

        print(f"[{i}/{len(artists)}] {name}...", end=" ")

        # Check if already exists
        if check_existing_virtual_member(browse_id):
            print("SKIPPED (already exists)")
            skipped += 1
            continue

        # Create virtual member
        if create_virtual_member(artist):
            print("CREATED")
            created += 1
        else:
            print("ERROR")
            errors += 1

        # Small delay to avoid rate limiting
        time.sleep(0.3)

    print()
    print("=" * 50)
    print(f"  Results: {created} created, {skipped} skipped, {errors} errors")
    print("=" * 50)

if __name__ == "__main__":
    main()
