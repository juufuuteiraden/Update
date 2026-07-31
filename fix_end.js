var fs = require('fs');
var c = fs.readFileSync('src/pages/Packages.tsx', 'utf8');

// The file has carousel-container missing close AND package-meta nesting issue
// Let's rebuild the affected area precisely
var target = '                  <div className="package-meta">\n                    <div className="package-price">\n                      <span className="price-label">Package Rate</span>\n                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>\n                    </div>\n\n                    <span>Ask About This</span>';

var replacement = '                  <div className="package-meta">\n                    <div className="package-price">\n                      <span className="price-label">Package Rate</span>\n                      <span className="price-amount" data-sanity="packageItem.price">{pkg.price}</span>\n                    </div>\n                    <div className="package-pax" data-sanity="packageItem.pax">{pkg.pax}</div>\n                  </div>\n                  <button className="package-button" onClick={onAskAboutThis}>\n                    <span>Ask About This</span>';

c = c.replace(target, replacement);

// Fix the missing package-content close and package-card close before AdminModal
c = c.replace(
  '                  </button>\n                </div>\n            </div>\n          ))}\n        </div>\n      <AdminModal',
  '                  </button>\n                </div>\n              </div>\n            </div>\n          ))}\n        </div>\n      </div>\n      <AdminModal'
);

// Fix carousel: missing div close for carousel-container
c = c.replace(
  '          {images.length > 1 && (\n            <>\n              <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous image">\n                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n              </button>\n              <button className="carousel-btn next" onClick={nextSlide} aria-label="Next image">\n                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n              </button>\n              <div className="carousel-dots">\n                {images.map((_, idx) => (\n                  <button key={idx} className={`dot ${idx === currentIndex ? 'active' : " + '"' + "} onClick={(e) => goToSlide(idx, e)} aria-label={`Go to image ${idx + 1}`} />\n                ))}\n              </div>\n            </>\n          )}\n</div>',
  '          {images.length > 1 && (\n            <>\n              <button className="carousel-btn prev" onClick={prevSlide} aria-label="Previous image">\n                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n              </button>\n              <button className="carousel-btn next" onClick={nextSlide} aria-label="Next image">\n                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>\n              </button>\n              <div className="carousel-dots">\n                {images.map((_, idx) => (\n                  <button key={idx} className={`dot ${idx === currentIndex ? 'active' : " + '"' + "} onClick={(e) => goToSlide(idx, e)} aria-label={`Go to image ${idx + 1}`} />\n                ))}\n              </div>\n            </>\n          )}\n          <div className="image-overlay" />\n        </div>\n      </div>'
);

fs.writeFileSync('src/pages/Packages.tsx', c, 'utf8');
console.log('Done');
</create_file>
