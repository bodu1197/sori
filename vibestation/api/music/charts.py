from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from ytmusicapi import YTMusic

ytmusic = YTMusic()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)

            country = params.get('country', ['ZZ'])[0]  # ZZ = Global

            # Get charts
            charts = ytmusic.get_charts(country)

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=3600')  # 1 hour
            self.end_headers()

            self.wfile.write(json.dumps({
                'success': True,
                'data': charts
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': str(e)
            }).encode())
