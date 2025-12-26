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

            query = params.get('q', [''])[0]
            filter_type = params.get('filter', [None])[0]
            limit = int(params.get('limit', ['20'])[0])

            if not query:
                self.send_error(400, 'Query parameter "q" is required')
                return

            # Search using ytmusicapi
            results = ytmusic.search(query, filter=filter_type, limit=limit)

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=21600')  # 6 hours
            self.end_headers()

            self.wfile.write(json.dumps({
                'success': True,
                'data': results
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': str(e)
            }).encode())
