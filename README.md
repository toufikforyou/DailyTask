# MediTrack

Minimalistic medical student daily study planner & vocabulary notebook.

## Features

- Header with date, daily performance stars, total study hours field
- Daily target summary table (বাংলা শিরোনাম): target hours, fulfilled hours, difference (ঘাটতি/বেশি), target rating
- Editable task list with duration + title, dragless inline editing, persistent via localStorage
- Blue accented handwritten-style checkmarks when completed
- Reflection sidebar (priority, motivation, difficult subject, tomorrow pending)
- Vocabulary / Word-of-the-Day panel with shuffle
- Responsive layout (desktop / tablet / mobile)
- Accessible (semantic labels, focus styles, ARIA for stars)

## Tech Stack

Pure static front-end (HTML + CSS + vanilla JS). No build step required.

## Getting Started

1. Open `index.html` in any modern browser.
2. Add / edit tasks (duration & title fields are contenteditable).
3. Click the square to mark complete (fills pink with a handwritten-style ✓).
4. Rate your performance with the star buttons.
5. Capture study reflections in the right sidebar.
6. Shuffle vocabulary words using the ↺ button.

All data persists locally per browser via `localStorage`.

## File Overview

- `index.html` – Structure & semantic layout
- `styles.css` – Minimalist academic notebook styling, blue highlight palette
- `script.js` – Interactivity & state persistence
- `README.md` – Documentation

## Customization Tips

- Add / adjust sample tasks inside `sampleTasks()` in `script.js`.
- Extend vocabulary array in `script.js` with more medical terms.
- Tweak colors by editing CSS variables in `:root`.

## License

MIT (add a license file if distributing publicly).
