#!/bin/zsh
# 成片验收：时长对不对、有没有音轨、结尾响度，再出全片 contact sheet，并和定版全片上下拼成对照图。
# 用法（在工程目录里）：check_mv.sh out/<歌名>MV.mp4
set -e
SKILL_DIR=${0:A:h:h}
F=$1; [[ -f "$F" ]] || { echo "找不到 $F"; exit 1; }
A=$(ffprobe -v error -show_entries format=duration -of csv=p=0 assets/song.wav)
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
V=$(ffprobe -v error -select_streams v:0 -show_entries stream=duration,width,height,r_frame_rate -of csv=p=0 "$F")
AU=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$F")
TAIL=$(ffmpeg -hide_banner -ss $(echo "$D - 1.2" | bc) -i "$F" -vn -af volumedetect -f null - 2>&1 | grep -o 'max_volume: [-0-9.]* dB' || true)
echo "音频 ${A}s | 成片 ${D}s | 视频流 $V | 音轨 ${AU:-无} | 最后 1.2 秒 $TAIL"
python3 -c "import sys; a,d=float(sys.argv[1]),float(sys.argv[2]); sys.exit(0 if abs(a-d)<0.1 else 1)" "$A" "$D" || echo "⚠ 成片时长和音频不一致"
[[ -n "$AU" ]] || echo "⚠ 成片没有音轨"
TS=$(python3 -c "import sys; d=float(sys.argv[1]); print(','.join(f'{t:.2f}' for t in [x*2+1 for x in range(int(d//2))]))" "$A")
node render.mjs --sheet=$TS --cols=5 --w=384 --out=out/check/全片.jpg >/dev/null && echo "全片 contact sheet：out/check/全片.jpg"
ffmpeg -v error -y -i out/check/全片.jpg -i "$SKILL_DIR/assets/bar/第五轮medium-全片.jpg" \
  -filter_complex "[0]scale=1920:-1,pad=1920:ih+24:0:0:white[a];[1]scale=1920:-1[b];[a][b]vstack" out/check/对照定版.jpg \
  && echo "和定版对照（上面是你的，下面是定版）：out/check/对照定版.jpg"
