import fs from 'fs';
const path = 'e:/Resort/src/pages/Packages.tsx';
let c = fs.readFileSync(path, 'utf8');

// Fix 1: Close carousel-container div properly
c = c.replace(
  '            ))}\n          </div>\n        {images.length > 1 && (',
  '            ))}\n          </div>\n        </div>\n        {images.length > 1 && ('
);

// Fix 2: Close package-meta div before button
c = c.replace(
  '                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  <button className="package-button" onClick={onAskAboutThis}>',
  '                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  </div>\n                  <button className="package-button" onClick={onAskAboutThis}>'
);

// Fix 3: Close package-content, package-card, package-card-wrapper, packages-grid, packages-container
c = c.replace(
  '                    </svg>\n                  </button>\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal',
  '                    </svg>\n                  </button>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal'
);

// Fix 4: Close packages-container div (the one opened before packages-grid)
c = c.replace(
  '        </div>\n      </div>\n      <AdminModal',
  '        </div>\n      </div>\n      <AdminModal'
);

fs.writeFileSync(path, c, 'utf8');
console.log('Packages.tsx fixed successfully');
