import fs from 'fs';

const p = 'e:/Resort/src/pages/Packages.tsx';
let c = fs.readFileSync(p, 'utf8');

// Fix 1: Close carousel-container div inside ImageCarousel
// Before:          </div>\n\n        {images.length > 1 && (
// After:           </div>\n        </div>\n\n        {images.length > 1 && (
c = c.replace(
  '          </div>\n\n        {images.length > 1 && (',
  '          </div>\n        </div>\n\n        {images.length > 1 && ('
);

// Fix 2: Close package-meta div before button, close package-content before </div>
// Before:
//                   <div className="package-pax"...>
// 
//                   <button className="package-button"...>
// 
//                 </div>
//             </div>
// After:
//                   <div className="package-pax"...>
//                   </div>
// 
//                   <button className="package-button"...>
// 
//                   </div>
//                 </div>
//               </div>
c = c.replace(
  '                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n\n                  <button className="package-button"',
  '                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                    </div>\n\n                  <button className="package-button"'
);

// Fix 3: Close package-content, package-card, and package-card-wrapper divs
// Before:
//                 </div>
//             </div>
//           ))}
//         </div>
// After:
//                   </div>
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
c = c.replace(
  '                </div>\n            </div>\n          ))}\n        </div>\n\n      <AdminModal',
  '                  </div>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n\n      <AdminModal'
);

fs.writeFileSync(p, c, 'utf8');
console.log('Fixes applied');
console.log('Has carousel-container close:', c.includes('          </div>\n        </div>\n\n        {images.length > 1'));
console.log('Has package-meta close:', c.includes('                    </div>\n\n                  <button'));
console.log('Has proper nesting:', c.includes('                  </div>\n                </div>\n              </div>\n            </div>'));
