
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=api_key)
    print("Listing available models:")
    try:
        if hasattr(client, 'models') and hasattr(client.models, 'list'):
            for m in client.models.list():
                if 'gemini' in m.name:
                    print(f" - {m.name}")
    except Exception as e:
        print(f"Error listing models: {e}")

except Exception as e:
    print(f"An unexpected error occurred: {e}")
