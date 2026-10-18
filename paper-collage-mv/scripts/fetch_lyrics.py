# /// script
# requires-python = ">=3.10"
# dependencies = []
# ///
"""从网易云音乐取歌词（LRC），存成「一行一句、行首带原曲时间戳」的 LRC 文本。

用法：
  uv run fetch_lyrics.py --name 沉溺                       # 按歌名搜，列出候选，默认取第一首
  uv run fetch_lyrics.py --name 沉溺 --artist 邹沛沛 --out lyrics.txt
  uv run fetch_lyrics.py --query 比昨天更想你 --out lyrics.txt  # 不知道歌名时，用听写出的一句歌词搜
  uv run fetch_lyrics.py --id 2034187125 --out lyrics.txt   # 已知歌曲 id

输出的 lyrics.txt 是整首歌的歌词，片段里唱到哪几句由 lyrics_timing.py 自动挑。
行首的 [mm:ss.xx] 是原曲时间：lyrics_timing.py 会拟合「片段时间 = (原曲时间 − 偏移) ÷ 倍速」，
片段是加速版 / DJ 版时也能借原曲时间轴给听写听不出的句子定位。时间戳对不上（翻唱、改编）时它会自动不用。
DJ 版 / 加速版的歌词和原唱一样，优先取原唱（时间戳最准）。
"""
import argparse, json, os, re, sys, urllib.parse, urllib.request

# Windows 命令行默认不是 UTF-8，打印中文和符号会报错
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, 'reconfigure'):
        _s.reconfigure(encoding='utf-8', errors='replace')

UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'Referer': 'https://music.163.com'}
CREDIT = re.compile(r'^\s*(作词|作曲|编曲|制作|出品|混音|监制|和声|吉他|贝斯|鼓|录音|母带|人声|发行|策划|统筹|OP|SP|词|曲|演唱|原唱|翻唱|后期|弦乐|键盘|钢琴|配唱|企划|版权|特别鸣谢|Produced|Lyrics|Composer|Arranger)\b.*[:：]', re.I)


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15) as r:
        return json.loads(r.read().decode('utf-8'))


def search(q, kind):
    url = 'https://music.163.com/api/search/get/web?' + urllib.parse.urlencode({'s': q, 'type': kind, 'limit': 10})
    return (get(url).get('result') or {}).get('songs') or []


def clean_lines(lrc):
    out = []
    for raw in lrc.splitlines():
        stamps = re.findall(r'\[(\d+):(\d+(?:\.\d+)?)\]', raw)
        text = re.sub(r'\[[^\]]*\]', '', raw).strip()
        if not text or CREDIT.match(text) or re.match(r'^[^:：]{1,16}\s[:：]\s', text) or '著作权' in text:
            continue
        text = re.sub(r'^\s*[(（]?[\u4e00-\u9fffA-Za-z&/ ]{1,10}[)）]?\s*[:：]\s*(?=\S)', '', text)   # 去掉「男：」「飞：」「Pank:」这类唱段标记
        text = re.sub(r'(?<=[\u4e00-\u9fff])\s+(?=[\u4e00-\u9fff])', ' ', text).strip()
        if re.search(r'[\u4e00-\u9fffA-Za-z]', text):
            for m, sec in (stamps or [(None, None)]):   # 一行多个时间戳（重复的副歌）就展开成多行
                out.append(((int(m) * 60 + float(sec)) if m is not None else None, text))
    out.sort(key=lambda x: (x[0] is None, x[0] or 0))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name'); ap.add_argument('--artist', default='')
    ap.add_argument('--query', help='用一句歌词搜'); ap.add_argument('--id', type=int)
    ap.add_argument('--pick', type=int, default=0, help='取第几个候选（从 0 数）')
    ap.add_argument('--out')
    a = ap.parse_args()
    sid = a.id
    if not sid:
        songs = search(f'{a.name} {a.artist}'.strip(), 1) if a.name else search(a.query, 1006)
        if not songs:
            sys.exit('没搜到，换个写法（去掉括号、加歌手名），或者用 --query 搜一句歌词')
        for i, s in enumerate(songs):
            print(f"[{i}] id={s['id']}  {s['name']}  —  {'/'.join(x['name'] for x in s.get('artists', []))}  {s.get('duration', 0) / 1000:.0f}s")
        sid = songs[a.pick]['id']
        print(f'→ 取 [{a.pick}] id={sid}')
    d = get(f'https://music.163.com/api/song/lyric?id={sid}&lv=1&kv=1&tv=-1')
    lines = clean_lines((d.get('lrc') or {}).get('lyric', ''))
    if not lines:
        sys.exit('这首没有歌词（可能是纯音乐或歌词缺失），换一个候选 --pick N')
    text = '\n'.join((f'[{int(t // 60):02d}:{t % 60:05.2f}]' if t is not None else '') + l for t, l in lines) + '\n'
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        open(a.out, 'w', encoding='utf-8').write(text)
        print(f'wrote {a.out}  ({len(lines)} 行)')
    print(text)


if __name__ == '__main__':
    main()
