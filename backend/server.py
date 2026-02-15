
import http.server
import socketserver
import os
import sys

# Configuration
PORT = 8000
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')

class ApplicationHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        # Suppress logging to keep console clean, or customize
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.client_address[0],
                          self.log_date_time_string(),
                          format%args))

if __name__ == "__main__":
    # Ensure we are in the backend directory context or can find frontend
    if not os.path.isdir(FRONTEND_DIR):
        print(f"Error: Frontend directory not found at {FRONTEND_DIR}")
        sys.exit(1)

    print(f"Starting Easein Server at http://localhost:{PORT}")
    print(f"Serving files from: {os.path.abspath(FRONTEND_DIR)}")
    print("Press Ctrl+C to stop.")

    try:
        with socketserver.TCPServer(("", PORT), ApplicationHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.shutdown()
    except OSError as e:
        if e.errno == 10048:
            print(f"Error: Port {PORT} is already in use. Please stop other servers or use a different port.")
        else:
            raise e
