# Typerun

A browser typing game: your keystrokes carry an orange stick figure across the words of a story.

## Run locally

Run `node preview.mjs`, then open http://127.0.0.1:5173. No installation or build step is needed. Run `node --test` to verify word classification, text layout, and animation continuity. The equivalent npm scripts are available when npm is installed.

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

`dist/` is the deployable static app. `engine.js` contains stories, common-typo classification, and word layout. `game.js` owns input, state transitions, camera, sound, and stats. `motion.js` contains the joint poses, interpolated run cycle, trip/fall/landing/get-up transitions, and critically damped travel. No external application libraries are needed; web fonts have local fallbacks.

The character has a relaxed idle with breathing and separated arms. Slow typing produces an upright walk with short steps, relaxed arms, and continuous foot contact. Fast typing produces longer running strides, bent arms, forward lean, and airborne phases. Smoothed travel speed blends the two gaits without resetting their shared step phase. Foot travel drives animation speed; moving and standing also blend gradually. Mistake animations start from the displayed pose, and getting up returns continuously to idle. Feet stay above the text; no shadow or platform is drawn over the letters.

Idle breathing has a 3.8-second cycle: the head and shoulders rise gently on the inhale, relaxed hands follow with a slight delay, and the feet remain planted. Pausing freezes the pose; reduced motion holds a still idle.

Word mistakes are classified on submission to distinguish a common typo such as `teh` from a substantial error. Capitalization is flexible; punctuation must match. Accuracy compares submitted character positions, including errors on failed words. Speed uses accepted words over elapsed play time, excluding explicit pauses and fall animations.
