# German in the Glow

A small, static German fill-in-the-blank game for English speakers. Questions are presented against a flowing aquarium of yellow and orange glimmers, with immediate grammar explanations after each answer.

The game is built with plain HTML, CSS, and JavaScript. It has no dependencies, package manager, or build step.

## Play locally

Because the game loads its question bank with `fetch()`, serve the project from a local web server rather than opening `index.html` directly:

```bash
python3 -m http.server
```

Then open [http://localhost:8000](http://localhost:8000).

Choose an answer with the mouse or by pressing `1`–`5`. Each answer reveals a translation and explanation and sends a brief wave through the glimmers. Press `Enter` or `Space`, or click empty space, to continue without triggering another wave. Incorrect questions return to the queue and appear again later.

## Project structure

- `index.html` — page structure and accessibility landmarks
- `style.css` — responsive visual design and reduced-motion support
- `main.js` — question loading, validation, shuffling, answer feedback, and keyboard controls
- `aquarium.js` — animated liquid glimmers and answer feedback effects
- `sentences.json` — question and explanation content

## Add questions

Add objects to `sentences.json` using this shape:

```json
{
  "id": 6,
  "sentence": "Ich sehe ___ Katze.",
  "translation": "I see a cat.",
  "options": [
    { "word": "eine", "correct": true, "explanation": "Katze is feminine." },
    { "word": "einen", "correct": false, "explanation": "This is masculine accusative." },
    { "word": "ein", "correct": false, "explanation": "This does not fit feminine accusative." }
  ]
}
```

Every question must contain exactly one `___` placeholder, have 3–5 options, and have exactly one option where `correct` is `true`. Each option also needs a `word` and an `explanation`. Invalid entries are logged in the browser console and skipped.

## License

No license has been specified yet.
