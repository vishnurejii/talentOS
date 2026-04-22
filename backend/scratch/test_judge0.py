import requests
import json
import base64

def test_judge0():
    url = "https://ce.judge0.com/submissions?wait=true"
    # Basic print python code
    payload = {
        "source_code": "print('hello')",
        "language_id": 71, # Python 3
        "stdin": "",
        "expected_output": "hello\n" # Judge0 usually appends a newline to output
    }
    
    try:
        print(f"Testing Judge0 at {url}...")
        resp = requests.post(url, json=payload, timeout=15)
        print(f"Status Code: {resp.status_code}")
        data = resp.json()
        print(f"Response Status: {data.get('status', {}).get('description')}")
        print(f"Stdout: {data.get('stdout')}")
        print(f"Stderr: {data.get('stderr')}")
        print(f"Compile Output: {data.get('compile_output')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_judge0()
