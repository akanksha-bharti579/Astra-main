
import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables
load_dotenv(".env")
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found in .env")
    sys.exit(1)

client = genai.Client(api_key=api_key)

# The model specified in config.py
model_id = "gemini-2.5-flash"

print(f"Testing model: {model_id}")

try:
    response = client.models.generate_content(
        model=model_id, 
        contents="Hello, are you working?"
    )
    print("Success! Model works.")
    print(response.text)
except Exception as e:
    print(f"Error with model {model_id}: {e}")
    
    print("\nTrying fallback model: gemini-2.0-flash")
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash", 
            contents="Hello, are you working?"
        )
        print("Success! gemini-2.0-flash works.")
    except Exception as e2:
        print(f"Error with gemini-2.0-flash: {e2}")

    print("\nTrying fallback model: gemini-1.5-flash")
    try:
        response = client.models.generate_content(
            model="gemini-1.5-flash", 
            contents="Hello, are you working?"
        )
        print("Success! gemini-1.5-flash works.")
    except Exception as e3:
        print(f"Error with gemini-1.5-flash: {e3}")
