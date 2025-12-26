# VibeStation - Home Content API
# Vercel Python Serverless Function

from http.server import BaseHTTPRequestHandler
import json
from ytmusicapi import YTMusic

ytmusic = YTMusic()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Get home page content (personalized for logged out users = trending)
            home = ytmusic.get_home(limit=6)
            
            self.send_json_response(200, {
                "success": True,
                "sections": home
            })
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200')
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
