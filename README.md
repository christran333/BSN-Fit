# Fit Check — BSN Sports concept

A mobile web app prototype for cutting sizing-related returns on team uniform orders.
ATCM 4341 Experience Design, Fall 2026, with BSN Sports. Team: Chris Tran, Seulgi Kim, Dung Nguyen.

- **Coaches** get a short dashboard on their phone: who has filled out their fit check, who needs a nudge, and whose answers don't match the size they picked.
- **Athletes** (or parents) get one personal link: one screen, five tap questions, submit. The questions depend on what we already know about them.

## Try it

Once GitHub Pages is on (see below), open the site on a phone or laptop. On a laptop it shows inside a phone frame, with demo shortcuts on the left:

| Link | Scenario |
|---|---|
| Coach dashboard | Roster, progress, nudges, review queue, add a player |
| Mia | Parent of a 10-year-old who wore Youth M 15 months ago, so it asks about growth |
| Jordan | Says she's an S, no size on file. Indirect fit questions catch that she needs an M |
| Dana | Adult, same as last year. Answers are filled in, so it's one tap |

Everything is saved in the browser (localStorage), so a submit on an athlete link shows up on the coach dashboard right away. Use **Reset demo data** to start over.

## Run locally

```bash
npm install
npm run dev      # then open the printed URL; --host also lets you open it on your phone over Wi-Fi
```

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

## Deploy (GitHub Pages)

Repo → **Settings → Pages → Source: GitHub Actions**. Every push to `main` then builds and publishes to `https://<user>.github.io/<repo>/`.

## Files

```
src/
  sizing.js            flows, questions, recommendation engine
  store.js             localStorage data + seed roster
  router.js            hash routes (#/coach, #/r/<token>)
  screens/
    CoachDashboard.jsx roster + progress + nudges
    AddPlayer.jsx      add a player, preview the link they'll get
    PlayerPage.jsx     link status, or review answers + approve a size
    FitCheck.jsx       the one-screen athlete form
    Result.jsx         result + "not sure / add more info"
  components/          phone frame, chips, small helpers
```
