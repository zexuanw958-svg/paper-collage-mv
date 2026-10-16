#!/bin/zsh
# 建一个纸艺 MV 工程。用法：
#   new_project.sh <工程目录> <song.wav> <lyrics_timing.json> [song_info.json]
# song_info.json 是 prep_audio.py --info 的输出（拿里面的 bpm 和第一拍）。工程目录必须不存在或为空。
set -e
SK=${0:A:h:h}
DIR=$1; WAV=$2; LYR=$3; INFO=$4
[[ -n "$DIR" && -f "$WAV" && -f "$LYR" ]] || { echo "用法：new_project.sh <工程目录> <song.wav> <lyrics_timing.json> [song_info.json]"; exit 1; }
if [[ -d "$DIR" && -n "$(ls -A "$DIR" 2>/dev/null)" ]]; then echo "$DIR 不是空目录，换个名字"; exit 1; fi
mkdir -p "$DIR"
cp -R "$SK/template/." "$DIR/"
mkdir -p "$DIR/assets/fonts" "$DIR/out/check"
cp "$SK/assets/fonts/NotoSerifSC.ttf" "$SK/assets/fonts/NotoSerifSC-OFL.txt" "$DIR/assets/fonts/"
cp "$WAV" "$DIR/assets/song.wav"; cp "$LYR" "$DIR/assets/lyrics_timing.json"
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$DIR/assets/song.wav")
BPM=120; OFF=0
if [[ -n "$INFO" && -f "$INFO" ]]; then
  BPM=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['bpm'])" "$INFO")
  OFF=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['first_beat'])" "$INFO")
fi
printf "// config.js: 工程设置。duration 必须等于音频长度；bpm/offset 是 librosa 估的，DJ 版常被测成倍速或半速，自己再校。\nconst PROJECT = { duration: %.2f, bpm: %s, offset: %s, audio: 'assets/song.wav', extraText: '' };\n" "$DUR" "$BPM" "$OFF" > "$DIR/src/config.js"
python3 "$SK/scripts/lyrics_to_js.py" "$DIR"
cd "$DIR"
if [[ -d "$SK/.cache/node_modules/puppeteer-core" ]]; then cp -R "$SK/.cache/node_modules" ./node_modules
else npm install --no-audit --no-fund --loglevel=error && mkdir -p "$SK/.cache" && cp -R node_modules "$SK/.cache/" ; fi
echo "工程建好了：$DIR（时长 ${DUR}s，bpm $BPM）"
echo "看一眼：cd \"$DIR\" && node render.mjs --sheet=0.5,2,4 --out=out/check/hello.jpg"
