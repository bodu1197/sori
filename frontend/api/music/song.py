# VibeStation - Song Details & Lyrics API
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
            
            video_id = params.get('id', [''])[0]
            include_lyrics = params.get('lyrics', ['false'])[0].lower() == 'true'
            
            if not video_id:
                self.send_error_response(400, "Parameter 'id' (videoId) is required")
                return
            
            # Get song info
            song = ytmusic.get_song(video_id)
            
            response_data = {
                "success": True,
                "song": {
                    "videoId": video_id,
                    "title": song.get('videoDetails', {}).get('title'),
                    "author": song.get('videoDetails', {}).get('author'),
                    "lengthSeconds": song.get('videoDetails', {}).get('lengthSeconds'),
                    "viewCount": song.get('videoDetails', {}).get('viewCount'),
                    "thumbnail": song.get('videoDetails', {}).get('thumbnail', {}).get('thumbnails', []),
                    "description": song.get('microformat', {}).get('microformatDataRenderer', {}).get('description')
                }
            }
            
            # Get lyrics if requested
            if include_lyrics:
                try:
                    watch_playlist = ytmusic.get_watch_playlist(video_id)
                    lyrics_browse_id = watch_playlist.get('lyrics')
                    
                    if lyrics_browse_id:
                        lyrics_data = ytmusic.get_lyrics(lyrics_browse_id)
                        response_data["lyrics"] = {
                            "text": lyrics_data.get('lyrics'),
                            "source": lyrics_data.get('source')
                        }
                    else:
                        response_data["lyrics"] = None
                except Exception:
                    response_data["lyrics"] = None
            
            self.send_json_response(200, response_data)
            
        except Exception as e:
            self.send_error_response(500, str(e))
    
    def send_json_response(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, s-maxage=2592000, stale-while-revalidate=86400')
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
