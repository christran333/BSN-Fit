# Fit Check — BSN Sports concept

A mobile web app prototype for cutting sizing-related returns on team uniform orders.
ATCM 4341 Experience Design, Fall 2026, with BSN Sports. Team: Chris Tran, Seulgi Kim, Dung Nguyen.

- **Coaches** get a short dashboard on their phone: who has filled out their fit check, who needs a reminder, and whose answers don't match the size they picked.
- **Athletes** (or parents) get one personal link: one screen, five tap questions, submit. The questions depend on what we already know about them.

## Try it

Open the deployed site on a phone or laptop. On a laptop it shows inside a phone frame, with demo shortcuts on the left:

| Link | Scenario |
|---|---|
| Coach dashboard | Roster, progress, notify, review queue, add a player |
| Mia | Parent of a 10-year-old who wore Youth M 15 months ago, so it asks about growth |
| Jordan | Says she's an S, no size on file. Indirect fit questions catch that she needs an M |
| Dana | Adult, same as last year. Answers are filled in, so it's one tap |

### Scenarios

The demo panel works like this: **pick who gets the text** (Jordan, Mia's parent, or Dana), then **pick a scenario**. Each scenario replays that person's text thread from the first invite up to that moment:

1. **First text**: invite with a link preview made for them, then a follow-up that says what to expect
2. **Ignored it**: three days later, deadline reminder
3. **Quit half-way**: the text says how far along they got; the link resumes where they stopped
4. **Remind me later**: they tapped it; this is the next day
5. **After deadline**: order closed; offer the next batch (the link shows a "join the next batch" page too)
6. **Done**: confirmation text; the coach has the size

**On file from last season** (Mia and Maya): *Size only* asks how much they've grown (5 questions). *Size + height* asks today's height and works out the growth from last season's height (4 questions).

**Coach setup** is the first-time flow: order details (school, team, season, due date, the coach name that goes on the texts), then the roster, then send. There are four ways to add players:

- **Last season's order** from BSN (one tap, sizes included)
- **Scan a roster photo**: a printed list or whiteboard. *The scan is simulated in this prototype*: it always returns the roster in `public/samples/roster-photo.jpg`, with one name and one number flagged to check. A real version would send the photo to an OCR / vision model.
- **Upload a spreadsheet** (.xlsx or .csv), parsed for real. Columns are matched by what coaches call them (Player, Jersey #, Grade, DOB, Shirt size, Height, Parent cell…) and values are cleaned up ("Mitchell, Avery", "Sr" → 17, `5'9"` → 69 in, "Womens M" → M). Players missing an age get asked for one before they're added.
- **Add one at a time**

Every import lands on a *Check your roster* list where names and numbers can be fixed and rows removed. No file handy? The roster screen has a sample photo, a sample spreadsheet (`public/samples/eagles-roster.xlsx`) and a CSV template.

**Their journey** jumps between that person's screens: Text › Fit check › Result › Coach view. Reply buttons in the thread work (RCS-style suggested replies). Dana can reply **Same as last year** and submit without opening the link. All text copy is in `src/messages.js`.

Everything is saved in the browser (localStorage), so a submit on an athlete link shows up on the coach dashboard right away. Use **Reset demo data** to start over.

## Run locally

```bash
npm install
npm run dev      # then open the printed URL; --host also lets you open it on your phone over Wi-Fi
```

**Design feedback (Agentation):** a click-to-annotate toolbar sits bottom-right in `npm run dev`. On the deployed site it's hidden; open any page with `?annotate` to turn it on in that browser (`?annotate=off` hides it again). Click elements, write a note, copy the output and paste it to your AI agent.

## How the sizing works (`src/sizing.js`)

1. **Which link?** `flowFor(player)`
   - under 13 → **parent growth check**
   - 18+ with a size on file → **same-as-last-year check** (filled in)
   - 13–17 with a size on file → **growth + fit check**
   - no size on file → **fit check**: asks how tops fit, not only what size they are
2. **Which five questions?** `questionsFor(player)`
3. **Which size?** `recommend(player, answers)` starts from the last or usual size and adds signals (growth, snug shoulders, hem riding up, brand, preference).

**The size-up bias:** people return clothes that are too small far more often than ones that are a bit big, so the engine leans up on purpose:
- `SIZE_UP_BIAS` adds a small push toward the bigger size on every recommendation.
- `ROUND_UP_AT = 0.25` rounds up once a score is a quarter of the way to the next size (normal rounding waits until halfway).
- A "roomy" answer only steps down half as much as a "tight" one steps up.
- Kids' height, store-bought size and a shirt measurement can only push a size **up**, never down.
- Adults whose answers point a size above what they picked get flagged for the coach to review.

> ⚠️ All size charts, brand offsets and growth numbers in `sizing.js` are **placeholders**. Replace them with BSN's real size charts and return data.

An LLM could later write the question wording or read the free-text notes. The size math stays rule-based, so every recommendation can be explained to the athlete and the coach.

## Deploy (Vercel)

Import the repo on vercel.com with the **Vite** preset (build `npm run build`, output `dist`). Every push to `main` redeploys automatically.

## Files

```
src/
  sizing.js            flows, questions, recommendation engine
  store.js             localStorage data + seed roster
  router.js            hash routes (#/coach, #/r/<token>)
  screens/
    CoachDashboard.jsx roster + progress + notify
    AddPlayer.jsx      add a player, preview the link they'll get
    PlayerPage.jsx     link status, or review answers + approve a size
    FitCheck.jsx       the one-screen athlete form
    Result.jsx         result + "not sure / add more info"
  components/          phone frame, chips, small helpers
```
