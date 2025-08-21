# Study Planner (MediTrack)

A clean, Bengali-friendly daily study planner for medical students. Blue theme, modern container layout, and zero-dependency front‑end.

## Features

- Sticky header with date boxes (DD • MMM • YYYY), constrained to a centered content width
- Daily Target Summary (বাংলা):
  - Target hours and Fulfilled hours inputs
  - Δ Surplus/Deficit auto-calculation with color coding
  - ⭐ Target Rating auto-computed from percentage achieved (0–5 stars)
- Previous days missed / important notes (single textarea, table styled)
- Tasks
  - Inline editable Duration + Title (contenteditable)
  - Checkbox-only completion with visual feedback and delete
  - “+ নতুন টাস্ক যোগ করুন” with validation and shake on error
  - Persists to localStorage
- Sidebar quick notes
  - আজকের লাইভ/অফলাইন ক্লাস, আজকের পরিক্ষা/মার্ক, রেকের্ডেড ক্লাস
  - Always-visible input + “+” add button per box; items removable (×)
  - নামায কমপ্লিট checklist (৫ ওয়াক্ত)
  - অযথা সময় নষ্ট করেছি (single line)
- Simple footer: “Study Planner © YEAR”
- Responsive and accessible (aria-live for diffs, role for stars, keyboard-friendly)

Note: The previous “Word of the Day” vocabulary footer has been removed for a cleaner layout.

## Tech Stack

Pure static front-end: HTML + CSS + vanilla JavaScript. No build tools required.

## Getting Started

1. Open `index.html` in any modern browser.
2. Edit tasks inline; use the checkbox to complete; use ✕ to delete.
3. Fill Target and Fulfilled hours; rating and difference update automatically.
4. Use the sidebar inputs with “+” to add list items; remove with ×; toggle prayers.

Data is stored per browser via `localStorage` (key: `meditrack.daily.v1`).

## Files

- `index.html` – App structure and sections
- `styles.css` – Blue theme, container layout, header/date styles, tables, sidebar
- `script.js` – State, tasks, target summary logic, sidebar lists, prayers, persistence
- `README.md` – This document

## Customization

- Edit default tasks in `sampleTasks()` inside `script.js`.
- Tweak colors and spacing via CSS variables and section rules in `styles.css`.
- Adjust target rating thresholds in `computeTargetRating()` if needed.

## License

MIT (add a LICENSE file if distributing publicly).
