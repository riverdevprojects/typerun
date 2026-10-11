# Typerun

A browser typing adventure. Your keystrokes carry an orange stick figure through a world drawn from the story.

## Run locally

Run `node preview.mjs`, then open http://127.0.0.1:5173. No installation or build step is needed. Run `node --test` for word classification, gait continuity, story paths, numbered ascents, combat, and checkpoints.

## V2: The Last Light

One complete original story, 134 words in six scenes: ash woods, a broken crossing, a ruined tower, a dragon encounter, a sword fight, and the first morning. The traveler drags a sword behind him, then carries the rescued lantern home.

- Correct typing drives traversal on solid word platforms and attacks. The breathing idle from v1 is retained, together with the original walk/run gaits. The next story word remains visible while the runner and camera catch up at scene boundaries.
- At a wide gap, the first Space submits the story word and starts a small hop. Press Space again within 900 milliseconds to boost into a double jump. Holding the key does not trigger a boost. Missed or wrong inputs cause a fall and scene checkpoint reset. The completed flight is timed, independent of further typing; input resumes on landing. Jump taps do not count as story words or accuracy characters.
- Orange `jumped` replaces `leaped`. Submitting it automatically launches a 1.3-second super jump over a 640-pixel gap, with a higher arc and orange speed streaks. The numbers `1`, `2`, `3` each climb 82 pixels using the double-Space control. The camera follows both directions with a delay.
- At the fight, words replace one another at a fixed position. Their letters drive blocks, sword swings, and ducks. The dragon reacts, sparks fly, and its chain fades as the story progresses.
- Dawn carries the lantern, plants the sword, and reveals a completion screen with session statistics and replay.
- Space or Enter submits a word; Backspace fixes it first. Common typos stumble. Other submitted mistakes animate a fall and return to the beginning of the current scene. Repeated words after retries count toward session typing statistics.
- Pause, help, restart, page visibility pause, optional synthesized sound, local personal best, mobile layout, and reduced motion are supported. Reduced motion removes jump arcs and ambient cycling; pause freezes all animation.
- No backend, application libraries, raster art, or generated media are required. Everything in the story is drawn with canvas strokes.

## Classic v1

The header links to `v1.html`. It retains the eight original stories, continuous text terrain, common-typo trips, falls to the next story, and breathing idle. V1 is also preserved on the GitHub `main` branch; v2 work lives on `v2`.

## Files

`dist/` is the deployable static application. `story.js` authors the chapters, word terrain, path sampling, and checkpoints. `leap.js` handles command timing, edge movement, timed flights, and visible word selection. `story-motion.js` adds sword carrying, jumps, combat poses, and the victory pose. `scenery.js` draws the environments, dragon, sword-adjacent effects, and lantern. `game.js` connects typing to choreography, the camera, UI, sound, recovery, and completion. `motion.js` retains the shared v1 character rig. `engine.js` classifies mistakes; `v1-game.js` drives the preserved classic game.

Speed uses accepted words over elapsed play time, excluding pauses, falls, recovery, and the ending. Accuracy compares submitted character positions, including failed words. Capitalization is flexible; punctuation must match. Personal bests for v1 and v2 use separate local storage keys, and start recording after ten accepted words.
