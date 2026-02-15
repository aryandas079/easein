
import os
import google.generativeai as genai
from dotenv import load_dotenv
import threading

# Load environment variables
# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

# Configure Gemini
API_KEY = os.getenv("GEMINI_API_KEY") or "AIzaSyCzL_N89L36J-O12BKWXDrV8I97WcvZWIw"
genai.configure(api_key=API_KEY)

# Generation Config
# Generation Config - Optimized for Speed
generation_config = {
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192, # Increased to prevent JSON cutoff
}

# Use gemini-flash-latest (Previously worked)
model = genai.GenerativeModel("gemini-flash-latest", generation_config=generation_config)
vision_model = genai.GenerativeModel("gemini-flash-latest", generation_config=generation_config)

# ... (Local LLM Setup remains) ...

def generate_offline_tasks(text):
    """
    Offline Heuristic: Extracts tasks based on formatting (bullets, numbers) or sentence structure.
    """
    import re
    tasks = []
    
    # 1. Look for explicit lists (1. , -, *, •)
    list_pattern = re.compile(r'^\s*(?:[\-\*\•]|\d+\.)\s+(.+)', re.MULTILINE)
    matches = list_pattern.findall(text)
    
    if matches:
        tasks = [m.strip() for m in matches if len(m.strip()) > 5]
    
    # 2. If no lists, split by newlines if lines look like headers/tasks
    if len(tasks) < 3:
        lines = text.split('\n')
        for line in lines:
            clean = line.strip()
            if 10 < len(clean) < 100:
                tasks.append(clean)
                
    # 3. Sentence Splitting (For paragraphs) - NEW
    if len(tasks) < 3:
        # Split by .!? followed by space
        sentences = re.split(r'(?<=[.!?])\s+', text)
        for s in sentences:
            clean = s.strip()
            if 10 < len(clean) < 150: # Reasonable task length
                tasks.append(clean)
    
    # Clean tasks
    tasks = [clean_task_text(t) for t in tasks]
                
    return tasks[:20]

def clean_task_text(text):
    """
    Cleans task text:
    1. Fixes "S P A C E D  T E X T" (common OCR issue)
    2. Converts ALL CAPS to Sentence case
    3. Removes mostly non-alphanumeric noise
    """
    import re
    
    # 1. Fix Spaced Text (e.g., "I N N O V A T E")
    # Look for patterns where single chars are separated by spaces
    # We'll use a simple heuristic: if > 50% of words are 1 letter, it's likely spaced text
    words = text.split()
    if len(words) > 3:
        single_letter_words = [w for w in words if len(w) == 1 and w.isalpha()]
        if len(single_letter_words) / len(words) > 0.5:
            # It's likely spaced text. Join it.
            # But wait, "A I" is valid. "I am a" is valid.
            # Stricter: space between EVERY letter?
            # Regex for "L E T T E R S"
            if re.search(r'\b(?:[A-Z]\s){3,}[A-Z]\b', text):
                # Replace matches
                text = re.sub(r'\b((?:[A-Z]\s)+[A-Z])\b', lambda m: m.group(1).replace(' ', ''), text)

    # 2. Fix All Caps
    if text.isupper() and len(text) > 4:
        text = text.capitalize()
        
    # 3. Basic cleanup
    text = text.strip()
    return text

