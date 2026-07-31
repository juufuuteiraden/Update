import re

with open('src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The file is currently corrupted - we need the original content from the initial read
# Let me reconstruct it properly from scratch
# The simplest approach: rewrite the entire file

print("Reading file...")
lines = content.split('\n')
print(f"File has {len(lines)} lines")
