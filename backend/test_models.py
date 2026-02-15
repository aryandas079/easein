import google.generativeai as genai
import os
from dotenv import load_dotenv
import time

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY") or "AIzaSyCzL_N89L36J-O12BKWXDrV8I97WcvZWIw"
genai.configure(api_key=api_key)

candidates = [
    "gemini-2.0-flash-lite-preview-02-05", # Hypothetical new one
    "gemini-2.0-flash-lite-001",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
    "gemini-2.0-flash",
    "gemini-pro-latest",
    "gemini-2.0-pro-exp-02-05",
    "gemini-exp-1206"
]

print(f"Testing API Key: {api_key[:10]}...")

for model_name in candidates:
    print(f"Testing {model_name}...", end=" ", flush=True)
    try:
        model = genai.GenerativeModel(model_name)
        start = time.time()
        response = model.generate_content("Say hi")
        duration = time.time() - start
        
        # Only log success
        with open('results.txt', 'a') as f:
            f.write(f"{model_name}|{duration:.2f}\n")
            
        print(f"✅ SUCCESS ({duration:.2f}s)")
        print(f"   Response: {response.text.strip()}")
    except Exception as e:
        print(f"❌ FAILED: {str(e)[:100]}...")
