# VibeStation - Charts API
# Vercel Python Serverless Function

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from ytmusicapi import YTMusic

ytmusic = YTMusic()

# Supported country codes for charts
SUPPORTED_COUNTRIES = [
    'KR', 'US', 'JP', 'GB', 'DE', 'FR', 'BR', 'IN', 'ID', 'TH',
    'VN', 'PH', 'MY', 'SG', 'TW', 'HK', 'AU', 'CA', 'MX', 'ES'
]


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            country = params.get('country', ['KR'])[0].upper()
            
            if country not in SUPPORTED_COUNTRIES:
                country = 'US'  # Default fallback
            
            # Get charts for country
            charts = ytmusic.get_charts(country)
            
            self.send_json_response(200, {
                "success": True,
                "country": country,
                "charts": {
                    "videos": charts.get('videos', {}).get('items', [])[:20],
                    "artists": charts.get('artists', {}).get('items', [])[:20],
                    "trending": charts.get('trending', {}).get('items', [])[:20]
                }
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
