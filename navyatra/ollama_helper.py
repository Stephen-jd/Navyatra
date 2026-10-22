import json
import os
import urllib.request

OLLAMA_API_URL = "http://127.0.0.1:11434/api/generate"
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:latest")
DEFAULT_TIMEOUT_SEC = int(os.environ.get("OLLAMA_TIMEOUT_SEC", "600"))

def query_ollama_raw(prompt, system_prompt=None):
    """
    Queries local Ollama API directly. Returns raw text response from Qwen.
    """
    model_name = DEFAULT_MODEL
    if model_name == "qwen2.5:3b":
        model_name = "qwen2.5:latest"
    timeout_seconds = DEFAULT_TIMEOUT_SEC
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
    }
    if system_prompt:
        payload["system"] = system_prompt

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        OLLAMA_API_URL,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)
            return res_json.get("response", "").strip()
    except Exception as e:
        raise Exception(
            f"Ollama local connection error for model '{model_name}' after {timeout_seconds}s: {str(e)}"
        )

def extract_and_parse_json(response_text):
    """
    Robust JSON extractor to strip markdown backticks or surrounding text 
    from the local Qwen model's response.
    """
    text = response_text.strip()
    
    # Try direct parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Extract content inside markdown code blocks (e.g. ```json ... ```)
    if "```" in text:
        try:
            start = text.find("```")
            # Move past triple backticks
            start_content = text.find("\n", start)
            if start_content == -1:
                start_content = start + 3
            end = text.rfind("```")
            if end > start_content:
                extracted = text[start_content:end].strip()
                return json.loads(extracted)
        except Exception:
            pass

    # Fallback to search between first '{' and last '}'
    try:
        start_brace = text.find("{")
        end_brace = text.rfind("}")
        if start_brace != -1 and end_brace != -1:
            json_str = text[start_brace:end_brace + 1]
            return json.loads(json_str)
    except Exception as e:
        raise Exception(f"Failed to parse Qwen JSON response: {str(e)}. Raw output was: {response_text[:300]}")

    raise Exception(f"No valid JSON structure found in Qwen output: {response_text[:300]}")

def explore_spots_ai(location, sub_location):
    """
    Directly queries local Qwen model for top spots in a sub-location.
    """
    prompt = f"""
    Analyze the location "{location}" in India, and specifically the sub-location "{sub_location}".
    Provide a list of the 6 best tourist and local spots in this area.
    Classify them under the following categories: 'Food', 'Location', 'Devotion', 'Hotel', 'Stay', 'Scenery'.
    Include name, category, description, and an estimated cost in Indian Rupees (e.g. "INR 150 per person" or "INR 2000 per night").
    
    CRITICAL SPEED RULE: Keep all descriptions extremely short, punchy, and concise (maximum 10 words). This reduces token counts so the page renders fast.
    
    You must format your response STRICTLY as a JSON object matching this structure:
    {{
      "location": "{location}",
      "sub_location": "{sub_location}",
      "spots": [
        {{
          "name": "Spot Name",
          "category": "Food", 
          "description": "Ultra-concise overview (max 10 words)",
          "estimated_cost": "INR XXX"
        }}
      ]
    }}
    
    Category field must be exactly one of: 'Food', 'Location', 'Devotion', 'Hotel', 'Stay', 'Scenery'.
    Do not output any introductory or explanatory text outside the JSON.
    """
    
    system_prompt = "You are an ultra-concise travel database assistant. You only output valid JSON. Keep descriptions under 10 words."
    
    raw_response = query_ollama_raw(prompt, system_prompt)
    data = extract_and_parse_json(raw_response)
    
    if "spots" not in data:
        raise Exception("Qwen response missing 'spots' key.")
        
    return data["spots"]

def generate_itinerary_ai(location, sub_location, budget, days):
    """
    Directly queries local Qwen model to generate a cost-effective daily visual map.
    """
    prompt = f"""
    Create a detailed, cost-effective visual map itinerary for a trip to "{location}" (specifically "{sub_location}") in India.
    Constraints:
    - Trip duration: {days} days.
    - Total budget: INR {budget}.
    - Ensure EVERY single expense fits perfectly under the total budget.
    - Organize day-by-day and list 3-4 specific activities per day, each with an exact hour/time (e.g. "09:00 AM", "01:30 PM", etc.), title, category ('Food', 'Location', 'Devotion', 'Hotel', 'Stay', 'Scenery'), clear travel description, and exact itemized cost.
    - Specify a hotel stay for each day with its name and exact nightly cost.
    - Sum up all costs and specify the total estimated expense and the remaining savings.
    
    CRITICAL SPEED RULE: Keep all activity descriptions ultra-short, brief, and concise (maximum 8 words). Every description MUST be under 8 words. This is vital to speed up local AI generation.
    
    You must format your response STRICTLY as a JSON object matching this structure:
    {{
      "location": "{location}",
      "sub_location": "{sub_location}",
      "budget": {budget},
      "days": {days},
      "total_estimated_expense": 11500,
      "savings": 500,
      "itinerary_days": [
        {{
          "day": 1,
          "theme": "Spiritual Journey & Local Cuisines",
          "activities": [
            {{
              "time": "09:00 AM",
              "title": "Visit Historical Temple",
              "category": "Devotion",
              "description": "Ultra-short description (max 8 words)",
              "cost": 50
            }}
          ],
          "stay": {{
            "name": "Name of Hotel or Stay",
            "category": "Hotel",
            "cost": 1800
          }}
        }}
      ]
    }}
    
    Do not output any introductory or explanatory text. Just the JSON object.
    """
    
    system_prompt = "You are an ultra-concise travel planner. You only output valid JSON. Keep all activity descriptions under 8 words to generate fast."
    
    raw_response = query_ollama_raw(prompt, system_prompt)
    data = extract_and_parse_json(raw_response)
    
    if "itinerary_days" not in data:
        raise Exception("Qwen response missing 'itinerary_days' key.")
        
    return data
