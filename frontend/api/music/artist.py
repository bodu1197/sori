# VibeStation - Artist API
# Vercel Python Serverless Function

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from ytmusicapi import YTMusic

ytmusic = YTMusic()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            artist_id = params.get('id', [''])[0]
            
            if not artist_id:
                self.send_error_response(400, "Parameter 'id' (artist browseId) is required")
                return
            
            # Get artist info
            artist = ytmusic.get_artist(artist_id)
            
            # Get artist albums if available
            albums = []
            if artist.get('albums', {}).get('browseId'):
                try:
                    albums_data = ytmusic.get_artist_albums(
                        artist['albums']['browseId'],
                        artist['albums'].get('params', '')
                    )
                    albums = albums_data if albums_data else []
                except Exception:
                    albums = artist.get('albums', {}).get('results', [])
            
            self.send_json_response(200, {
                "success": True,
                "artist": {
                    "name": artist.get('name'),
                    "description": artist.get('description'),
                    "views": artist.get('views'),
                    "subscribers": artist.get('subscribers'),
                    "thumbnails": artist.get('thumbnails', []),
                    "songs": artist.get('songs', {}).get('results', [])[:10],
                    "albums": albums[:20],
                    "videos": artist.get('videos', {}).get('results', [])[:10],
                    "related": artist.get('related', {}).get('results', [])[:5]
                }
            })
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    
    def send_error_response(self, status_code, message):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": False,
            "error": message
        }, ensure_ascii=False).encode('utf-8'))
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
