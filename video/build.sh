#!/usr/bin/env bash
# Render one piece end to end: frames -> H.264, score -> WAV, then mux.
#
#   ./build.sh 01-voices 16x9          renders video, audio and the final cut
#   ./build.sh 01-voices 1x1 --no-audio  reuses the score already on disk
#
# The video is never re-encoded at the mux, so the final file carries exactly
# the frames Chromium produced.
set -euo pipefail
cd "$(dirname "$0")"

PIECE="${1:?usage: build.sh <piece> [format]}"
FORMAT="${2:-16x9}"
SCENE="scenes/${PIECE}.html"
SCORE="audio/${PIECE}.py"
STEM="out/${PIECE}-${FORMAT}"

[ -f "$SCENE" ] || { echo "no scene at $SCENE"; exit 1; }

echo "── frames ──"
node render.mjs "$SCENE" --format "$FORMAT" --out "${PIECE}-${FORMAT}"

if [ "${3:-}" != "--no-audio" ] && [ -f "$SCORE" ]; then
  echo "── score ──"
  python3 -I "$SCORE"

  # Two-pass EBU R128. -14 LUFS is where X, and every other timeline,
  # normalises to; a quieter master just gets turned up with its noise floor.
  RAW="out/${PIECE}.wav"
  MEASURED=$(ffmpeg -hide_banner -nostats -i "$RAW" \
    -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 \
    | sed -n '/^{/,/^}/p')
  II=$(echo "$MEASURED" | grep input_i | cut -d'"' -f4)
  TP=$(echo "$MEASURED" | grep input_tp | cut -d'"' -f4)
  LRA=$(echo "$MEASURED" | grep input_lra | cut -d'"' -f4)
  THRESH=$(echo "$MEASURED" | grep input_thresh | cut -d'"' -f4)
  ffmpeg -hide_banner -loglevel error -y -i "$RAW" \
    -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$II:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$THRESH:linear=true,aresample=48000" \
    -c:a pcm_s24le "out/${PIECE}-norm.wav"
fi

echo "── mux ──"
AUDIO="out/${PIECE}-norm.wav"
if [ -f "$AUDIO" ]; then
  ffmpeg -hide_banner -loglevel error -y -i "${STEM}.mp4" -i "$AUDIO" \
    -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 256k -ar 48000 \
    -movflags +faststart -shortest "${STEM}-final.mp4"
else
  cp "${STEM}.mp4" "${STEM}-final.mp4"
fi

echo "── report ──"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,nb_frames,sample_rate,channels \
  -show_entries format=duration,size,bit_rate -of default=nw=1 "${STEM}-final.mp4"
ffmpeg -hide_banner -nostats -i "${STEM}-final.mp4" -af ebur128=peak=true -f null - 2>&1 \
  | grep -A3 "Integrated loudness" | head -4
