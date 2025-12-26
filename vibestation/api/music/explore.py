from http.server import BaseHTTPRequestHandler
import json
from ytmusicapi import YTMusic

ytmusic = YTMusic()

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            explore = ytmusic.get_explore()

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=3600')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'data': explore}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
