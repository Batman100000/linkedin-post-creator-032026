#!/usr/bin/env python3
import http.server
import socketserver
import ssl
import json
import os
from pathlib import Path
import gzip
from urllib.parse import unquote, urlparse, parse_qs

PORT = 8001
WATCH_FOLDER = r'C:\Users\asafa\FinishDownloads'
POSTERS_DIR = os.path.join(os.path.dirname(__file__), 'posters')
os.makedirs(POSTERS_DIR, exist_ok=True)

VIDEO_EXT = {'.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.flv', '.webm', '.ts', '.m2ts'}

class LibraryHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        route = parsed.path
        params = parse_qs(parsed.query)

        # Helper: get single param
        def get_param(name):
            return params.get(name, [''])[0] if name in params else ''

        # /api/scan - list folders
        if route == '/api/scan':
            try:
                items = []
                for item in os.listdir(WATCH_FOLDER):
                    path = os.path.join(WATCH_FOLDER, item)
                    if os.path.isdir(path):
                        stat = os.stat(path)
                        items.append({
                            'name': item,
                            'path': path,
                            'isDir': True,
                            'mtime': int(stat.st_mtime_ns / 1e6)
                        })
                self.send_json(items)
            except Exception as e:
                self.send_json({'error': str(e)}, 500)
            return

        # /api/count-videos - recursive video count
        if route == '/api/count-videos':
            def count_videos(directory):
                count = 0
                try:
                    for root, dirs, files in os.walk(directory):
                        for f in files:
                            if Path(f).suffix.lower() in VIDEO_EXT:
                                count += 1
                except:
                    pass
                return count
            total = count_videos(WATCH_FOLDER)
            self.send_json({'totalVideoFiles': total})
            return

        # /api/folder-type - check folder contents
        if route == '/api/folder-type':
            folder_path = unquote(get_param('path'))
            try:
                files = []
                for root, dirs, filelist in os.walk(folder_path):
                    for f in filelist:
                        ext = Path(f).suffix.lower()
                        files.append(ext)

                has_mp3 = any(ext in {'.mp3', '.flac', '.wav', '.m4a'} for ext in files)
                has_video = any(ext in VIDEO_EXT for ext in files)
                self.send_json({
                    'hasMP3': has_mp3,
                    'hasVideo': has_video,
                    'isMusic': has_mp3 and not has_video,
                    'fileCount': len(files)
                })
            except Exception as e:
                self.send_json({'error': 'read error'}, 500)
            return

        # /api/operations-report - detailed audit
        if route == '/api/operations-report':
            try:
                MUSIC_KW = r'mp3|music|billboard|songs|chart|acoustic|party|flac|album|rock'
                SERIES_KW = r'S\d{2}|season\s*\d|complete'
                import re

                items = []
                for folder_name in os.listdir(WATCH_FOLDER):
                    folder_path = os.path.join(WATCH_FOLDER, folder_name)
                    if not os.path.isdir(folder_path):
                        continue

                    stat = os.stat(folder_path)

                    # Count videos recursively
                    video_count = 0
                    for root, dirs, files in os.walk(folder_path):
                        for f in files:
                            if Path(f).suffix.lower() in VIDEO_EXT:
                                video_count += 1

                    is_music = bool(re.search(MUSIC_KW, folder_name, re.I))
                    is_series = bool(re.search(SERIES_KW, folder_name, re.I))

                    poster_file = os.path.join(POSTERS_DIR,
                        folder_name.lower().replace(' ', '-').replace('[', '').replace(']', '') + '.jpg')
                    has_poster = os.path.exists(poster_file)

                    items.append({
                        'name': folder_name,
                        'videoCount': video_count,
                        'isMusic': is_music,
                        'isSeries': is_series,
                        'hasPoster': has_poster,
                        'shouldDisplay': not is_music and video_count > 0,
                        'mtime': int(stat.st_mtime_ns / 1e6)
                    })

                items.sort(key=lambda x: x['name'])

                report = {
                    'totalFolders': len(items),
                    'totalVideos': sum(i['videoCount'] for i in items),
                    'musicFolders': sum(1 for i in items if i['isMusic']),
                    'videoFolders': sum(1 for i in items if not i['isMusic']),
                    'seriesFolders': sum(1 for i in items if not i['isMusic'] and i['isSeries']),
                    'movieFolders': sum(1 for i in items if not i['isMusic'] and not i['isSeries']),
                    'emptyFolders': sum(1 for i in items if i['videoCount'] == 0),
                    'postersFound': sum(1 for i in items if i['hasPoster']),
                    'items': items
                }
                self.send_json(report)
            except Exception as e:
                self.send_json({'error': str(e)}, 500)
            return

        # Default: serve static files
        return super().do_GET()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

if __name__ == '__main__':
    server_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(server_dir)

    cert_file = os.path.join(server_dir, 'cert.pem')
    key_file = os.path.join(server_dir, 'key.pem')
    use_https = os.path.exists(cert_file) and os.path.exists(key_file)

    with socketserver.TCPServer(('', PORT), LibraryHandler) as httpd:
        if use_https:
            context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            context.load_cert_chain(cert_file, key_file)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            protocol = 'https'
        else:
            protocol = 'http'

        print(f'Server running at {protocol}://localhost:{PORT}')
        print(f'Certificate: {cert_file if use_https else "Not configured"}')
        print(f'Press Ctrl+C to stop')
        httpd.serve_forever()
