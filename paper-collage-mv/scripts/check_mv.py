"""成片验收：时长对不对、有没有音轨、结尾响度，再出全片 contact sheet，并和定版全片上下拼成对照图。
用法（在工程目录里）：uv run <skill 目录>/scripts/check_mv.py out/<歌名>MV.mp4
Mac 和 Windows 通用（原来的 check_mv.sh 只能在 Mac 上跑）。
"""
import os, re, subprocess, sys

# Windows 命令行默认不是 UTF-8，打印「⚠」会报错
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8', errors='replace')

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = sys.argv[1] if len(sys.argv) > 1 else ''
if not os.path.isfile(F):
    sys.exit(f'找不到 {F}')


def probe(*a):
    return subprocess.run(['ffprobe', '-v', 'error', *a], capture_output=True, text=True, check=True).stdout.strip()


A = probe('-show_entries', 'format=duration', '-of', 'csv=p=0', 'assets/song.wav')
D = probe('-show_entries', 'format=duration', '-of', 'csv=p=0', F)
V = probe('-select_streams', 'v:0', '-show_entries', 'stream=duration,width,height,r_frame_rate', '-of', 'csv=p=0', F)
AU = probe('-select_streams', 'a', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', F)
vd = subprocess.run(['ffmpeg', '-hide_banner', '-ss', str(float(D) - 1.2), '-i', F, '-vn', '-af', 'volumedetect', '-f', 'null', '-'],
                    capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
m = re.search(r'max_volume: [-0-9.]* dB', vd)
TAIL = m.group(0) if m else ''
print(f'音频 {A}s | 成片 {D}s | 视频流 {V} | 音轨 {AU or "无"} | 最后 1.2 秒 {TAIL}')
if abs(float(A) - float(D)) >= 0.1:
    print('⚠ 成片时长和音频不一致')
if not AU:
    print('⚠ 成片没有音轨')

TS = ','.join(f'{x * 2 + 1:.2f}' for x in range(int(float(A) // 2)))
r = subprocess.run(['node', 'render.mjs', f'--sheet={TS}', '--cols=5', '--w=384', '--out=out/check/全片.jpg'], stdout=subprocess.DEVNULL)
if r.returncode:
    sys.exit(r.returncode)
print('全片 contact sheet：out/check/全片.jpg')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', 'out/check/全片.jpg', '-i', os.path.join(SKILL_DIR, 'assets', 'bar', '第五轮medium-全片.jpg'),
                '-filter_complex', '[0]scale=1920:-1,pad=1920:ih+24:0:0:white[a];[1]scale=1920:-1[b];[a][b]vstack', 'out/check/对照定版.jpg'], check=True)
print('和定版对照（上面是你的，下面是定版）：out/check/对照定版.jpg')
