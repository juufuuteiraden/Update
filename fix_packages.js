const fs = require('fs');
const content = fs.readFileSync('src/pages/Packages.tsx', 'utf8');

// Step 1: Fix the carousel - close both carousel-container and package-carousel divs
let c = content;

// Fix 1: Add missing closing divs for carousel
c = c.replace(
  '              </div>\n            </>\n)}\n          <div className="image-overlay" />\n        </div>',
  '              </div>\n            </>\n          )}\n          <div className="image-overlay" />\n        </div>\n      </div>'
);

// Fix 2: Restore the package-meta structure that lost its button opening + div closing  
c = c.replace(
  '                  <div className="package-meta">\n                    <div className="package-price">\n                      <span className="price-label">Package Rate</span>\n                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>\n                    </div>\n\n                    <span>Ask About This</span>\n                    <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n                  </button>\n                </div>',
  '                  <div className="package-meta">\n                    <div className="package-price">\n                      <span className="price-label">Package Rate</span>\n                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>\n                    </div>\n                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  </div>\n                  <button className="package-button" onClick={onAskAboutThis}>\n                    <span>Ask About This</span>\n                    <svg className="button-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n                  </button>\n                </div>'
);

// Fix 3: Close package-content, package-card, package-card-wrapper before AdminModal
c = c.replace(
  '                  </button>\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal',
  '                  </button>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal'
);

fs.writeFileSync('src/pages/Packages.tsx', c, 'utf8');
console.log('Fixes applied. File size:', c.length);

// Validate tag counts
const opens = (c.match(/<div[>\s]/g) || []).length;
const closes = (c.match(/<\/div>/g) || []).length;
console.log('div opens:', opens, 'closes:', closes, opens === closes ? 'OK' : 'MISMATCH');

const bopens = (c.match(/<button[>\s]/g) || []).length;
const bcloses = (c.match(/<\/button>/g) || []).length;
console.log('button opens:', bopens, 'closes:', bcloses, bopens === bcloses ? 'OK' : 'MISMATCH');

const sOpen = (c.match(/<section[>\s]/g) || []).length;
const sCloses = (c.match(/<\/section>/g) || []).length;
console.log('section opens:', sOpen, 'closes:', sCloses, sOpen === sCloses ? 'OK' : 'MISMATCH');
