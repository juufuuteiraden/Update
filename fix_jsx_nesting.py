import re

with open('src/pages/Packages.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Fix 1: Close carousel-container div
c = c.replace(
    '\n          <div className="image-overlay" />\n        </div>\n    );',
    '\n          <div className="image-overlay" />\n        </div>\n      </div>\n    );'
)

# Fix 2: Close package-meta div before button, not after
c = c.replace(
    '<div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  <button className="package-button"',
    '<div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  </div>\n                  <button className="package-button"'
)

# Fix 3: Close package-content, package-card, package-card-wrapper, and package-container
c = c.replace(
    '\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal',
    '\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal'
)

with open('src/pages/Packages.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

div_open = c.count('<div')
div_close = c.count('</div')
section_open = c.count('<section')
section_close = c.count('</section')
button_open = c.count('<button')
button_close = c.count('</button')

print(f'divs: {div_open} open, {div_close} close')
print(f'sections: {section_open} open, {section_close} close')
print(f'buttons: {button_open} open, {button_close} close')
