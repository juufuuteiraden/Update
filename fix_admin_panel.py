# Fix the AdminPanel.tsx JSX nesting issue
with open('src/pages/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The issue: missing closing `}` for the async function in onClick handler
# The pattern: `} finally { setLoading(false) }` followed by `}}>` instead of `}}}>`
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
    print('Pattern not found. Checking alternatives...')
    # Check what's around line 485-495
    lines = content.split('\n')
    for i, line in enumerate(lines[480:500], start=481):
        print(f'{i}: {repr(line)}')

