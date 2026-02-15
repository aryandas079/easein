import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    # Fallback to the hardcoded one in ai_engine.py just for testing
    api_key = "AIzaSyCzL_N89L36J-O12BKWXDrV8I97WcvZWIw"

print(f"Using API Key: {api_key[:5]}...")

try:
    genai.configure(api_key=api_key)
    print("Listing models to models.txt...")
    with open('models.txt', 'w') as f:
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                f.write(f"{m.name}\n")
                print(m.name)
except Exception as e:
    print(f"Error: {e}")
    with open('models_error.txt', 'w') as f:
        f.write(str(e))
