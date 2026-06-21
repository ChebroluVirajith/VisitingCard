import * as XLSX from 'xlsx'
export const STANDARD_FIELDS = ['Name', 'Job Title', 'Company', 'Company Name', 'Phone', 'Email', 'Website', 'Address']
const SYNONYMS = {
  'Name': ['name', 'full name', 'contact name'],
  'Job Title': ['title', 'job title', 'designation', 'role', 'position'],
  'Company': ['company', 'organisation', 'organization', 'firm', 'business'],
  'Company Name': ['company name', 'organisation name', 'organization name', 'firm name', 'business name'],
  'Phone': ['phone', 'mobile', 'contact', 'tel', 'number'],
  'Email': ['email', 'e-mail', 'mail'],
  'Website': ['website', 'web', 'url', 'site'],
  'Address': ['address', 'location'],
}
function buildFieldMap(headers) {
  const map = {}
  STANDARD_FIELDS.forEach((field) => {
    const synonyms = SYNONYMS[field]
    const idx = headers.findIndex((h) => {
      const clean = String(h || '').trim().toLowerCase()
      return synonyms.some((s) => clean === s || clean.includes(s))
    })
    map[field] = idx
  })
  return map
}
// Reads a user-selected .xlsx file and returns the workbook plus
// info about its first sheet so we know where new rows should go.
export async function loadWorkbookFromFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const aoa = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : []
  const headers = aoa.length > 0 ? aoa[0].map((h) => String(h)) : []
  const fieldMap = buildFieldMap(headers)
  const rowCount = Math.max(0, aoa.length - 1)
  return {
    workbook,
    fileName: file.name,
    sheetName,
    headers,
    fieldMap,
    rowCount,
  }
}
// Appends one row built from `fields` (a {Name, "Job Title", ...} object)
// into the existing sheet, extending headers for any standard field
// that didn't already exist as a column, then triggers a save/download
// of the updated file using the same file name.
export function appendRowAndDownload({ workbook, sheetName, headers, fieldMap, fileName, fields }) {
  const sheet = workbook.Sheets[sheetName]
  let aoa = sheet ? XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) : []
  let workingHeaders = headers.length > 0 ? [...headers] : []
  let workingMap = { ...fieldMap }
  if (workingHeaders.length === 0) {
    workingHeaders = [...STANDARD_FIELDS]
    STANDARD_FIELDS.forEach((f, i) => { workingMap[f] = i })
    aoa = [workingHeaders]
  } else {
    // Append a column for any standard field that has no match yet.
    STANDARD_FIELDS.forEach((field) => {
      if (workingMap[field] === -1 || workingMap[field] === undefined) {
        workingHeaders.push(field)
        workingMap[field] = workingHeaders.length - 1
        if (aoa.length > 0) {
          aoa[0] = workingHeaders
        } else {
          aoa = [workingHeaders]
        }
      }
    })
    // Pad existing data rows so they all match the new header width.
    for (let i = 1; i < aoa.length; i++) {
      while (aoa[i].length < workingHeaders.length) aoa[i].push('')
    }
  }
  const newRow = new Array(workingHeaders.length).fill('')
  STANDARD_FIELDS.forEach((field) => {
    const idx = workingMap[field]
    if (idx >= 0) newRow[idx] = fields[field] || ''
  })
  aoa.push(newRow)
  const newSheet = XLSX.utils.aoa_to_sheet(aoa)
  workbook.Sheets[sheetName] = newSheet
  XLSX.writeFile(workbook, fileName)
  return { headers: workingHeaders, fieldMap: workingMap, rowCount: aoa.length - 1 }
}