def generate_tasks(content_data, user_instructions=""):
    """
    Generates a list of tasks.
    Priority:
    1. Gemini API (Smart, Variable, Context-Aware)
    2. Offline Heuristic (Fastest Fallback)
    3. Local LLM (Slow Fallback - Last Resort)
    """
    
    # ── STRATEGY 1: GEMINI API (Primary) ──
    try:
        print("Calling Gemini...")
        
        # Determine complexity/size
        is_large = False
        input_content = ""
        
        if content_data["type"] == "text":
            input_content = content_data["content"]
            word_count = len(input_content.split())
            is_large = word_count > 1500
            
            prompt = f"""
            Role: Professional Project Manager.
            Task: Break down the provided content into a detailed list of actionable micro-tasks.
            
            Constraints:
            1. Quantity: Generate between 5 and 100 tasks depending on content size.
               - Small content (< 1 page): 5-15 tasks.
               - Medium content (1-5 pages): 15-40 tasks.
               - Large content (> 5 pages): 40-100 tasks.
            2. Format: RETURN ONLY A RAW JSON LIST OF STRINGS. No markdown, no "json" tags.
            3. Content: Each task should be clear and actionable.
            
            Context: {user_instructions[:500]}
            
            Input Content:
            {input_content[:20000]} 
            """ 
            
            response = model.generate_content(prompt)
            return parse_response(response.text)

        elif content_data["type"] == "image":
            # Image logic
            img_blob = content_data["content"]
            import io
            from PIL import Image
            image = Image.open(io.BytesIO(img_blob))
            
            prompt = f"Analyze this image. Break it down into actionable tasks. Context: {user_instructions} Return ONLY JSON list."
            response = vision_model.generate_content([prompt, image])
            return parse_response(response.text)

        elif content_data["type"] == "pdf":
            # PDF logic
            pdf_blob = content_data["content"]
            mime_type = content_data["mime_type"]
            
            prompt_text = f"""
            Role: Professional Project Manager.
            Task: Break down the provided document into a detailed list of actionable micro-tasks.
            
            Constraints:
            1. Quantity: Generate a comprehensive, variable list of tasks (e.g., 20-60) covering all details. Do NOT stick to a fixed small number.
               - Adapt to content size but bias towards MORE tasks (minimum 20 for full documents).
            2. Format: RETURN ONLY A RAW JSON LIST OF STRINGS. No markdown, no "json" tags.
            3. Content: Each task should be clear, concise, and actionable.
            
            Context: {user_instructions[:500]}
            """
            
            prompt_parts = [
                prompt_text,
                {"mime_type": mime_type, "data": pdf_blob},
                "Return ONLY JSON list of strings. Example: [\"Task 1\", \"Task 2\"]"
            ]
            
            response = model.generate_content(prompt_parts)
            return parse_response(response.text)
            
    except Exception as e:
        print(f"AI Engine Error: {e}")
        print("Gemini failed. Switching to Offline/Local...")
        
        # ── STRATEGY 2: OFFLINE HEURISTIC (Fastest) ──
        # We try this BEFORE local LLM because user requested <5s response
        
        fallback_content = ""
        if content_data["type"] == "text":
            fallback_content = content_data["content"]
        elif content_data["type"] == "pdf" and "fallback_text" in content_data:
            fallback_content = content_data["fallback_text"]
            
        if fallback_content:
            print("Attempting Offline Heuristic...")
            tasks = generate_offline_tasks(fallback_content)
            if tasks and len(tasks) >= 3:
                print("Offline Heuristic successful.")
                return tasks
        
        # ── STRATEGY 3: LOCAL LLM (Slow Last Resort) ──
        # Removed generate_local_tasks as it was undefined and causing crashes.
        # Fallback to a simple error message if offline heuristic also failed.
        
        return [f"Error: Could not generate tasks. API Quota exceeded and offline parsing failed."]

def generate_mindmap_code(tasks):
    """
    Generates Mermaid.js syntax for a flowchart/mindmap from a list of tasks.
    """
    try:
        prompt = f"""
        create a mermaid.js flowchart from these tasks.
        Context: The user has a list of tasks.
        Input Tasks: {tasks}
        
        Strict Rules:
        1. Return ONLY the mermaid code. Start with `graph TD` or `mindmap`.
        2. Do NOT use markdown blocks (```mermaid). Just the code.
        3. Make it colorful and grouped logicallly.
        4. Use short node labels, but maintain the flow.
        """
        
        response = model.generate_content(prompt)
        code = response.text.replace("```mermaid", "").replace("```", "").strip()
        return code
    except Exception as e:
        print(f"Mermaid Gen Error: {e}")
        print("Falling back to Offline Mindmap...")
        return generate_offline_mindmap(tasks)

def generate_offline_mindmap(tasks):
    """
    Generates a simple Mermaid flowchart without AI.
    """
    mermaid_code = "graph TD\n"
    mermaid_code += "    Start((Project Start)) --> T0\n"
    
    # Limit to top 20 tasks to prevent rendering issues
    display_tasks = tasks[:20]
    
    for i, task in enumerate(display_tasks):
        safe_task = task.replace('"', '').replace('(', '').replace(')', '').replace('[', '').replace(']', '')[:30] + "..."
        node_id = f"T{i}"
        mermaid_code += f"    {node_id}[\"{safe_task}\"]\n"
        
        if i < len(display_tasks) - 1:
            next_node = f"T{i+1}"
            mermaid_code += f"    {node_id} --> {next_node}\n"
            
    if len(tasks) > 20:
        mermaid_code += f"    T{len(display_tasks)-1} --> End((...and {len(tasks)-20} more))\n"
        
    return mermaid_code

def parse_response(text):
    import json
    import re
    
    # print(f"Raw AI Response: {text[:100]}...") # Debug log

    try:
        # 1. Try finding the JSON list structure directly (Robust regex)
        match = re.search(r'\[.*\]', text, re.DOTALL)
        if match:
            json_str = match.group(0)
            return json.loads(json_str)
            
        # 2. Try cleaning markdown if regex failed
        clean_text = re.sub(r"```json|```", "", text).strip()
        return json.loads(clean_text)
        
    except Exception as e:
        print(f"JSON Parse Failed: {e}")
        # 3. Fallback: Heuristic extraction of lines that look like tasks
        lines = text.split('\n')
        tasks = []
        for line in lines:
            line = re.sub(r"```json|```", "", line).strip() # Clean line artifacts
            
            # Skip empty or bracket-only lines
            if not line or line in ['[', ']', '[]']: continue
            
            # Remove numbering "1. ", "- ", etc.
            cleaned_line = re.sub(r'^[\d\-\*\•]+\.?\s*', '', line)
            
            # Identify if it's a string inside a failed JSON "Task 1",
            string_match = re.search(r'"([^"]+)"', line)
            if string_match:
                cleaned_line = string_match.group(1)
            
            if len(cleaned_line) > 3:
                tasks.append(cleaned_line)
                
        return [clean_task_text(t) for t in tasks] if tasks else ["Error: Could not parse tasks."]

