import pathlib

p = pathlib.Path('src/pages/Packages.tsx')
c = p.read_text(encoding='utf-8')

# Fix 1: carousel missing )} and closing divs
old1 = "              </div>\n            </>\n\n    )"
new1 = "              </div>\n            </>\n          )}\n          <div className=\"image-overlay\" />\n        </div>\n      </div>\n    )"
c = c.replace(old1, new1)

# Fix 2: package-meta structure - add pax div, close meta, create button tag
old2 = "                    <div className=\"package-price\">\n                      <span className=\"price-label\">Package Rate</span>\n                      <span className=\"price-amount\" data-sanity=\"packageItem.price\">{pkg.price}</span>\n                    </div>\n\n                    <span>Ask About This</span>\n                    <svg className=\"button-icon\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 12H19M19 12L12 5M19 12L12 19\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/></svg>\n                  </button>"
new2 = "                    <div className=\"package-price\">\n                      <span className=\"price-label\">Package Rate</span>\n                      <span className=\"price-amount\" data-sanity=\"packageItem.price\">{pkg.price}</span>\n                    </div>\n                    <div className=\"package-pax\" data-sanity=\"packageItem.pax\">{pkg.pax}</div>\n                  </div>\n                  <button className=\"package-button\" onClick={onAskAboutThis}>\n                    <span>Ask About This</span>\n                    <svg className=\"button-icon\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M5 12H19M19 12L12 5M19 12L12 19\" stroke=\"currentColor\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\"/></svg>\n                  </button>"
c = c.replace(old2, new2)

# Fix 3: close package-content, package-card, package-card-wrapper before AdminModal
old3 = "                  </button>\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal"
new3 = "                  </button>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal"
c = c.replace(old3, new3)

p.write_text(c, encoding='utf-8')

# Validate
import re
for tag in ['div', 'button', 'section']:
    opens = len(re.findall(f'<{tag}[>\s]', c))
    closes = len(re.findall(f'</{tag}>', c))
    print(f'{tag}: {opens} open / {closes} close - {"OK" if opens == closes else "MISMATCH"}')

print(f'File size: {len(c)}')
