OPTIMISED IMAGES — drop-in replacement
======================================

Why: the original assets/ folder was 41.5 MB of full-resolution PNG/JPEG
screenshots and certificate scans. Resized to a 1800px long edge and
re-encoded, it is 12.7 MB — 3x lighter, no visible difference on screen.
(DEPLOY.md itself flagged this as the thing to do before shipping.)

25 screenshots were PNGs with an unused alpha channel, so they became .jpg.
Their filenames changed, and showcases/story.html has been updated to match —
that is why it is in this zip too.

HOW TO APPLY to your "Mohamed Profile" folder:
  1. Delete the whole existing  assets/  folder
  2. Copy the  assets/  folder from this zip in its place
  3. Replace  showcases/story.html  with the one from this zip

Then the folder is ready to drag onto Vercel (New Project → Deploy →
drop the folder; framework preset "Other", no build command).

Verified after the change: all 76 story images load, all 10 showcase cards
open, no console errors, no horizontal overflow at 390px.
