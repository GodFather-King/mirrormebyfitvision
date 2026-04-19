
## What I found
- The live frontend on both public URLs is still serving:
  - `https://mirrormebyfitvision.lovable.app/version.json` → `2026-04-18T14:02:43.397Z`
  - `https://fitvision.co.za/version.json` → `2026-04-18T14:02:43.397Z`
- That means the public site is still on an older frontend build.
- So the immediate problem is not just the in-app updater: the latest editor code has not reached the live deployment yet.

## Most likely cause
One of these is happening:
1. The latest frontend changes were not actually published yet.
2. Publish completed, but the device is still opening a cached installed/PWA copy.
3. The current update flow is too opaque, so it is hard to tell whether the live site is old or the installed app is stale.

## Plan
### 1) Confirm the live deployment state
- Re-check the current public build ID against the latest code after you publish/update.
- Verify that the public `.lovable.app` URL and custom domain both move to a newer `version.json` build.
- If they do not change, treat this as a publishing issue first, not an app-cache issue.

### 2) Make the app visibly show its build/version
- Add a small version/build label in the app UI or settings/sidebar.
- Show:
  - current app build ID
  - whether an update is available
  - whether the app is running in installed/PWA mode
- This removes guesswork when testing updates.

### 3) Harden the update flow
- Review `usePWAUpdate.tsx` so it distinguishes:
  - “live site is still old”
  - “live site is new but this device is stale”
- Improve the update CTA text/toasts so the user sees a clear message instead of “loading”.
- Keep the existing banner/sidebar entry, but add more explicit states:
  - Checking live version
  - New version found
  - Reloading into latest version
  - Already on latest version

### 4) Reduce stale-cache risk
- Adjust the PWA/service worker strategy so critical freshness checks are never ambiguous.
- Ensure `version.json` is always fetched network-first / not cached by the service worker.
- Review whether the update path should be more aggressive for production users after publish.

### 5) Verify the saved-image watermark feature on the actual live build
- Once the live build ID changes, test:
  - Saved Outfits download
  - Saved Avatars download
  - WhatsApp share path
- Confirm the watermark includes both:
  - MirrorMe logo mark
  - “MirrorMe by FitVision (PTY) Ltd”

## Technical details
- Current code already emits `version.json` from `vite.config.ts`.
- Current updater compares `__APP_BUILD_ID__` with `/version.json`.
- Because the public `version.json` is still old, the live deployment itself is behind.
- That means no amount of clicking “Check for Updates” inside the app can reveal changes that have not reached the public build yet.

## Expected outcome after implementation
- You will be able to instantly see which build is running.
- The app will give a clear message about whether the problem is:
  - unpublished frontend changes, or
  - stale installed-app cache.
- After publish, users should reliably move to the newest frontend without confusion.

## What I would do next after approval
1. Add a visible build/version indicator.
2. Improve the updater messages and state handling.
3. Tighten the cache/update strategy for `version.json`.
4. Verify the live build and then test the watermark download/share flows end to end.
