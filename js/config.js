/* ==========================================================================
   MITISHA'S WORLD  |  js/config.js
   The one file to edit for the GAME side of the site.
   (The words on each page live in that page's own .html file.)

   What you can change here:
   - links and email used by the games
   - the list of rooms (used by the XP system and the "plain links" list)
   - the character sheet stats
   - the XP level names
   - the clues for the 7 hidden stars
   - your own pixel avatar (see AVATAR below)
   ========================================================================== */
window.MW = window.MW || {};

MW.config = {
  site: 'https://mitisha-sharma.github.io',
  email: 'sharmamitisha2005@gmail.com',

  /* ---- AVATAR --------------------------------------------------------------
     By default the avatar is drawn in code (see js/avatar.js).
     To use your own pixel art instead:
       1. Draw a sprite sheet in any pixel editor (Piskel, Aseprite, etc).
       2. Layout: 3 columns x 3 rows of equal cells.
            columns: standing, step A, step B
            rows:    facing down, facing up, facing right (left is mirrored)
       3. Save it as assets/avatar-sheet.png
       4. Set avatarSheet below to 'assets/avatar-sheet.png' and set
          avatarCell to the size of ONE cell, for example { w: 16, h: 23 }.
     Leave avatarSheet as null to keep the built-in avatar.
  ------------------------------------------------------------------------- */
  avatarSheet: null,
  avatarCell: { w: 16, h: 23 },

  /* ---- ROOMS ---------------------------------------------------------------
     Visiting a room's page for the first time gives +10 XP.
     id must match the data-room attribute on that page's <body>.
  ------------------------------------------------------------------------- */
  rooms: [
    { id: 'about',      file: 'about.html',      name: 'Home',           title: 'About me',   blurb: 'Who I am and where I am from.' },
    { id: 'experience', file: 'experience.html', name: 'Quest board',    title: 'Experience', blurb: 'Four roles, shown as a quest log with levels.' },
    { id: 'projects',   file: 'projects.html',   name: 'Arcade',         title: 'Projects',   blurb: 'Four projects, one arcade cabinet each.' },
    { id: 'wins',       file: 'wins.html',       name: 'Trophy hall',    title: 'Wins',       blurb: 'Things I won and badges I earned.' },
    { id: 'skills',     file: 'skills.html',     name: 'Skill shop',     title: 'Skills',     blurb: 'My skills as stickers you can collect.' },
    { id: 'education',  file: 'education.html',  name: 'School',         title: 'Education',  blurb: 'VIT Vellore, B.Tech CSE.' },
    { id: 'studio',     file: 'studio.html',     name: 'Editing studio', title: 'Studio',     blurb: 'A corner for my video edits and reels.' },
    { id: 'play',       file: 'play.html',       name: 'Game corner',    title: 'Play',       blurb: 'Four little games based on things I did.' },
    { id: 'contact',    file: 'contact.html',    name: 'Post office',    title: 'Contact',    blurb: 'Email, LinkedIn, GitHub, Instagram and my resume.' }
  ],

  /* ---- CHARACTER SHEET ----------------------------------------------------
     My resume numbers, shown as game stats.
  ------------------------------------------------------------------------- */
  sheet: {
    name: 'Mitisha Sharma',
    cls: 'Student, analyst, organiser',
    home: 'Indore',
    guild: 'VIT Vellore, B.Tech CSE, 2023 to 2027',
    sideQuest: 'Video editing'
  },
  stats: [
    { label: 'Clubs managed',        value: '10' },
    { label: 'Secretaries trained',  value: '20' },
    { label: 'Compliance raised',    value: '+15%' },
    { label: 'Teams beaten',         value: '150+' },
    { label: 'Streak',               value: 'shipping things' },
    { label: 'Students reached',     value: '200+' },
    { label: 'Prompt precision',     value: '+25%' },
    { label: 'Data sources analysed', value: '3' }
  ],

  /* ---- XP ------------------------------------------------------------------
     Every 60 XP is one level. Names are shown in the XP chip.
  ------------------------------------------------------------------------- */
  xpPerLevel: 60,
  levelNames: ['just arrived', 'wandering', 'snooping around', 'regular', 'local legend', 'town mayor', 'final boss (friendly)'],

  /* ---- HIDDEN STARS --------------------------------------------------------
     x and y are in tiles (16 px each) on the world map.
     Do not move these unless you also check the star can be reached.
  ------------------------------------------------------------------------- */
  stars: [
    { id: 's1', x: 1.5,  y: 5.5,  clue: 'Behind my house, where the garden meets the trees.' },
    { id: 's2', x: 19.0, y: 1.5,  clue: 'Along the top edge, above the arcade roof.' },
    { id: 's3', x: 34.0, y: 11.0, clue: 'On the far east path, tucked beside the hedge.' },
    { id: 's4', x: 8.5,  y: 19.0, clue: 'In the flower patch just east of the school door.' },
    { id: 's5', x: 10.5, y: 24.5, clue: 'On the path beside the pond, on its west bank.' },
    { id: 's6', x: 14.0, y: 19.0, clue: 'In the town square, close to the lamp post.' },
    { id: 's7', x: 33.5, y: 28.0, clue: 'The very bottom right corner of the map.' }
  ]
};
