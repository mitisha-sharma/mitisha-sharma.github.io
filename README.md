# Mitisha's World

My portfolio, as a tiny playable pixel town. Walk around, go into a building, and each one is a section of the portfolio. If you would rather not play, every page has a **Skip the game, show me the normal site** button that leads to `classic.html`, a clean one-page version of the same content.

Live site: https://mitisha-sharma.github.io/

Plain HTML, CSS and JavaScript (Canvas). No build step, no backend, no dependencies. It runs as static files on GitHub Pages.

## Run it on your computer

Any static server works. For example:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## What is where

```
index.html            the playable world map
classic.html          the normal, fast, one-page version (no game scripts)
about.html            Home
experience.html       Quest board (quest log)
projects.html         Arcade (one cabinet per project)
project-*.html        one page per project (mendia, solara, vcap, blinkmorse)
wins.html             Trophy hall
skills.html           Skill shop (collectible stickers)
education.html        School
studio.html           Editing studio (spots for reels)
play.html             Game corner (the four mini games)
contact.html          Post office
hire-me.html          secret room, opens after finding all 7 stars
404.html              page not found
resume.pdf            the "Download my resume" file (see below)
sitemap.xml, robots.txt, favicon.svg

css/style.css         shared look (colours are at the top, in :root)
css/world.css         only the map page
css/games.css         the mini games
css/classic.css       the normal version
js/config.js          EDIT ME: rooms, character sheet stats, star clues, avatar
js/avatar.js          the pixel avatar, drawn in code
js/art.js             draws the town and builds the collision map
js/world.js           the game engine (walking, doors, stars, dialogs)
js/games.js           the four mini games (words, puzzles and clips are at the top)
js/common.js          saving progress, XP, sound, dialogs (every page)
js/pages.js           small page behaviours (stickers, arcade coins, secret room)
assets/fonts/         self-hosted fonts (open licence)
assets/og.png         the picture shown when the link is shared
```

## How to edit things

**Words on a page.** Open that page's `.html` file and change the text. Places meant to be edited have `<!-- EDIT: ... -->` comments next to them.

**Resume.** `resume.pdf` is a simple placeholder made from the same content as the site (no phone number, no marks). Replace it with your own PDF using the same file name.

**Your own pixel avatar.** Draw a sprite sheet with 3 columns (standing, step A, step B) and 3 rows (facing down, up, right; left is mirrored). Save it as `assets/avatar-sheet.png`, then set `avatarSheet` and `avatarCell` in `js/config.js`. The steps are written out in that file.

**Reels and videos.** In `studio.html`, replace the `<div class="reel-slot">` for a reel with a YouTube embed or a `<video>`. Copy-paste examples are in the comment above each slot. The BlinkMorse photo or video goes in `project-blinkmorse.html` the same way.

**Character sheet numbers.** `js/config.js` (`stats`) for the pop-up in the world, and `about.html` for the static copy.

**Hidden stars.** Positions and clues are in `js/config.js`. Seven stars are hidden. Finding them all opens `hire-me.html`.

**Mini game content.** The Morse words, the five Reverse Coding puzzles and the five Edit Timeline clips are plain data near the top of each section in `js/games.js`.

**Colours.** `:root` at the top of `css/style.css`.

## Good to know

- Progress (pages visited, stars, stickers, game results, sound choice) is saved in the visitor's own browser with `localStorage`. If storage is blocked, everything still works for that visit. Footer link: "Reset my progress".
- Sound is off by default. There is a mute toggle on every page.
- Keyboard and touch both work. Movement respects the "reduce motion" setting.
- All real content is plain HTML text, not drawn on the canvas, so it is searchable and works with screen readers.
- No phone number appears anywhere on the site.
