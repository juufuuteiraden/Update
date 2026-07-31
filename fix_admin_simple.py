import pathlib
path = pathlib.Path('e:/Resort/src/pages/AdminPanel.tsx')
content = path.read_text(encoding='utf-8', errors='replace')

old_end = """            <textarea rows={2} placeholder="Description" value={walkInForm.description} onChange={(e) => setWalkInForm({ ...walkInForm, description: e.target.value })} style={{ marginTop: '0.75rem' }} />

              <button type="submit" disabled={loading}>Cancel</button>
      </div>
    </section>
    </div>
  )
  }"""

new_end = """            <textarea rows={2} placeholder="Description" value={walkInForm.description} onChange={(e) => setWalkInForm({ ...walkInForm, description: e.target.value })} style={{ marginTop: '0.75rem' }} />
            <textarea rows={4} placeholder="Price rows (format: Label - Price - Note) - one per line" value={walkInForm.price_rows} onChange={(e) => setWalkInForm({ ...walkInForm, price_rows: e.target.value })} style={{ marginTop: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" disabled={loading}>{walkInId ? 'Update Rate' : 'Add Rate'}</button>
              {walkInId && (
                <button type="button" onClick={() => { setWalkInForm(emptyWalkInRate); setWalkInId(null) }} disabled={loading}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-list">
            {walkInRates.map((rate) => (
              <article key={rate.id}>
                <strong>{rate.name}</strong>
                <span>{rate.guests}{rate.badge ? ' - ' + rate.badge : ''}</span>
                <p>{rate.description}</p>
                <div>
                  <button onClick={() => {
                    setWalkInId(rate.id)
                    const rowsText = (rate.price_rows || []).map((r) => r.label + ' - ' + r.price + (r.note ? ' - ' + r.note : '')).join('\n')
                    setWalkInForm({ name: rate.name, description: rate.description || '', guests: rate.guests || '', badge: rate.badge || '', price_rows: rowsText })
                  }}>Edit</button>
                  <button onClick={() => deleteRow('walk_in_rate', rate.id)}>Delete</button>
                </div>
              </article>
            ))}
            {walkInRates.length === 0 && <p style={{ color: 'rgba(255,253,247,0.4)', textAlign: 'center', padding: '1rem' }}>No walk-in rates yet.</p>}
          </div>
        </section>

        {/* Amenities Section */}
        <section>
          <h3 style={{ color: '#ff8360', marginBottom: '0.5rem' }}>Amenities</h3>
          <p style={{ color: 'rgba(255,253,247,0.6)', marginBottom: '1rem', fontSize: '0.85rem' }}>
            Manage the amenities shown on the homepage amenities section.
          </p>

          <form className="admin-form" onSubmit={saveAmenity} style={{ marginBottom: '1.5rem', padding: '1.25rem', background: 'rgba(255,253,247,0.045)', border: '1px solid rgba(255,253,247,0.1)', borderRadius: '8px' }}>
            <h4 style={{ color: '#fffdf7', marginBottom: '1rem', fontSize: '0.9rem' }}>{amenityId ? 'Edit Amenity' : 'Add Amenity'}</h4>
            <input required placeholder="Amenity name" value={amenityForm.name} onChange={(e) => setAmenityForm({ ...amenityForm, name: e.target.value })} />
            <textarea rows={2} placeholder="Description" value={amenityForm.description} onChange={(e) => setAmenityForm({ ...amenityForm, description: e.target.value })} style={{ marginTop: '0.75rem' }} />
            <input type="file" accept="image/*" required={!amenityId} onChange={(e) => setAmenityImage(e.target.files?.[0] || null)} style={{ marginTop: '0.75rem' }} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button type="submit" disabled={loading}>{amenityId ? 'Update Amenity' : 'Add Amenity'}</button>
              {amenityId && (
                <button type="button" onClick={() => { setAmenityForm(emptyAmenity); setAmenityId(null); setAmenityImage(null) }} disabled={loading}>
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="admin-gallery-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {amenities.map((amenity) => (
              <div key={amenity.id} style={{ background: 'rgba(255,253,247,0.07)', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,253,247,0.1)' }}>
                {amenity.image_url && <img src={amenity.image_url} alt={amenity.name} style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />}
                <div style={{ padding: '0.75rem' }}>
                  <strong style={{ display: 'block', fontSize: '0.85rem', color: '#fffdf7' }}>{amenity.name}</strong>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,253,247,0.55)', margin: '0.25rem 0' }}>{amenity.description}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button onClick={() => {
                      setAmenityId(amenity.id)
                      setAmenityForm({ name: amenity.name, description: amenity.description || '', image_url: amenity.image_url || '' })
                      setAmenityImage(null)
                    }} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>Edit</button>
                    <button onClick={() => deleteRow('amenities', amenity.id)} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255,253,247,0.12)', color: '#fffdf7' }}>Delete</button>
                  </div>
              </div>
            ))}
            {amenities.length === 0 && <p style={{ color: 'rgba(255,253,247,0.4)', gridColumn: '1 / -1', textAlign: 'center', padding: '2rem' }}>No amenities yet.</p>}
          </div>
        </section>
      </div>
    )
  }"""

if old_end in content:
    content = content.replace(old_end, new_end)
    path.write_text(content, encoding='utf-8')
    print('SUCCESS: File fixed')
else:
    print('ERROR: old_end not found in file')
    print(f'File ends with: ... {content[-200:]}')
