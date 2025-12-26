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

            video_id = params.get('id', [''])[0]

            if not video_id:
                self.send_error(400, 'Video ID is required')
                return

            song = ytmusic.get_song(video_id)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'data': song}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
