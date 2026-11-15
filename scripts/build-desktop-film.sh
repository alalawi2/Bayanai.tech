#!/usr/bin/env bash
# Joins the three desktop opening clips (assets/videos/scrub/*.mp4) into one
# landscape film that autoplays once on desktop, like assets/videos/m/hero.mp4
# does on phones, and saves its last frame as the still shown when motion is
# reduced. After re-running, bump the ?v= on data-desktop in index.html.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/videos/scrub
OUT=assets/videos/d/hero.mp4
END=assets/scenes/posters/opening-end.jpg
FADE=0.33333 # 8 frames at 24 fps

d1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/01-world.mp4")
d2=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC/02-descent.mp4")
off1=$(awk "BEGIN{print $d1-$FADE}")
off2=$(awk "BEGIN{print $d1+$d2-2*$FADE}")

mkdir -p "$(dirname "$OUT")"
ffmpeg -v error -y \
  -i "$SRC/01-world.mp4" -i "$SRC/02-descent.mp4" -i "$SRC/03-coast-cut.mp4" \
  -filter_complex "[0:v]settb=1/24,fps=24[a];[1:v]settb=1/24,fps=24[b];[2:v]settb=1/24,fps=24[c];\
[a][b]xfade=transition=fade:duration=$FADE:offset=$off1[ab];\
[ab][c]xfade=transition=fade:duration=$FADE:offset=$off2,format=yuv420p[out]" \
  -map "[out]" -an -c:v libx264 -preset slow -crf 22 -maxrate 8M -bufsize 16M \
  -profile:v high -level 4.1 -movflags +faststart "$OUT"
ffmpeg -v error -y -sseof -0.1 -i "$OUT" -frames:v 1 -q:v 3 -update 1 "$END"

echo "$OUT: $(du -h "$OUT" | cut -f1), $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")s"
