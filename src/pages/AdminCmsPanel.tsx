import { useEffect, useMemo, useState } from 'react'
import { client } from '../sanityClient'
import './AdminCmsPanel.css'



type SanityDocType =
  | 'siteSettings'
  | 'heroSection'
  | 'ratesSection'
  | 'walkInRate'
  | 'room'
  | 'amenitiesSection'
  | 'amenity'
  | 'packagesSection'
  | 'packageItem'
  | 'reviewsSection'
  | 'review'
  | 'contactSection'
  | 'locationSection'

const ADMIN_TYPES: SanityDocType[] = [
  'siteSettings',
  'heroSection',
  'ratesSection',
  'walkInRate',
  'room',
  'amenitiesSection',
  'amenity',
  'packagesSection',
  'packageItem',
  'reviewsSection',
  'review',
  'contactSection',
  'locationSection',
]

type AnyDoc = Record<string, any>

type DocRow = {
  _id: string
  _type: SanityDocType
  [k: string]: any
}

const prettyJson = (value: any) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// (unused) left intentionally out to keep the panel compiling


export default function AdminCmsPanel() {
  const [activeType, setActiveType] = useState<SanityDocType>('ratesSection')
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [rows, setRows] = useState<DocRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // For simple editor: we edit the raw document fields as JSON key/values.
  // This avoids having to hardcode every schema field.
  const [draftJson, setDraftJson] = useState('')

  const canHaveMany = useMemo(() => {
    // singleton documents in this project are the ones picked via [0]
    return (
      activeType === 'walkInRate' ||
      activeType === 'room' ||
      activeType === 'amenity' ||
      activeType === 'packageItem' ||
      activeType === 'review'
    )
  }, [activeType])

  const load = async (type: SanityDocType) => {
    setLoading(true)
    setError('')
    try {
      const queryMany = `*[_type == $type] | order(_createdAt asc){..., _id, _type}`
      const querySingle = `*[_type == $type][0]{..., _id, _type}`

      const q = canHaveMany ? queryMany : querySingle

      const data = await client.fetch<DocRow[] | DocRow | null>(q, { type })
      let nextRows: DocRow[] = []

      if (!data) {
        nextRows = []
      } else if (Array.isArray(data)) {
        nextRows = data
      } else {
        nextRows = [data]
      }

      // Some fields (like images) are returned as image objects; keep them as-is for editing.
      setRows(nextRows)
      const idToSelect = nextRows[0]?._id || null
      setSelectedId(idToSelect)

      const first = idToSelect ? nextRows.find((r) => r._id === idToSelect) : null
      if (first) {
        const { _id, _type, ...rest } = first
        setDraftJson(prettyJson(rest))
      } else {
        setDraftJson('')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load content')
      setRows([])
      setSelectedId(null)
      setDraftJson('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(activeType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType])

  const selectedRow = useMemo(() => {
    return selectedId ? rows.find((r) => r._id === selectedId) || null : null
  }, [rows, selectedId])

  useEffect(() => {
    if (!selectedRow) return
    const { _id, _type, ...rest } = selectedRow
    setDraftJson(prettyJson(rest))
  }, [selectedRow])

  const saveSelected = async () => {
    if (!selectedRow) return

    setSavingId(selectedRow._id)
    setError('')

    try {
      // NOTE: This app currently only uses Sanity for READ via `client.fetch`.
      // Writing requires a Sanity write client/token setup, which is not present in this repo.
      // So for now, we block saving and instruct admin to use the Sanity Studio.
      setError('Sanity write is not configured in this repo. Use Sanity Studio to edit content (writes require token/auth).')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSavingId(null)
    }

  }

  return (
    <div className="admin-cms-shell">
      <header className="admin-cms-header">
        <h1>Admin CMS Panel</h1>
        <p>Edit all Sanity content (walk-in rates, rooms, add-ons/inclusions, pricing, etc.).</p>
      </header>

      <div className="admin-cms-grid">
        <aside className="admin-cms-sidebar">
          <div className="admin-cms-sidebar__section">
            <h2>Content Type</h2>
            <select
              value={activeType}
              onChange={(e) => setActiveType(e.target.value as SanityDocType)}
              disabled={loading}
            >
              {ADMIN_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-cms-sidebar__section">
            <h2>Documents</h2>
            <div className="admin-cms-doc-list">
              {rows.map((row) => (
                <button
                  key={row._id}
                  className={row._id === selectedId ? 'active' : ''}
                  onClick={() => setSelectedId(row._id)}
                  disabled={loading}
                  type="button"
                >
                  <div className="admin-cms-doc-list__title">
                    {String((row as AnyDoc).name || (row as AnyDoc).title || row._id).slice(0, 48)}
                  </div>
                  <div className="admin-cms-doc-list__meta">{row._type}</div>
                </button>
              ))}

              {!loading && rows.length === 0 && <div className="admin-cms-empty">No documents found.</div>}
            </div>
          </div>
        </aside>

        <main className="admin-cms-main">
          {loading ? (
            <div className="admin-cms-loading">Loading…</div>
          ) : (
            <>
              {error && <div className="admin-cms-error">{error}</div>}

              <div className="admin-cms-toolbar">
                <div className="admin-cms-toolbar__left">
                  <span className="admin-cms-chip">Type: {activeType}</span>
                  {selectedId && <span className="admin-cms-chip admin-cms-chip--muted">ID: {selectedId}</span>}
                </div>
                <div className="admin-cms-toolbar__right">
                  <button
                    type="button"
                    className="admin-cms-save"
                    onClick={saveSelected}
                    disabled={!selectedRow || savingId !== null}
                  >
                    {savingId ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              <label className="admin-cms-editor-label">
                <span>Edit document fields as JSON</span>
                <textarea
                  className="admin-cms-editor"
                  value={draftJson}
                  onChange={(e) => setDraftJson(e.target.value)}
                  spellCheck={false}
                />
              </label>

              <div className="admin-cms-help">
                <h3>How to edit</h3>
                <ul>
                  <li>For simple string/number fields, edit values normally.</li>
                  <li>
                    For arrays/objects, paste valid JSON (example shown in Sanity docs).
                  </li>




                  <li>Image fields should keep their original structure as returned by Sanity.</li>
                </ul>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}

