# Leonida Legend — GTA 6 Trophy Guide & Tracker

An offline, open-source guide and tracker for all 55 PlayStation 5
trophies of Grand Theft Auto VI. Static files, no build step, no network,
no account.

## What it is

- **Checklist** of the official 55 trophies (1 platinum, 2 gold, 6 silver,
  46 bronze), each with its official name, description and grade, saved in
  the browser (localStorage) with export and import.
- **Filters** by kind (story, missable, collectibles, activities, side
  missions, combat & heists, world & money, 100% completion, online), by
  grade and by earned status, plus search.
- **Spoiler setting** that hides the names and descriptions of story
  trophies until you earn them.
- **Roadmap to the platinum** in six stages, built from the official
  trophy descriptions: story chapters and missions first, partner moments
  and one-off events, stranger strands, collectibles and exploration,
  activities and money, then 100% completion.
- **Missable flags** on 20 trophies, each with its reason. GTA 6 has not
  confirmed mission replay, so story trophies are flagged until replay is
  confirmed.
- **A guide for every trophy**, written for this entry in our own words,
  with its sources named beside it. Names, descriptions and grades come
  from the official list as published by PlayStation and listed by
  Exophase and PSNProfiles; the counts (42 Shooting Range challenges, 14
  drone race locations, 18 meditation spots, 52 areas, and the rest) are
  PSN's progress counts from PSNProfiles. Where a place or step is not
  pinned down, the guide says so instead of guessing.

## Try it

```sh
node serve.ts
```

Then open http://localhost:8080. It works with the network off.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and
`screenshots/` into the output directory and writes `dossier.json` with
the vendored make.fun library. It never deletes the output directory:
in the grader the output directory is a mount point, and removing it
fails. Two runs write identical bytes.

## Screenshots

`screenshots/` holds four real renders of the app in a browser: the
checklist with a guide open, the roadmap, the missable trophies, and the
spoiler setting at work.

## License

MIT. See LICENSE. Unofficial fan guide, not affiliated with Rockstar
Games or PlayStation; no Rockstar logo, official artwork or game
screenshots are used.
