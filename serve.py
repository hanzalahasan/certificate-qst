import os, sys
os.chdir("/Users/mac/Documents/Certificate App")
import http.server, socketserver
PORT = 3344
Handler = http.server.SimpleHTTPRequestHandler
Handler.extensions_map.update({'.js': 'application/javascript', '.css': 'text/css'})
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    httpd.serve_forever()
