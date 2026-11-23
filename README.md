# Typerun

Type the words under an orange runner’s feet. Your keystrokes set the pace.

## Run locally

Run `node preview.mjs` and open http://127.0.0.1:5173. No installation or build step is needed. Run `node --test` for engine, motion, gameplay, menu and persistence regressions. GitHub Actions runs the tests on pushes and pull requests.

## How to play

Select **Next word** and type the underlined word. Space or Enter submits; Backspace corrects letters before submission. Matching letters move the runner forward. Case is flexible. Pasting and multiword entries are not accepted.

- **Story** starts at *The door in the woods* and cycles through eight stories. Include punctuation.
- **Words** draws batches of 50 words from Monkeytype’s English 200 list. Every target is lowercase, with no punctuation or immediate repeat. Finishing a batch, like finishing a story, advances without counting a fall.

During play, press **Tab** to restart immediately or **Shift+Tab** to move focus backward. Press **Esc** or select **Settings** to pause. The same menu contains Game, Fall rule, Minimum accuracy, Sound, help and restart. In the menu, Tab moves between controls; arrow keys select radio options or adjust the slider. Esc backs out of help or cancels a confirmation. At Settings, Esc or **Resume game** returns to your partial word. Hiding the page during play also opens Settings; coming back does not restart the clock.

### Fall rules

**Minimum accuracy** starts at 85%. Accuracy compares character positions in submitted words plus the letters currently typed. Missing and extra submitted letters count as errors. From the first keystroke of each story or batch, you have five active seconds to recover accuracy. After that, dropping below the minimum causes a fall, even mid-word or while idle. Meeting it exactly is safe. At 100% there is no grace; at 0% accuracy never causes a fall. Slider edits save immediately without restarting. A paused game enforces the new minimum on resume.

**Consecutive mistakes** counts submissions, not unsubmitted letters. A mistake trips the runner; three wrong submissions in a row cause a fall. A correct word clears the count. The slider is disabled but keeps its value.

Changing game or fall rule restarts the session, with confirmation after typing begins. Cancel keeps the partial word and settings. Your game, rule, threshold and sound preference stay on this device. Sound starts off. Landing resets accuracy, grace and streak. Input unlocks at impact: typing helps the runner get back up without losing submissions or partial words.

## Session stats

WPM counts correct submitted words per active minute, not five-character units. A word the runner trips over can add distance but not speed. The session clock starts with typing, stops during pauses and airborne transitions, and resumes at impact. Grace starts separately on each line. Both clocks use real active time regardless of frame rate. After ten correct submissions, displayed WPM is eligible for a local best. Tab and the Settings restart button both start you over at story 01 or a fresh batch, keeping your fall rule and local best. The button asks for confirmation; Tab does not. Older distance-based records are not imported.

## Files and motion

`dist/` is the deployable static root. `engine.js` contains stories, the English 200 list, batch generation, word classification and layout. `game.js` owns input, settings, state transitions, camera, WebAudio beeps and stats. `motion.js` contains joint poses, interpolated gaits, trip/fall/landing/get-up transitions and critically damped travel. Web fonts have local fallbacks; there are no application libraries.

The runner breathes on a 3.8-second cycle with planted feet and relaxed hands. Slow travel produces a short upright walk with continuous ground contact; faster travel blends into longer running strides with bent arms, forward lean and airborne phases. Distance drives the shared step phase. Trips and falls begin from the displayed pose; recovery blends back into locomotion. No shadow or platform covers the letters. Pausing freezes the pose. Reduced motion holds a still idle, omits scattered letters and cuts between baselines instead of sweeping the camera.
