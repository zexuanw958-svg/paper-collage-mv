"""建一个纸艺 MV 工程。用法：
  uv run new_project.py <工程目录> <song.wav> <lyrics_timing.json> [song_info.json]
song_info.json 是 prep_audio.py --info 的输出（拿里面的 bpm 和第一拍）。工程目录必须不存在或为空。
Mac 和 Windows 通用（原来的 new_project.sh 只能在 Mac 上跑）。
"""
import json, os, shutil, subprocess, sys

# Windows 命令行默认不是 UTF-8，打印中文会报错
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8', errors='replace')

SK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USAGE = '用法：new_project.py <工程目录> <song.wav> <lyrics_timing.json> [song_info.json]'
if len(sys.argv) < 4:
    sys.exit(USAGE)
DIR, WAV, LYR = sys.argv[1:4]
INFO = sys.argv[4] if len(sys.argv) > 4 else ''
if not (os.path.isfile(WAV) and os.path.isfile(LYR)):
    sys.exit(USAGE)
if os.path.isdir(DIR) and os.listdir(DIR):
    sys.exit(f'{DIR} 不是空目录，换个名字')

shutil.copytree(os.path.join(SK, 'template'), DIR, dirs_exist_ok=True)
os.makedirs(os.path.join(DIR, 'assets', 'fonts'), exist_ok=True)
os.makedirs(os.path.join(DIR, 'out', 'check'), exist_ok=True)
for f in ('NotoSerifSC.ttf', 'NotoSerifSC-OFL.txt'):
    shutil.copy(os.path.join(SK, 'assets', 'fonts', f), os.path.join(DIR, 'assets', 'fonts'))
shutil.copy(WAV, os.path.join(DIR, 'assets', 'song.wav'))
shutil.copy(LYR, os.path.join(DIR, 'assets', 'lyrics_timing.json'))

DUR = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0',
                            os.path.join(DIR, 'assets', 'song.wav')], capture_output=True, text=True, check=True).stdout)
BPM, OFF = 120, 0
if INFO and os.path.isfile(INFO):
    info = json.load(open(INFO, encoding='utf-8'))
    BPM, OFF = info['bpm'], info['first_beat']
with open(os.path.join(DIR, 'src', 'config.js'), 'w', encoding='utf-8') as f:
    f.write('// config.js: 工程设置。duration 必须等于音频长度；bpm/offset 是 librosa 估的，DJ 版常被测成倍速或半速，自己再校。\n'
            f"const PROJECT = {{ duration: {DUR:.2f}, bpm: {BPM}, offset: {OFF}, audio: 'assets/song.wav', extraText: '' }};\n")
subprocess.run([sys.executable, os.path.join(SK, 'scripts', 'lyrics_to_js.py'), DIR], check=True)

cache = os.path.join(SK, '.cache', 'node_modules')
if os.path.isdir(os.path.join(cache, 'puppeteer-core')):
    shutil.copytree(cache, os.path.join(DIR, 'node_modules'), symlinks=True)
else:
    npm = shutil.which('npm') or sys.exit('找不到 npm：先装 Node.js 18 以上')
    subprocess.run([npm, 'install', '--no-audit', '--no-fund', '--loglevel=error'], cwd=DIR, check=True)
    shutil.copytree(os.path.join(DIR, 'node_modules'), cache, symlinks=True, dirs_exist_ok=True)
print(f'工程建好了：{DIR}（时长 {DUR:.2f}s，bpm {BPM}）')
print(f'看一眼：cd "{DIR}" && node render.mjs --sheet=0.5,2,4 --out=out/check/hello.jpg')
