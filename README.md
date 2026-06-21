# CardScan

Scan a visiting card on your phone, extract the contact details with OCR, review/edit them, and append a row to an Excel file you select from your device.

## Stack
- React + Vite
- Tesseract.js — in-browser OCR, free, no API key
- SheetJS (xlsx) — reads/writes the .xlsx file in the browser

## Run locally
```
npm install
npm run dev
```
Open the printed local URL. To test the camera capture on your phone, run on the same network and open the dev server's network URL (Vite prints one with `--host`):
```
npm run dev -- --host
```

## Build for deployment
```
npm run build
```
Outputs static files to `dist/`. Deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages, etc).

**Important:** camera access (`capture="environment"`) and some mobile browser features only work over **HTTPS** (or `localhost`). Make sure your deployed site uses HTTPS — Netlify/Vercel do this by default.

## How saving works
Browsers can't silently overwrite an arbitrary file on your phone's storage. The flow here is:
1. You select your existing .xlsx file via the file picker (read-only access, in memory).
2. The app reads its first sheet's headers and tries to match them to standard fields (Name, Job Title, Company, Phone, Email, Website, Address). Unmatched fields get a new column appended.
3. After each scan, the new row is appended in memory and the **updated file is downloaded** under the same file name.
4. On Android, the browser may let you save it back to the same location (overwrite). On iPhone Safari, this isn't supported — each save creates a new download in your Downloads/Files app; re-select the latest one next time you open the app to keep appending to it.

The workbook stays loaded in memory for the rest of the session, so you don't need to re-select the file between consecutive scans — only if you reload the page or switch files.

## OCR accuracy notes
Tesseract.js runs entirely in the browser (downloads a small language model on first use, then caches it). It works best with:
- Good lighting, minimal glare
- The card filling most of the frame, held flat
- Printed (not handwritten) text

OCR output is parsed with simple heuristics (regex for email/phone/website, keyword hints for job title/company) — always review the fields before saving, since results vary by card layout and font. You can edit any field directly in the review screen.

## Project structure
```
src/
  components/
    FileSelector.jsx   # pick the existing Excel file
    ScanCard.jsx        # camera/upload, OCR, review + save
    Icons.jsx           # inline SVG icons
  lib/
    excel.js            # read workbook, map headers, append row, download
    parseCard.js         # heuristic OCR text -> structured fields
  App.jsx                # screen flow + session history
  styles.css              # "trust blue" design tokens
```

## Customizing fields
Edit `STANDARD_FIELDS` and the `SYNONYMS` map in `src/lib/excel.js` to change which columns the app looks for or writes, and update the heuristics in `src/lib/parseCard.js` to match.
