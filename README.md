# Typerun

A browser typing game: your keystrokes carry an orange stick figure across the words of a story.

## Run locally

Run `npm run dev`, then open http://127.0.0.1:5173. No installation or build step is needed. Run `npm test` to verify word classification and text layout.

## V1 behavior

- Type the displayed story one word at a time. Space or Enter commits a word; Backspace lets you correct it first.
- Correct characters advance the runner. Gait follows typing cadence and stops when typing stops.
- Familiar misspellings and adjacent letter swaps trigger a recoverable trip. Other submitted errors break the floor and drop the runner onto another story.
- The camera follows falls with a delay; the runner lands, gets up, and typing resumes.
- Eight original stories rotate. Finishing a story advances without counting a fall.
- Escape pauses; the help dialog and hiding the page also pause gameplay. Restart resets the session.
- Optional synthesized sound, word speed, character accuracy, distance, fall count, and a personal best stored on this device. Best speed starts recording after ten accepted words.
- Supports narrow screens and reduced motion. Story text remains text terrain; V2 scenery and choreography are not implemented.

## Files

`dist/` is the deployable static app. `engine.js` contains stories, common-typo classification, and word layout. `game.js` owns input, state transitions, animation, camera, sound, and stats. No external application libraries are needed; web fonts have local fallbacks.

Word mistakes are classified on submission to distinguish a common typo such as `teh` from a substantial error. Capitalization is flexible; punctuation must match. Accuracy compares submitted character positions, including errors on failed words. Speed uses accepted words over elapsed play time, excluding explicit pauses and fall animations.
