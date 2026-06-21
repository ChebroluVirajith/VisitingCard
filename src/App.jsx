import { useEffect, useState } from 'react'
import FileSelector from './components/FileSelector'
import ScanCard from './components/ScanCard'
import { SheetIcon, SwapIcon, CheckCircleIcon } from './components/Icons'
export default function App() {
  const [fileInfo, setFileInfo] = useState(null)
  const [history, setHistory] = useState([])
  const [toast, setToast] = useState(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])
  function handleFileLoaded(loaded) {
    setFileInfo(loaded)
    setHistory([])
  }
  function handleSaved({ fields, result }) {
    setFileInfo((prev) => ({
      ...prev,
      headers: result.headers,
      fieldMap: result.fieldMap,
      rowCount: result.rowCount,
    }))
    setHistory((prev) => [{ name: fields['Name'] || 'Unnamed contact', company: fields['Company'] || fields['Company Name'] }, ...prev])
    setToast(`Saved ${fields['Name'] || 'contact'} to ${fileInfo.fileName}`)
  }
  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <div className="brand-mark">CS</div>
          <div className="brand-name">CardScan</div>
        </div>
      </div>
      {!fileInfo && <FileSelector onFileLoaded={handleFileLoaded} />}
      {fileInfo && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="file-pill">
              <div className="file-pill-icon">
                <SheetIcon style={{ width: 16, height: 16, color: 'var(--blue)' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="file-pill-name">{fileInfo.fileName}</div>
                <div className="file-pill-sub">{fileInfo.rowCount} row{fileInfo.rowCount === 1 ? '' : 's'} saved this session: {history.length}</div>
              </div>
              <button className="btn-text" onClick={() => setFileInfo(null)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <SwapIcon style={{ width: 14, height: 14 }} />
                Change
              </button>
            </div>
          </div>
          <ScanCard fileInfo={fileInfo} onSaved={handleSaved} />
          {history.length > 0 && (
            <div className="card">
              <p className="section-label">Saved this session</p>
              {history.map((item, i) => (
                <div className="history-item" key={i}>
                  <div>
                    <div className="history-name">{item.name}</div>
                    {item.company && <div className="history-sub">{item.company}</div>}
                  </div>
                  <span className="history-count">Saved</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {toast && (
        <div className="toast">
          <CheckCircleIcon style={{ width: 16, height: 16 }} />
          {toast}
        </div>
      )}
    </div>
  )
}