# Typerun

A canvas stick-figure typing adventure. Carry an empty lantern through the ash foothills, across a broken crossing, past an old watchtower, and into a sheltered cave. Find a small fire, light the lantern, and finish with a little warmth of your own.

## Run locally

Run node preview.mjs and open http://127.0.0.1:5173. No installation or build step is needed. Run node --test for typing, chapter accuracy, movement, punctuation jumps, carrying poses, fire progression, and continuous watchtower placement.

## V2: The Last Light

One complete 126-word story in five scenes: foothills, crossing, watchtower, cave, and firelight. The trail climbs gradually; there are no numbered steps or combat encounter. The watchtower and distant peak use continuous world coordinates instead of wrapped camera offsets, so they never snap back as the traveler moves.

Every expected punctuation mark finishes its word automatically and launches one single jump. Jump gaps are 40 pixels; ordinary spaces between words do not trigger jumps. Typing remains available during flight and speeds up the landing. Fast subsequent input is preserved, and the final punctuation completes its jump before showing the ending. Reduced motion suppresses the arc and air trails.

The traveler holds a compact lantern by its handle beside the waist. The carrying arm stays bent, the free arm swings separately, and the lantern follows the hand with a small pendulum motion. The rounded frame includes a metal cap, glass highlights, wick, and a restrained flame. V2 uses slightly lighter figure strokes while preserving the breathing idle and walking/running distinction.

The cave contains a stationary small fire. The traveler approaches, kneels, lowers the lantern, and touches its wick to an ember. Submitting ember. starts a timed ignition that completes even when typing stops. The lantern flame and the cave warmth fade in together. The next words replace each other at the fire; the traveler lifts the lit lantern and the ending appears. Restarting this chapter clears its ignition state as well as its accuracy.

Type directly on the story. The separate next-word panel is removed. Click the scene to focus input. Correct letters turn dark; incorrect positions retain the expected character and turn red; extra letters appear in darker red. Submitted incorrect words keep an error underline. Extra letters expand the following terrain and backspace restores it, including the fire anchor. Feedback follows Monkeytype's default indicateTypos-off behavior.

Chapter accuracy is correct input keystrokes divided by all scored input keystrokes. Deleted errors stay in the score, while Backspace itself is not scored. Ordinary word-submission Space is scored; an empty Space after punctuation is ignored. Mistakes are allowed at or above 85 percent. Falling strictly below 85 percent returns to the current chapter's start with fresh chapter accuracy. Typing is immediately available on respawn and blends out of the recovery pose. New chapters start with fresh chapter accuracy; ending accuracy includes all attempts.

Pause, replay, optional synthesized sound, visibility pause, local personal best, responsive layout, and accessible keyboard input are retained.

## Classic v1 and branches

v1.html retains the original stories, common-typo trips, fall-to-new-story behavior, and breathing idle. GitHub main preserves V1; current development lives on v2.

## Files

dist is the static deployment. story.js defines the chapters and terrain; leap.js samples the single jumps; typing-feedback.js handles errors and scoring. story-motion.js defines carrying, jumping, and kneeling poses; journey.js handles the hearth and continuous landmark placement. landscape.js draws the scenery; scenery.js draws the lantern and fire. game.js connects input, animation, camera, and UI. motion.js and engine.js also preserve the classic V1 behavior.

Research: https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/test-ui.ts and https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/test/events/live-cache.ts.
