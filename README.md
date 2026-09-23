# Scholara Student Result Management System

A responsive HTML/CSS/JavaScript dashboard for managing student records, marks, and academic result exports.

## Run locally

Open `index.html` directly in a browser, or serve the folder with:

```powershell
python -m http.server 4173
```

Then visit `http://localhost:4173`.

## Included workflows

- Add, edit, delete, and search student profiles.
- Enter marks for Mathematics, Science, English, and History.
- Automatic total, percentage, grade, and pass/fail calculations.
- Filter by class and result status.
- Download all records as CSV.
- Print a class report or individual report card to PDF using the browser print dialog.

Records are stored in the browser's localStorage, so the dashboard works without a backend.

