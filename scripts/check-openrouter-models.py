import os, json, sys

api_key = os.environ.get("OPENROUTER_API_KEY", "")
import urllib.request, urllib.error

url = "https://openrouter.ai/api/v1/models"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})

try:
    with urllib.request.urlopen(req) as response:
        data = json.load(response)
except urllib.error.HTTPError as e:
    print(f"HTTP Error: {e.code} - {e.read().decode()}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

targets = [
    "gemini-3.7-flash",
    "anthropic/claude-opus-4.6",
    "openai/gpt-5.6-sol",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
    "google/gemini-3.7-flash",
]

found = []
for model in data.get("data", []):
    mid = model.get("id", "")
    if any(t in mid for t in targets):
        pricing = model.get("pricing", {})
        prompt_price = pricing.get("prompt", 0)
        completion_price = pricing.get("completion", 0)
        context = model.get("context_length", "N/A")
        found.append({
            "id": mid,
            "name": model.get("name", "N/A"),
            "prompt_price": prompt_price,
            "completion_price": completion_price,
            "context_length": context
        })

print(f"Found {len(found)} matching models:\n")
for m in found:
    prompt = float(m['prompt_price']) if m['prompt_price'] else 0
    completion = float(m['completion_price']) if m['completion_price'] else 0
    print(f"[OK] {m['id']}")
    print(f"  Name: {m['name']}")
    print(f"  Prompt: ${prompt:.6f}/1M")
    print(f"  Completion: ${completion:.6f}/1M")
    print(f"  Context: {m['context_length']}")
    print("")

target_set = set(targets)
found_set = {m['id'] for m in found}
missing = [t for t in targets if not any(t in f for f in found_set)]
if missing:
    print("MISSING:")
    for m in missing:
        print(f"  [MISSING] {m}")