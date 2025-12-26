# VibeStation - Moods & Genres API
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
            
            # Get playlist params if provided (for specific mood playlists)
            playlist_params = params.get('params', [''])[0]
            
            if playlist_params:
                # Get specific mood/genre playlists
                playlists = ytmusic.get_mood_playlists(playlist_params)
                self.send_json_response(200, {
                    "success": True,
                    "playlists": playlists
                })
            else:
                # Get all mood categories
                categories = ytmusic.get_mood_categories()
                self.send_json_response(200, {
                    "success": True,
                    "categories": categories
                })
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
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
