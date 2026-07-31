with open('src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern: missing closing brace for async function body
# Current: "} finally { setLoading(false) } \n                      }}>"
# Needed:  "} finally { setLoading(false) } \n                        }}>"

# One more closing brace needed
old = '''                          } finally {
                            setLoading(false)
                          }
                      }}>
                      Save'''

new = '''                          } finally {
                            setLoading(false)
                          }
                        }}
                      >
                      Save'''

if old in content:
    content = content.replace(old, new)
    with open('src/pages/AdminPanel.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully!')
else:
    print('Pattern not found exactly.')
    # Debug: show lines around the area
    lines = content.split('\n')
    for i in range(480, min(len(lines), 510)):
        print(f'{i+1}: {repr(lines[i])}')

