import os
path = os.path.join('src', 'pages', 'Packages.tsx')
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Restore the broken section after image-overlay
old_broken_section = '<\n    <section id="packages"'
new_fixed_section = '      </div>\n      </div>\n    );\n  };\n\n  return (\n    <section id="packages"'
c = c.replace(old_broken_section, new_fixed_section)

# Fix 2: Close package-meta div before the button (move</div> before <button)
old_nested = '<div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  <button className="package-button" onClick={onAskAboutThis}>'
new_nested = '<div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  </div>\n                  <button className="package-button" onClick={onAskAboutThis}>'
c = c.replace(old_nested, new_nested)

# Fix 3: Close remaining open divs  
c = c.replace(
    '                  </button>\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal',
    '                  </button>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)

div_open = c.count('<div') - c.count('<div ') - c.count('<div>') - c.count('<div')  
# simpler
import re
opens = len(re.findall(r'<div[>\s]', c))
closes = len(re.findall(r'</div>', c))
print(f'div: {opens} open, {closes} close', 'OK' if opens == closes else 'MISMATCH')

opens = len(re.findall(r'<section[>\s]', c))
closes = len(re.findall(r'</section>', c))
print(f'section: {opens} open, {closes} close', 'OK' if opens == closes else 'MISMATCH')
opens = len(re.findall(r'<button[>\s]', c))
closes = len(re.findall(r'</button>', c))
print(f'button: {opens} open, {closes} close', 'OK' if opens == closes else 'MISMATCH')
