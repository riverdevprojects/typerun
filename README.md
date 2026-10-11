# Typerun

A browser typing adventure drawn with canvas strokes. Your words carry a sword-dragging orange traveler up a mountain to bring back the sun.

## Run locally

Run `node preview.mjs`, then open http://127.0.0.1:5173. No installation or build step is needed. Run `node --test` for typing feedback, chapter accuracy, continuous movement, jumps, battle choreography, lantern progression, and checkpoints.

## V2: The Last Light

One original story, 212 words in seven scenes: ash foothills, a broken ravine crossing, mountain steps, the cave keeper, steel and fire, the lantern cave, and the summit. The story continuously gains altitude, with three numbered jumps climbing another 82 pixels each. The camera follows with a delay.

Layered trees, distant mountain faces, mist, carved canyon walls, broken bridges, masonry, a cave interior, summit plants, and a gradual sunrise retain a muted hand-drawn style. Parallax details use stable world coordinates. The dragon is an original angular, segmented creature with articulated wings, armored neck, horns, claws, a tapering tail, and quiet bone-colored eyes. It has no glowing violet accents.

Type directly on the story; the separate next-word dock is removed. Click the scene to focus the keyboard input. Untyped letters are muted, correct letters turn dark, wrong positions keep the expected letter and turn red, and extra letters appear in darker red. Submitted incorrect words retain an error underline, including incomplete words. Extra letters expand the following terrain; backspacing shrinks it again. The orange caret follows the current input. Feedback follows Monkeytype's default `indicateTypos: off` behavior, verified against its official test UI source, rather than replacing expected letters with the mistyped ones.

Chapter accuracy is correct input keystrokes divided by all scored input keystrokes. Incorrect keystrokes stay in the score after backspace; deleted characters do not count as new keystrokes. Normal word-submission Space is scored. The second Space used to jump is a game control and is excluded. Case and punctuation must match. A chapter score of exactly 85% is allowed. A score strictly below 85% causes a fall and restarts the current chapter with fresh chapter accuracy and cleared chapter errors. Otherwise submitted mistakes are allowed and movement continues. Session accuracy in the ending includes all attempts. Chapter accuracy resets when entering a new chapter.

At a gap, first Space submits the story word and starts a small hop. Tap Space again within 900 milliseconds to boost into a double jump. A missed or incorrect jump command still causes a physical fall to the chapter checkpoint. Holding Space does not trigger the second jump. After the second Space, typing works during the run-up and flight. Typing speeds up the landing; subsequent rapid letters and Space presses are preserved. Orange `jumped` launches a super jump across a 640-pixel gap. Double jumps have a downward kick, tuck, sword follow-through, pressure ring, air trails, and a soft landing that never blocks typing.

The stationary battle progresses through six authored beats: guard, claw lunge/parry, wing sweep/duck, fire breath, spinning sword strike, and defeated bow. During fire, the traveler raises one arm into the stream and keeps the sword in the other hand. Submitting the story word `spun` launches a complete timed 1.2-second aerial spin and sweeping strike; it finishes even if typing stops. Typing can continue throughout it. Armor fragments and chain sparks accompany the hit. The defeated dragon folds its wings and bows, granting access to the cave.

The lantern waits on a stone pedestal inside the cave. The traveler picks it up, carries it along the final ridge, and hangs it on the summit signpost. The final words replace one another at that spot so the ending remains framed around the lantern. Hanging it starts the sunrise; the completed story plants the sword and reveals session statistics and replay.

Pause, restart, visibility pause, optional synthesized sound, local personal best, responsive layout, accessible keyboard input, and reduced motion are retained. Pause freezes animation. Reduced motion suppresses jump arcs, the spinning rotation, camera jolts, air trails, and ambient cycling. Respawn immediately enables typing and blends out of the get-up pose on the first keystroke.

## Classic v1

`v1.html` retains the original eight stories, common-typo trips, fall-to-new-story behavior, walking/running differentiation, and breathing idle. V1 remains on GitHub `main`; new work lives on `v2`.

## Files

`dist/` is the deployable static application. `story.js` authors the chapters, ascending terrain, battle beats, and checkpoints. `leap.js` samples timed flights and selects visible words. `typing-feedback.js` implements letter states, keystroke scoring, the accuracy boundary, and extra-letter layout. `choreography.js` defines combat phases and poses. `story-motion.js` supplies sword carrying and double-jump poses. `landscape.js` draws the backgrounds; `dragon.js` draws the keeper and fire breath. `scenery.js` supplies shared drawing primitives, the lantern, and signpost. `game.js` connects typing, animation, camera, and UI. `motion.js` and `engine.js` preserve classic v1 behavior.

Research: https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/test-ui.ts and https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/events/live-cache.ts.
