# KentPlayerDownloader

Quick script to download videos from Kent Player (Panapto Player).

Downloads the HLS stream.

#### Install dependencies:
```
yarn
```

#### Usage:
```
yarn download --username KENT_USERNAME --password KENT_PASSWORD --stream PLAYER_URL  
```

#### Requirements:
- ffmpeg
    - (tbh i'm pretty sure we can just concatenate the .ts files, remove ffmpeg, and simplify this whole process...).

#### Todo:
- Remove axios.
- Code cleanup.
- Add support for output path.
- Add support to download playlist.

Will probably rewrite this come revision time. Just needed to watch something on the train for now.

