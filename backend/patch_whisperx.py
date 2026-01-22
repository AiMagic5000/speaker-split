#!/usr/bin/env python3
"""Patch whisperx asr.py to add missing TranscriptionOptions parameters"""

import os
import sys

asr_path = '/usr/local/lib/python3.11/site-packages/whisperx/asr.py'

if not os.path.exists(asr_path):
    print(f"ERROR: {asr_path} not found")
    sys.exit(1)

with open(asr_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if already patched (check for multilingual which is the last added param)
if '"multilingual"' in content and 'default_asr_options' in content:
    # Verify it's in the right place
    import re
    if re.search(r'default_asr_options.*"multilingual"', content, re.DOTALL):
        print('whisperx/asr.py already patched')
        sys.exit(0)

# New parameters to add - must include ALL missing params including multilingual
new_params = ''',
        "multilingual": False,
        "repetition_penalty": 1.0,
        "no_repeat_ngram_size": 0,
        "prompt_reset_on_temperature": 0.5,
        "max_new_tokens": None,
        "clip_timestamps": None,
        "hallucination_silence_threshold": None,
        "hotwords": None'''

# Strategy: Find 'append_punctuations' in default_asr_options and insert after it
# The dict looks like:
#   default_asr_options =  {
#       ...
#       "append_punctuations": "..."
#   }
#
# We need to find the line with append_punctuations and add params before the }

lines = content.split('\n')
modified = False

for i, line in enumerate(lines):
    # Find the line with append_punctuations
    if '"append_punctuations"' in line and not modified:
        # Check if this line ends the dict (has both the value and potentially nothing else before })
        # Look at next lines to find the closing brace
        for j in range(i + 1, min(i + 5, len(lines))):
            if lines[j].strip() == '}':
                # Found the closing brace - insert new params before it
                # Modify the append_punctuations line to remove any trailing comma if needed
                # and add our new parameters

                # Ensure append_punctuations line ends with comma
                if not lines[i].rstrip().endswith(','):
                    lines[i] = lines[i].rstrip() + ','

                # Insert new parameters between append_punctuations and closing brace
                lines.insert(j, new_params.lstrip(',').lstrip('\n'))
                modified = True
                break

        if modified:
            break

if modified:
    new_content = '\n'.join(lines)
    with open(asr_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully patched whisperx/asr.py - added 8 missing TranscriptionOptions parameters (including multilingual)')
    sys.exit(0)

# Fallback: Direct replacement on the entire dict structure
print('Line-by-line approach failed, trying string replacement...')

# Find the default_asr_options dictionary and insert params before closing brace
import re

# Match from "append_punctuations" to the closing }
# The content shows format like:
# "append_punctuations": "\"'.。,，!！?？:：\")]}、"
#     }
pattern = r'("append_punctuations":\s*"[^"]*")\s*\n(\s*\})'

def insert_params(match):
    append_line = match.group(1)
    closing = match.group(2)
    return append_line + ',' + new_params + '\n' + closing

new_content, count = re.subn(pattern, insert_params, content, flags=re.MULTILINE)

if count > 0:
    with open(asr_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Successfully patched whisperx/asr.py using regex replacement')
    sys.exit(0)

# Last resort: Simple string insertion
print('Regex approach failed, trying simple string insertion...')

# Find the position of the closing brace after default_asr_options
start = content.find('default_asr_options')
if start == -1:
    print('ERROR: Could not find default_asr_options in asr.py')
    sys.exit(1)

# Find "append_punctuations" after start
append_pos = content.find('"append_punctuations"', start)
if append_pos == -1:
    print('ERROR: Could not find append_punctuations in default_asr_options')
    sys.exit(1)

# Find the closing } after append_punctuations
close_brace = content.find('\n', append_pos)
while close_brace != -1:
    # Look at lines after append_punctuations to find }
    next_newline = content.find('\n', close_brace + 1)
    line_content = content[close_brace + 1:next_newline].strip() if next_newline != -1 else content[close_brace + 1:].strip()

    if line_content == '}':
        # Found it! Insert new parameters here
        # Get the line with append_punctuations
        append_line_end = content.find('\n', append_pos)
        current_append_line = content[append_pos:append_line_end]

        # Build the new content
        # Add comma if needed and then new params
        if not current_append_line.rstrip().endswith(','):
            content = content[:append_line_end] + ',' + content[append_line_end:]
            close_brace += 1  # Adjust for inserted comma

        # Insert new params before closing brace
        insert_text = new_params + '\n        '
        new_content = content[:close_brace + 1] + insert_text + content[close_brace + 1:]

        with open(asr_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Successfully patched whisperx/asr.py using string insertion')
        sys.exit(0)

    close_brace = next_newline

print('ERROR: Could not find closing brace of default_asr_options dict')
sys.exit(1)
