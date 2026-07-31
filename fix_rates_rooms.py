import re

with open('src/pages/Rates.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the specific rooms modal section - match the exact content
old_marker = '      {/* Rooms Admin Modal */}'
idx = content.find(old_marker)
if idx < 0:
    print("ERROR: Could not find Rooms Admin Modal marker")
    exit(1)

# Find the next AdminModal closing
close_marker = '      </AdminModal>'
close_idx = content.find(close_marker, idx)
if close_idx < 0:
    print("ERROR: Could not find closing AdminModal")
    exit(1)

# The section to replace spans from marker to after the 4th </AdminModal> from there ... wait
# Actually just grab everything from the marker to the final </AdminModal> in the file
# The rooms modal is the LAST AdminModal in the file
last_close = content.rfind('      </AdminModal>')
rooms_section = content[idx:last_close + len(close_marker)]

new_section = '''      {/* Rooms Admin Modal */}
      <AdminModal
        title={editingRoomId ? 'Edit Room' : 'Manage Rooms'}
        open={adminModalOpen}
        onClose={closeAddRoom}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="rates-admin-modal-cancel" onClick={closeAddRoom} disabled={savingRoom}>
              Cancel
            </button>
            <button type="submit" className="rates-admin-modal-primary" form="rates-add-room-form" disabled={savingRoom}>
              {savingRoom ? 'Saving...' : editingRoomId ? 'Update Room' : 'Add Room'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Existing rooms list */}
          {displayedRooms.filter(r => r.dbId).length > 0 && (
            <div>
              <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>Existing Rooms</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {displayedRooms.filter(r => r.dbId).map((room) => (
                  <div key={room.dbId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid #e0e0e0', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {room.image && (
                        <img src={room.image} alt="" style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      )}
                      <div>
                        <strong style={{ fontSize: '0.9rem' }}>{room.name}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#888', marginLeft: '0.5rem' }}>{room.price} · {room.guests}</span>
                      </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="button" onClick={() => openEditRoom(room)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Edit size={14} />
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteRoom(room)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                ))}
              </div>
          )}

          <form id="rates-add-room-form" onSubmit={saveRoom} className="rates-admin-room-form">
            <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#666' }}>
              <Plus size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
              {editingRoomId ? 'Edit Room' : 'Add New Room'}
            </h4>
            <label className="rates-admin-field">
              <span>Room name</span>
              <input required value={roomDraft.name} onChange={(e) => setRoomDraft({ ...roomDraft, name: e.target.value })} placeholder="e.g. Garden Room" />
            </label>

            <label className="rates-admin-field">
              <span>Description</span>
              <textarea required rows={4} value={roomDraft.description} onChange={(e) => setRoomDraft({ ...roomDraft, description: e.target.value })} placeholder="Short description" />
            </label>

            <label className="rates-admin-field">
              <span>Features (one per line)</span>
              <textarea rows={5} value={roomDraft.featuresText} onChange={(e) => setRoomDraft({ ...roomDraft, featuresText: e.target.value })} placeholder="e.g. King bed\\nHot/Cold shower\\nBalcony access" />
            </label>

            <label className="rates-admin-field">
              <span>Price (per night)</span>
              <input required inputMode="numeric" placeholder="e.g. 5000" value={roomDraft.price} onChange={(e) => setRoomDraft({ ...roomDraft, price: e.target.value })} />
            </label>

            <label className="rates-admin-field">
              <span>Guests</span>
              <input required placeholder="e.g. 2-4 guests" value={roomDraft.guests} onChange={(e) => setRoomDraft({ ...roomDraft, guests: e.target.value })} />
            </label>

            <label className="rates-admin-field">
              <span>Main image</span>
              <input type="file" accept="image/*" required={!editingRoomId} onChange={(e) => setRoomDraftImage(e.target.files?.[0] || null)} />
            </label>
          </form>
        </div>
      </AdminModal>'''

new_content = content[:idx] + new_section + content[last_close + len(close_marker):]

with open('src/pages/Rates.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: Rates.tsx Rooms modal updated with existing rooms list + Edit/Delete buttons")
print(f"Replaced content from index {idx} to {last_close + len(close_marker)}")
