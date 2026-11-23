# Typerun

A browser typing game: your keystrokes carry an orange stick figure across the words of a story.

## Run locally

Run `node preview.mjs`, then open http://127.0.0.1:5173. No installation or build step is needed. Run `node --test` for the engine, motion, scoring, clock, and gameplay regression tests. GitHub Actions runs the same command on pushes and pull requests.

## How to play

Type the story one word at a time. Space or Enter submits a word; Backspace lets you fix it first. Capitalization is flexible, but punctuation must match. Correct characters move the runner forward. Finishing a story advances to the next of eight rotating stories without counting a fall.

**Consecutive mistakes off (default):** The slider sets the minimum story accuracy from 0 to 100 percent (initially 85). Accuracy compares submitted character positions plus the letters currently typed. Missing and extra submitted letters count as errors. Each story gives five active seconds from its first keystroke to fix early mistakes. After grace, dropping below the minimum causes a fall even if you stop typing; meeting it exactly is safe. At 100 percent there is no grace.

**Consecutive mistakes on:** A wrong submission trips the runner. Three wrong submissions in a row cause a fall, including common typos. A correct submission clears the streak. Unsubmitted letters never cause a fall, and the accuracy slider is disabled.

Switching modes restarts the session. The mode and slider setting are saved on this device. Landing resets story accuracy, grace, and the mistake streak. Typing resumes at impact and speeds up recovery; words and partial input entered during recovery retain their progress. Escape pauses; opening help or hiding the page during play also pauses the game.

## Session stats

WPM counts correct submitted story words per active minute, not five-character units. Words traveled measures progress separately: a word you trip over can add distance but not speed. The session clock starts with typing, stops during pauses and airborne transitions, and resumes at impact. Grace starts separately with each story. Both clocks use real active time regardless of frame rate. After ten correct submissions the displayed speed is eligible for a local personal best; records from the former distance-based calculation are not imported.

## Files

`dist/` is the deployable static app. `engine.js` contains stories, common-typo classification, and word layout. `game.js` owns input, state transitions, camera, sound, and stats. `motion.js` contains the joint poses, interpolated run cycle, trip/fall/landing/get-up transitions, and critically damped travel. No external application libraries are needed; web fonts have local fallbacks.

The character has a relaxed idle with breathing and separated arms. Slow typing produces an upright walk with short steps, relaxed arms, and continuous foot contact. Fast typing produces longer running strides, bent arms, forward lean, and airborne phases. Smoothed travel speed blends the two gaits without resetting their shared step phase. Foot travel drives animation speed; moving and standing also blend gradually. Mistake animations start from the displayed pose, and getting up returns continuously to idle. Feet stay above the text; no shadow or platform is drawn over the letters.

Idle breathing has a 3.8-second cycle: the head and shoulders rise gently on the inhale, relaxed hands follow with a slight delay, and the feet remain planted. Pausing freezes the pose; reduced motion holds a still idle.
