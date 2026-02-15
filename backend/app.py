
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import datetime
import json
from werkzeug.utils import secure_filename
from file_parser import extract_text
import ai_engine
from ai_engine import generate_tasks

# Configuration
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend')
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app) # Enable CORS for development
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 # 16MB max limit

# Ensure upload dir exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ── API Routes ──

@app.route('/api/generate-tasks', methods=['POST'])
def handle_generation():
    # Allow if EITHER file or text is present
    if 'file' not in request.files and not request.form.get('text'):
        return jsonify({"error": "No file or text provided"}), 400
    
    user_instructions = request.form.get('instructions', "")
    user_text_inner = request.form.get('text', "")
    
    content_data = {"type": "text", "content": ""}

    # 1. Handle File content
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename != '':
            # Parse file
            content_data = extract_text(file)
            if content_data["type"] == "error":
                return jsonify({"error": content_data["content"]}), 400
            
            # Combine User Text with File Content
            if user_text_inner:
                if content_data["type"] == "text":
                    content_data["content"] += f"\n\n[USER INPUT Context]: {user_text_inner}"
                elif content_data["type"] == "image" or content_data["type"] == "pdf":
                    # For images/PDFs, user text guides the model instructions
                    user_instructions += f"\n\n[USER INPUT Context]: {user_text_inner}"

    # 2. Handle Text Only (if no file was processed/uploaded)
    if (not content_data["content"] or content_data["content"] == "") and user_text_inner and content_data["type"] == "text":
        content_data = {"type": "text", "content": user_text_inner}
    
    # 3. Generate Tasks
    tasks = generate_tasks(content_data, user_instructions)
    
    return jsonify({"tasks": tasks})



@app.route('/api/generate-mindmap', methods=['POST'])
def generate_mindmap_route():
    try:
        data = request.json
        tasks = data.get('tasks', [])
        if not tasks:
            return jsonify({"error": "No tasks provided"}), 400
            
        mermaid_code = ai_engine.generate_mindmap_code(tasks)
        return jsonify({"mermaid": mermaid_code})
    except Exception as e:
        print(f"Mindmap Error: {e}")
        return jsonify({"error": str(e)}), 500

# ── History Persistence ──
HISTORY_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'history.json')

def load_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_history_entry(entry):
    history = load_history()
    # Add timestamp if not present
    if 'timestamp' not in entry:
        entry['timestamp'] = datetime.datetime.now().isoformat()
    
    # Prepend new entry (newest first)
    history.insert(0, entry)
    
    # Limit to last 50 entries to keep file small
    history = history[:50]
    
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=2)

@app.route('/api/history', methods=['GET'])
def get_history():
    return jsonify(load_history())

@app.route('/api/save-history', methods=['POST'])
def save_history_route():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data"}), 400
        
        save_history_entry(data)
        return jsonify({"status": "saved"})
    except Exception as e:
        print(f"History Save Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear-history', methods=['POST'])
def clear_history_route():
    try:
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return jsonify({"status": "cleared"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ── Use Logging ──
@app.route('/api/log-user', methods=['POST'])
def log_user():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        # Format: [Time] User: email/phone | Provider: google/email/phone | Name: ...
        user_id = data.get('email') or data.get('phone') or 'Unknown'
        provider = data.get('provider', 'Unknown')
        name = data.get('name', 'N/A')
        
        log_entry = f"[{timestamp}] User: {user_id} | Provider: {provider} | Name: {name}\n"
        
        # Log to a file in the backend directory
        log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'user_activity_log.txt')
        
        with open(log_file_path, 'a', encoding='utf-8') as f:
            f.write(log_entry)
            
        return jsonify({"status": "logged"})
    except Exception as e:
        print(f"Logging Error: {e}")
        return jsonify({"error": str(e)}), 500


# ── Frontend Routes ──

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_files(path):
    return send_from_directory(app.static_folder, path)

if __name__ == '__main__':
    print("Starting Flask Server on port 8000...")
    app.run(host='0.0.0.0', port=8000, debug=False)
