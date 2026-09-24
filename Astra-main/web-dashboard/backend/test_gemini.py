
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

print(f"DEBUG: API Key found (starts with {api_key[:4]}...)")

try:
    from google import genai
    from google.genai import types
    
    print("Successfully imported google.genai")
    
    client = genai.Client(api_key=api_key)
    print("Successfully created genai.Client")
    
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents="Hello, are you working?"
        )
        print("Response received:")
        print(response.text)
    except Exception as e:
        print(f"Error generating content: {e}")
        # Try listing models to see if connection works at all
        try:
            print("Listing models...")
            # adapting to potential API differences
            if hasattr(client, 'models') and hasattr(client.models, 'list'):
                for m in client.models.list():
                    print(f" - {m.name}")
        except Exception as e2:
            print(f"Error listing models: {e2}")

except ImportError as e:
    print(f"ImportError: {e}")
    print("Please check installed packages.")
except Exception as e:
    print(f"An unexpected error occurred: {e}")
