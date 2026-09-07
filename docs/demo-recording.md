# Recording the demo

A runbook for capturing a short screen recording of the app, written so it can
be done again in about ten minutes without re-deciding anything.

`scripts/record-demo.ps1` automates the parts a script can do — checking the
live site still answers the way the shot list assumes, putting each message on
the clipboard in turn, and opening OBS. Everything below is the part it cannot:
what to show, in what order, and why that order.

## What the video is for

The app's audience is older and less digitally confident New Zealanders, and
they will not see this video. The video is for the people who reach them —
librarians, SeniorNet volunteers, Citizens Advice, Age Concern, the person in a
family who gets asked "is this real?" — and for anyone deciding whether the
thing is serious enough to pass on.

That audience does not need to be told scams exist. What they have not seen
before is a checker that refuses to cry wolf. Build the video around that.

## Shape

Three messages, in this order. The order is the argument.

| # | Message | Verdict | The point |
| :- | :- | :- | :- |
| 1 | NZ Post signature, link to `mypost.securebn.homes` | `scam` | The host does not contain "nzpost" anywhere. A rule that looks for the brand inside the domain sees nothing. |
| 2 | "Your package has arrived at the warehouse…" | `warning` | No link and no organisation named. There is nothing to look up — only the story is wrong. |
| 3 | Genuine ASB payment check, "Reply YES if this was you" | `unclear` | Real bank text, same shape as the reply-Y scam. **It stays quiet.** |

Then one closing beat: the "how to check" line, which names ASB's real phone
number, and the `/asked` page — where someone who cannot decide hands the
message to a person they trust, and that person answers with one of three
buttons without typing a word.

Finish on the URL. Nothing else.

### Why message 3 carries the video

Anyone can build something that shouts "scam" at a suspicious text. The
expensive property is silence on a real one, because an app that cries wolf at a
genuine bank message teaches a frightened person to ignore it — and that failure
is invisible unless you deliberately show it. Message 3 is the only shot that
demonstrates it, so give it the most time on screen.

Note the wording it comes back with: *"We can't tell. Don't act on this until
someone you trust has looked."* Not "this is safe". The app has no way to say
safe, by design — a false reassurance costs someone their savings, while a false
warning costs them a phone call. If you narrate one sentence in the whole video,
narrate that.

## Framing

Record a **phone-shaped window, not a desktop one.** This is a mobile app in
practice: its name is the sentence someone is already thinking, and on a phone it
is also the button in the text-selection menu. A wide desktop capture with the
content in a narrow column in the middle both looks worse and misrepresents how
it is used.

- Chrome → `F12` → `Ctrl+Shift+M` (device toolbar) → **iPhone 14 Pro Max**, then
  close DevTools' panel so only the phone viewport shows.
- Zoom the page so the text is comfortably readable at a glance — assume it will
  be watched at a third of full size in a feed.
- In OBS, crop to the phone frame and output **1080×1350** (4:5). That is the
  tallest portrait LinkedIn shows in-feed without letterboxing, and it is the
  shape the app actually lives in.

## Captions, not narration

LinkedIn autoplays muted, so anything said aloud is lost on most viewers. Burn
short captions in, one per beat:

1. *"A real NZ Post scam. The link doesn't say nzpost anywhere."*
2. *"No link. No brand name. Nothing to look up."*
3. *"A genuine bank text. It stays quiet."*
4. *"It never says 'safe' — it gives you the real number to ring."*

Record narration as well if you want a version for a talk, but cut the video so
it works with the sound off.

## One-time OBS setup

Roughly three minutes, once. The script does not write OBS config — OBS
overwrites its own files when it exits, so anything generated behind its back is
liable to vanish.

1. **Profile** → New → `IsThisAScam Demo`.
   Settings → Output → Recording quality *High*, format `mp4`, encoder NVENC.
   Settings → Video → Base and Output resolution both `1080x1350`, 30 fps.
   Settings → Output → Recording path: `%USERPROFILE%\Videos\is-this-a-scam`.
2. **Scene collection** → New → `IsThisAScam Demo`.
   Add one **Window Capture** source pointed at the Chrome window, then
   right-click it → Transform → **Edit Transform** and crop to the phone frame.
   Window Capture rather than Display Capture so a notification on another
   monitor cannot land in the shot.
3. Settings → Hotkeys → bind **Start/Stop Recording** to something you can hit
   without looking. `F9` is free.

Both names are what `scripts/record-demo.ps1` looks for. If you rename them,
pass `-ObsProfile` and `-ObsCollection`.

## Speed run

```powershell
.\scripts\record-demo.ps1              # preflight, shot list, open Chrome + OBS
.\scripts\record-demo.ps1 -Take 1      # message 1 onto the clipboard
.\scripts\record-demo.ps1 -Take 2
.\scripts\record-demo.ps1 -Take 3
```

The preflight sends all three messages to the live site and checks each one
still comes back with the verdict this runbook promises. Run it before you press
record, every time: the engine changes, and the video's whole argument is that
message 3 stays quiet. Finding out it no longer does *after* recording is an
expensive way to learn it.

If a preflight verdict has moved, that is a finding about the app, not a problem
with the script. Stop and look at why before recording something else.

## Before posting

- Watch it once with the sound off. If the argument does not survive that, it
  will not survive the feed.
- Do not put an accuracy figure in the caption. The benchmark is twenty-one
  messages, most of them written by a language model, and
  `docs/benchmark-method.md` exists to explain why the number should not be
  quoted loose. "It catches these and stays quiet on that" is a claim the video
  actually demonstrates; a percentage is not.
- Link the app, not the repo. The people this is for do not want the source.
