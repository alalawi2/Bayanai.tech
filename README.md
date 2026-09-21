# Bayanai.tech

The Bayan AI Technologies website — a single static page with a scroll-controlled
opening film and interactive product demos. Deployed to <https://bayanai.tech>.

## Layout

| Path | What it is |
| --- | --- |
| `index.html` | Page content, navigation, and the `#app-data` JSON that drives the product demos |
| `style.css` | All styles |
| `app.js` | Scroll-driven film sequence, demo panels, navigation |
| `assets/videos/scrub/` | Opening film clips, seeked by scroll position on desktop |
| `assets/videos/m/hero.mp4` | Single autoplay opening clip used on phones |
| `assets/scenes/posters/` | First/last frames shown before and after the film |
| `assets/screens/` | Product demo screenshots (`<app>-<step>-<state>-<desktop\|mobile>.png`) |
| `assets/logos/` | Product wordmark symbols |
| `artwork/`, `brand/`, `logos/`, `screenshots/`, `social/` | Earlier brand and social assets, kept at their original URLs |

## Local preview

The scroll-controlled film seeks inside the MP4s, so the server must answer HTTP
range requests (`206 Partial Content`). Python's built-in `http.server` does not,
and the film will not seek under it. Use a server that does, for example:

```sh
npx serve -l 8080
```

Then open <http://localhost:8080>.

## Deployment

There is no build step. Vercel serves the repository root as-is (`vercel.json`
sets `buildCommand` to empty and `outputDirectory` to `.`). Pushing to `main`
publishes.

Videos must be served as `video/mp4` with byte-range support — scroll seeking
depends on it.

## History

Through September 2026 this repository held a React + TypeScript + Vite
application. It was replaced by this static site; the old source remains in the
git history before the "Replace Vite app with static scroll-film site" commit.
