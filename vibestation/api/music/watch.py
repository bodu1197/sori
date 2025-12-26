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

            video_id = params.get('videoId', [''])[0]
            playlist_id = params.get('playlistId', [''])[0]
            radio = params.get('radio', ['false'])[0].lower() == 'true'
            shuffle = params.get('shuffle', ['false'])[0].lower() == 'true'
            limit = int(params.get('limit', ['25'])[0])

            watch = ytmusic.get_watch_playlist(
                videoId=video_id if video_id else None,
                playlistId=playlist_id if playlist_id else None,
                limit=limit,
                radio=radio,
                shuffle=shuffle
            )

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Cache-Control', 'public, max-age=300')
            self.end_headers()
            self.wfile.write(json.dumps({'success': True, 'data': watch}).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
