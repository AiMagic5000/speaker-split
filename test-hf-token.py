#!/usr/bin/env python3
"""
Quick test script to verify HuggingFace token and model access.
Run with: python test-hf-token.py
"""

import os
import sys

# Load token from .env file
def load_env():
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value

load_env()

HF_TOKEN = os.environ.get('HF_TOKEN', '')

print("=" * 60)
print("HuggingFace Token Test")
print("=" * 60)

if not HF_TOKEN:
    print("ERROR: HF_TOKEN not found in .env file")
    sys.exit(1)

print(f"Token: {HF_TOKEN[:10]}...{HF_TOKEN[-4:]}")
print(f"Length: {len(HF_TOKEN)} characters")
print()

# Test API access
try:
    import requests
except ImportError:
    print("Installing requests...")
    os.system(f"{sys.executable} -m pip install requests -q")
    import requests

print("Testing HuggingFace API access...")
print()

# Test 1: whoami (may not work with fine-grained tokens)
print("1. Testing /api/whoami...")
resp = requests.get(
    "https://huggingface.co/api/whoami",
    headers={"Authorization": f"Bearer {HF_TOKEN}"},
    timeout=10
)
if resp.status_code == 200:
    user = resp.json().get('name', 'Unknown')
    print(f"   OK - Logged in as: {user}")
else:
    print(f"   SKIP - whoami returned {resp.status_code} (normal for fine-grained tokens)")

# Test 2: pyannote/speaker-diarization-3.1 access
print("2. Testing pyannote/speaker-diarization-3.1 access...")
resp = requests.get(
    "https://huggingface.co/api/models/pyannote/speaker-diarization-3.1",
    headers={"Authorization": f"Bearer {HF_TOKEN}"},
    timeout=10
)
if resp.status_code == 200:
    print("   OK - Model accessible")
elif resp.status_code == 403:
    print("   ERROR - Access denied. Accept agreement at:")
    print("   https://huggingface.co/pyannote/speaker-diarization-3.1")
    sys.exit(1)
else:
    print(f"   ERROR - Status {resp.status_code}: {resp.text[:100]}")
    sys.exit(1)

# Test 3: pyannote/segmentation-3.0 access
print("3. Testing pyannote/segmentation-3.0 access...")
resp = requests.get(
    "https://huggingface.co/api/models/pyannote/segmentation-3.0",
    headers={"Authorization": f"Bearer {HF_TOKEN}"},
    timeout=10
)
if resp.status_code == 200:
    print("   OK - Model accessible")
elif resp.status_code == 403:
    print("   ERROR - Access denied. Accept agreement at:")
    print("   https://huggingface.co/pyannote/segmentation-3.0")
    sys.exit(1)
else:
    print(f"   ERROR - Status {resp.status_code}: {resp.text[:100]}")
    sys.exit(1)

print()
print("=" * 60)
print("ALL TESTS PASSED - HuggingFace token is valid!")
print("=" * 60)
print()
print("You can now run the speaker-split-app.")
print("Local: docker compose up --build")
print("URLs:")
print("  Frontend: http://localhost:3100")
print("  Backend:  http://localhost:8100/health")
