import { useRef, useState } from 'react'
import { createWorker } from 'tesseract.js'
import { parseCardText } from '../lib/parseCard'
import { STANDARD_FIELDS, appendRowAndDownload } from '../lib/excel'
import { CameraIcon, UploadIcon, IdCardIcon, AlertIcon, RotateLeftIcon, RotateRightIcon } from './Icons'
const STAGES = {
  IDLE: 'idle',
  PREVIEW: 'preview',
  PROCESSING: 'processing',
  REVIEW: 'review',
}
function rotateImage(imageSrc, isClockwise) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }
      // Swap width and height for 90 degree rotation
      canvas.width = img.height
      canvas.height = img.width
      if (isClockwise) {
        ctx.translate(canvas.width, 0)
        ctx.rotate((90 * Math.PI) / 180)
      } else {
        ctx.translate(0, canvas.height)
        ctx.rotate((-90 * Math.PI) / 180)
      }
      ctx.drawImage(img, 0, 0)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Canvas toBlob failed'))
          }
        },
        'image/jpeg',
        0.95
      )
    }
    img.onerror = (err) => reject(err)
    img.src = imageSrc
  })
}
export default function ScanCard({ fileInfo, onSaved }) {
  const cameraInputRef = useRef(null)
  const uploadInputRef = useRef(null)
  const [stage, setStage] = useState(STAGES.IDLE)
  const [imagePreview, setImagePreview] = useState(null)
  const [currentFile, setCurrentFile] = useState(null)
  const [progress, setProgress] = useState(0)
  const [fields, setFields] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setCurrentFile(file)
    setStage(STAGES.PREVIEW)
    setProgress(0)
  }
  async function handleRotate(clockwise) {
    if (!imagePreview) return
    try {
      const rotatedBlob = await rotateImage(imagePreview, clockwise)
      const newUrl = URL.createObjectURL(rotatedBlob)
      URL.revokeObjectURL(imagePreview)
      setImagePreview(newUrl)
      setCurrentFile(rotatedBlob)
    } catch (err) {
      console.error(err)
      setError('Rotation failed. Please try again.')
    }
  }
  async function startScan() {
    setError('')
    setStage(STAGES.PROCESSING)
    setProgress(0)
    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(m.progress)
        },
      })
      const { data } = await worker.recognize(currentFile)
      await worker.terminate()
      const parsed = parseCardText(data.text || '')
      setFields(parsed)
      setStage(STAGES.REVIEW)
    } catch (err) {
      console.error(err)
      setError('Could not read text from that image. Try a clearer, well-lit photo, or fill in the fields manually below.')
      setFields({
        'Name': '', 'Job Title': '', 'Company': '', 'Company Name': '', 'Phone': '', 'Email': '', 'Website': '', 'Address': '',
      })
      setStage(STAGES.REVIEW)
    }
  }
  function updateField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }
  function reset() {
    setStage(STAGES.IDLE)
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview)
    }
    setImagePreview(null)
    setCurrentFile(null)
    setFields(null)
    setProgress(0)
    setError('')
  }
  async function handleSave() {
    setSaving(true)
    try {
      const result = appendRowAndDownload({
        workbook: fileInfo.workbook,
        sheetName: fileInfo.sheetName,
        headers: fileInfo.headers,
        fieldMap: fileInfo.fieldMap,
        fileName: fileInfo.fileName,
        fields,
      })
      onSaved({ fields, result })
      reset()
    } catch (err) {
      console.error(err)
      setError('Could not save the row to the file. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="card">
      <p className="section-label">Scan card</p>
      {stage === STAGES.IDLE && (
        <>
          <div className="dropzone" style={{ marginBottom: 14 }}>
            <div className="dropzone-icon">
              <IdCardIcon style={{ color: 'var(--blue)' }} />
            </div>
            <div className="dropzone-text">Capture or upload a photo of the visiting card</div>
          </div>
          <div className="btn-row">
            <button className="btn btn-primary" onClick={() => cameraInputRef.current?.click()}>
              <CameraIcon style={{ width: 16, height: 16 }} />
              Camera
            </button>
            <button className="btn btn-outline" onClick={() => uploadInputRef.current?.click()}>
              <UploadIcon style={{ width: 16, height: 16 }} />
              Upload
            </button>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden-input" onChange={handleFile} />
          <input ref={uploadInputRef} type="file" accept="image/*" className="hidden-input" onChange={handleFile} />
        </>
      )}
      {stage === STAGES.PREVIEW && (
        <>
          {imagePreview && (
           <img src={imagePreview} alt="Card preview" className="preview-image" style={{ marginBottom: 10 }} />
          )}
          <div className="alert" style={{ marginBottom: 14, backgroundColor: 'var(--sky)', color: 'var(--blue-dark)', borderColor: 'var(--sky-mid)', display: 'block', textAlign: 'center' }}>
            <strong>Guide:</strong> Rotate the card until the text is horizontal and readable left-to-right before scanning.
          </div>
          <div className="btn-row" style={{ marginBottom: 14 }}>
            <button className="btn btn-outline" onClick={() => handleRotate(false)} style={{ flex: 1 }}>
              <RotateLeftIcon style={{ width: 16, height: 16 }} />
              Rotate Left
            </button>
            <button className="btn btn-outline" onClick={() => handleRotate(true)} style={{ flex: 1 }}>
              <RotateRightIcon style={{ width: 16, height: 16 }} />
              Rotate Right
            </button>
          </div>
          <div className="btn-row">
            <button className="btn btn-outline" onClick={reset} style={{ flex: 1 }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={startScan} style={{ flex: 1 }}>
              Scan Card
            </button>
          </div>
        </>
      )}
      {stage === STAGES.PROCESSING && (
        <>
          {imagePreview && <img src={imagePreview} alt="Captured card" className="preview-image" style={{ marginBottom: 14 }} />}
          <div className="progress-wrap">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <div className="progress-label">Reading card… {Math.round(progress * 100)}%</div>
          </div>
        </>
      )}
      {stage === STAGES.REVIEW && fields && (
        <>
          {imagePreview && <img src={imagePreview} alt="Captured card" className="preview-image" style={{ marginBottom: 14 }} />}
          {error && (
            <div className="alert error" style={{ marginBottom: 14 }}>
              <AlertIcon style={{ width: 16, height: 16, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
          <p className="section-label">Check the details</p>
          <div className="field-group">
            {STANDARD_FIELDS.map((key) => (
              <div className="field" key={key}>
                <label htmlFor={key}>{key}</label>
                {key === 'Address' ? (
                  <textarea id={key} rows={2} value={fields[key]} onChange={(e) => updateField(key, e.target.value)} />
                ) : (
                  <input id={key} type="text" value={fields[key]} onChange={(e) => updateField(key, e.target.value)} />
                )}
              </div>
            ))}
          </div>
          <div className="btn-row" style={{ marginTop: 16 }}>
            <button className="btn btn-outline" onClick={reset} disabled={saving}>
              Discard
            </button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save to file'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}