import { useRef, useState } from 'react'
import { loadWorkbookFromFile } from '../lib/excel'
import { SheetIcon, AlertIcon } from './Icons'

export default function FileSelector({ onFileLoaded }) {
  const inputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setLoading(true)
    try {
      const loaded = await loadWorkbookFromFile(file)
      onFileLoaded(loaded)
    } catch (err) {
      console.error(err)
      setError('Could not read that file. Make sure it is a valid .xlsx or .xls file.')
    } finally {
      setLoading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card">
      <div className="empty-state">
        <div className="dropzone-icon" style={{ margin: '0 auto', width: 56, height: 56 }}>
          <SheetIcon style={{ width: 26, height: 26, color: 'var(--blue)' }} />
        </div>
        <h1>Connect your Excel file</h1>
        <p>Pick the .xlsx file on your phone you want new contacts saved into. New cards get appended as rows — your existing data stays put.</p>
      </div>

      <button className="btn btn-primary" onClick={() => inputRef.current?.click()} disabled={loading}>
        <SheetIcon style={{ width: 16, height: 16 }} />
        {loading ? 'Reading file…' : 'Select Excel file'}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden-input"
        onChange={handleChange}
      />

      {error && (
        <div className="alert error" style={{ marginTop: 12 }}>
          <AlertIcon style={{ width: 16, height: 16, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      <div className="alert" style={{ marginTop: 12 }}>
        <AlertIcon style={{ width: 16, height: 16, marginTop: 1 }} />
        <span>On iPhone, each save creates an updated download since Safari can't overwrite files in place — re-select it next time to keep appending.</span>
      </div>
    </div>
  )
}
