# VibeStation - Music Search API
# Vercel Python Serverless Function

from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from ytmusicapi import YTMusic

# Initialize YTMusic (no auth required for public features)
ytmusic = YTMusic()


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            
            query = params.get('q', [''])[0]
            filter_type = params.get('filter', [None])[0]
            limit = int(params.get('limit', ['20'])[0])
            
            if not query:
                self.send_error_response(400, "Query parameter 'q' is required")
                return
            
            # Search with ytmusicapi
            results = ytmusic.search(
                query=query,
                filter=filter_type,  # songs, videos, albums, artists, playlists
                limit=limit
            )
            
            # Send success response
            self.send_json_response(200, {
                "success": True,
                "query": query,
                "filter": filter_type,
                "count": len(results),
                "results": results
            })
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=86400')
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
