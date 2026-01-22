#!/usr/bin/env python3
"""
Patch whisperx/vad.py to download VAD model from HuggingFace instead of broken S3 URL.
The original whisperx S3 URL (whisperx.s3.eu-west-2.amazonaws.com) returns 301/403 errors.
Solution: Use pyannote/segmentation-3.0 from HuggingFace Hub instead.
"""
import os
import site

def patch_vad():
    # Find the whisperx installation
    site_packages = site.getsitepackages()

    vad_path = None
    for sp in site_packages:
        potential_path = os.path.join(sp, 'whisperx', 'vad.py')
        if os.path.exists(potential_path):
            vad_path = potential_path
            break

    if not vad_path:
        # Try user site packages
        user_site = site.getusersitepackages()
        potential_path = os.path.join(user_site, 'whisperx', 'vad.py')
        if os.path.exists(potential_path):
            vad_path = potential_path

    if not vad_path:
        print("WARNING: Could not find whisperx/vad.py to patch")
        return False

    with open(vad_path, 'r') as f:
        content = f.read()

    # Check if already patched
    if 'pyannote/segmentation-3.0' in content:
        print(f"vad.py already patched at {vad_path}")
        return True

    modified = False

    # Replace the urllib/requests download with HuggingFace download
    # Handle both original urllib and requests-patched versions

    # Pattern 1: Original urllib version
    old_urllib = '''    if not os.path.isfile(model_fp):
        with urllib.request.urlopen(VAD_SEGMENTATION_URL) as source, open(model_fp, "wb") as output:
            with tqdm(
                total=int(source.info().get("Content-Length")),
                ncols=80,
                unit="iB",
                unit_scale=True,
                unit_divisor=1024,
            ) as loop:
                while True:
                    buffer = source.read(8192)
                    if not buffer:
                        break

                    output.write(buffer)
                    loop.update(len(buffer))'''

    # Pattern 2: requests-patched version
    old_requests = '''    if not os.path.isfile(model_fp):
        # Use requests library which handles 301 redirects properly
        response = requests.get(VAD_SEGMENTATION_URL, stream=True, allow_redirects=True)
        response.raise_for_status()
        total_size = int(response.headers.get("Content-Length", 0))
        with open(model_fp, "wb") as output:
            with tqdm(
                total=total_size,
                ncols=80,
                unit="iB",
                unit_scale=True,
                unit_divisor=1024,
            ) as loop:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        output.write(chunk)
                        loop.update(len(chunk))'''

    new_download = '''    if not os.path.isfile(model_fp):
        # Download from HuggingFace instead of broken S3 URL
        # The whisperx S3 bucket (whisperx.s3.eu-west-2.amazonaws.com) returns 301/403 errors
        from huggingface_hub import hf_hub_download
        import shutil
        print('Downloading VAD model from HuggingFace (pyannote/segmentation-3.0)...')
        downloaded = hf_hub_download(
            repo_id="pyannote/segmentation-3.0",
            filename="pytorch_model.bin",
            token=use_auth_token
        )
        shutil.copy(downloaded, model_fp)
        print(f'VAD model saved to {model_fp}')'''

    if old_urllib in content:
        content = content.replace(old_urllib, new_download)
        modified = True
    elif old_requests in content:
        content = content.replace(old_requests, new_download)
        modified = True

    # Remove SHA256 checksum validation since pyannote model has different hash
    old_check = '''    model_bytes = open(model_fp, "rb").read()
    if hashlib.sha256(model_bytes).hexdigest() != VAD_SEGMENTATION_URL.split('/')[-2]:
        raise RuntimeError(
            "Model has been downloaded but the SHA256 checksum does not not match. Please retry loading the model."
        )'''

    new_check = '''    # Skip SHA256 check - we use pyannote/segmentation-3.0 from HuggingFace which has different hash
    # The model is verified by HuggingFace's integrity checks during download'''

    if old_check in content:
        content = content.replace(old_check, new_check)
        modified = True

    if modified:
        with open(vad_path, 'w') as f:
            f.write(content)
        print(f"Successfully patched vad.py at {vad_path}")
        print("  - Changed download source from S3 to HuggingFace (pyannote/segmentation-3.0)")
        print("  - Removed SHA256 checksum validation")
        return True
    else:
        print(f"WARNING: Could not find expected code patterns in {vad_path}")
        return False

if __name__ == '__main__':
    patch_vad()
