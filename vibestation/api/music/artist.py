from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import parse_qs, urlparse
from ytmusicapi import YTMusic

ytmusic = YTMusic()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse path to get artist ID
            parsed = urlparse(self.path)
            path_parts = parsed.path.strip('/').split('/')

            # Expected: /api/music/artist?id=CHANNEL_ID
            params = parse_qs(parsed.query)
            channel_id = params.get('id', [''])[0]

            if not channel_id:
                self.send_error(400, 'Artist ID is required')
                return

            # Get artist info
            artist = ytmusic.get_artist(channel_id)

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=604800')  # 7 days
            self.end_headers()

            self.wfile.write(json.dumps({
                'success': True,
                'data': artist
            }).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'success': False,
                'error': str(e)
            }).encode())
