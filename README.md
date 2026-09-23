# German in the Stars

A small, static German fill-in-the-blank learning game for English speakers. It uses plain HTML, CSS, and JavaScript—no dependencies or build step.

## Run it

From this directory, start a local server:

```bash
python3 -m http.server
```

Then open [http://localhost:8000](http://localhost:8000) in a browser. A server is required because the game loads `sentences.json` with `fetch()`.

## Add sentences

Add objects to `sentences.json` using this shape:

```json
{
  "id": 6,
  "sentence": "Ich sehe ___ Katze.",
  "translation": "I see a cat.",
  "level": "A1",
  "grammarTag": "accusative-article",
  "options": [
    { "word": "eine", "correct": true, "explanation": "Katze is feminine." },
    { "word": "einen", "correct": false, "explanation": "This is masculine accusative." },
    { "word": "ein", "correct": false, "explanation": "This does not fit feminine accusative." }
  ]
}
```

Every sentence must contain exactly one `___` placeholder, have 3–5 options, and have exactly one option where `correct` is `true`. Invalid entries are logged in the browser console and skipped.
