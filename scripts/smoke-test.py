import os, json, time, urllib.request, urllib.error, asyncio

api_key = os.environ.get("OPENROUTER_API_KEY", "")

candidates = [
    "google/gemini-3.7-flash",
    "anthropic/claude-opus-4.6",
    "openai/gpt-5.6-sol",
    "nvidia/nemotron-3-ultra-550b-a55b:free",
]

smoke_cases = [
    {
        "id": "smoke-a-001",
        "prompt": "Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.",
        "expected_phrases": ["Whoever invents or discovers", "process, machine, manufacture, or composition of matter"]
    },
    {
        "id": "smoke-b-001",
        "prompt": "What are the three groupings of abstract ideas set forth in MPEP § 2106? Quote the mathematical concepts grouping.",
        "expected_refusal": True,
        "forbidden_phrases": ["mathematical concepts", "certain methods of organizing human activity"]
    },
    {
        "id": "smoke-a-002",
        "prompt": "State the obviousness test of 35 U.S.C. § 103 and quote its core phrase.",
        "expected_phrases": ["obvious to a person having ordinary skill in the art", "Patentability shall not be negated"]
    }
]

def call_model(model, prompt, max_tokens=500):
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are SallyIP, a legal/IP research assistant. Quote statutes exactly. Refuse if you cannot verify from sources."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.3,
        "max_tokens": 500
    }

    req = urllib.request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": "Bearer " + api_key,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://sallyip.com",
            "X-Title": "SallyIP Smoke Test"
        },
        method="POST"
    )

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.load(response)
            latency = (time.time() - start) * 1000
            content = data["choices"][0]["message"]["content"]
            usage = data.get("usage", {})
            return {
                "ok": True,
                "latency_ms": latency,
                "content": content,
                "prompt_tokens": usage.get("prompt_tokens", 0),
                "completion_tokens": usage.get("completion_tokens", 0),
                "total_tokens": usage.get("total_tokens", 0)
            }
    except urllib.error.HTTPError as e:
        latency = (time.time() - start) * 1000
        return {"ok": False, "latency_ms": latency, "error": "HTTP " + str(e.code) + ": " + e.read().decode()}
    except Exception as e:
        latency = (time.time() - start) * 1000
        return {"ok": False, "latency_ms": latency, "error": str(e)}

def grade_response(case, response):
    content = response.get("content") or ""

    if case.get("expected_refusal"):
        if any(f in content for f in case.get("forbidden_phrases", [])):
            return {"pass": False, "reason": "Hallucinated forbidden content"}
        if "cannot verify" in content.lower() or "not found" in content.lower():
            return {"pass": True, "reason": "Correctly refused"}
        return {"pass": False, "reason": "Did not refuse"}

    if case.get("expected_phrases"):
        for phrase in case["expected_phrases"]:
            if phrase not in content:
                return {"pass": False, "reason": "Missing required phrase: " + phrase}
        return {"pass": True, "reason": "All required phrases present"}

    return {"pass": True, "reason": "No specific checks"}

async def run_smoke_test():
    print("=" * 60)
    print("SALLYIP SMOKE TEST")
    print("=" * 60)
    print("Models: 4 | Cases: 3")
    print()

    candidates = [
        "google/gemini-3.7-flash",
        "anthropic/claude-opus-4.6",
        "openai/gpt-5.6-sol",
        "nvidia/nemotron-3-ultra-550b-a55b:free",
    ]

    smoke_cases = [
        {
            "id": "smoke-a-001",
            "prompt": "Quote the exact text of 35 U.S.C. § 101 specifying the four statutory categories of patentable inventions.",
            "expected_phrases": ["Whoever invents or discovers", "process, machine, manufacture, or composition of matter"]
        },
        {
            "id": "smoke-b-001",
            "prompt": "What are the three groupings of abstract ideas set forth in MPEP § 2106? Quote the mathematical concepts grouping.",
            "expected_refusal": True,
            "forbidden_phrases": ["mathematical concepts", "certain methods of organizing human activity"]
        },
        {
            "id": "smoke-a-002",
            "prompt": "State the obviousness test of 35 U.S.C. § 103 and quote its core phrase.",
            "expected_phrases": ["obvious to a person having ordinary skill in the art", "Patentability shall not be negated"]
        }
    ]

    print("=" * 60)
    print("SALLYIP SMOKE TEST")
    print("=" * 60)
    print("Models: 4 | Cases: 3")
    print()

    results = {}
    total_cost = 0

    for model in candidates:
        print("\n--- Testing " + model + " ---")
        model_results = []
        model_cost = 0
        model_latency = []

        for case in smoke_cases:
            print("  " + case["id"] + ": ", end="", flush=True)
            resp = call_model(model, case["prompt"])
            grade = grade_response(case, resp)

            if resp["ok"]:
                cost = (resp["prompt_tokens"] * 0.000001 + resp["completion_tokens"] * 0.000004) / 1000000
                model_cost += cost
                model_latency.append(resp["latency_ms"])
                print("  OK (" + str(resp["latency_ms"]) + "ms, " + str(resp["total_tokens"]) + " tok)")
            else:
                print("  ERROR: " + resp["error"])

            model_results.append({
                "case": {"id": case["id"]},
                "response": resp,
                "grade": grade
            })

        results[model] = {
            "cases": model_results,
            "total_cost": model_cost,
            "avg_latency": sum(model_latency) / len(model_latency) if model_latency else 0,
            "total_latency": sum(model_latency)
        }
        total_cost += model_cost

    print("\n" + "=" * 60)
    print("SMOKE TEST SUMMARY")
    print("=" * 60)

    for model, data in results.items():
        passed = sum(1 for c in data["cases"] if c["grade"]["pass"])
        total = len(data["cases"])
        print("\n" + model + ":")
        print("  Passed: " + str(passed) + "/" + str(total))
        print("  Avg Latency: " + str(int(data["avg_latency"])) + "ms")
        print("  Total Cost: ${:.6f}".format(data["total_cost"]))
        for c in data["cases"]:
            status = "PASS" if c["grade"]["pass"] else "FAIL"
            print("  " + c["case"]["id"] + ": " + status + " - " + c["grade"]["reason"])

    print("\nTotal Estimated Cost: ${:.6f}".format(total_cost))
    total_cases = sum(len(data["cases"]) for data in results.values())
    print("Total cases: " + str(total_cases))

    avg_cost_per_case = total_cost / sum(len(data["cases"]) for data in results.values()) if sum(len(data["cases"]) for data in results.values()) > 0 and total_cost > 0 else 0
    pilot_cases = 40
    estimated_pilot_cost = (total_cost / sum(len(data["cases"]) for data in results.values())) * 40 * len(candidates) if sum(len(data["cases"]) for data in results.values()) > 0 and total_cost > 0 else 0
    print("\n--- PILOT COST ESTIMATE ---")
    print("Avg cost per case: ${:.6f}".format(avg_cost_per_case))
    print("Estimated 40-case pilot cost: ${:.4f}".format(estimated_pilot_cost))

import asyncio
asyncio.run(run_smoke_test())