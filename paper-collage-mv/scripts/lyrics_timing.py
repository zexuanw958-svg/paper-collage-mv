# /// script
# requires-python = ">=3.11,<3.12"
# dependencies = ["torch==2.5.1", "torchaudio==2.5.1", "demucs", "soundfile", "numpy<2", "librosa", "pypinyin", "mlx-whisper", "zhconv", "jieba"]
# ///
"""歌曲片段 → 每个字的开唱时间（lyrics_timing.json）。

用法：
  uv run lyrics_timing.py --audio assets/song.wav --lyrics lyrics.txt --out assets/lyrics_timing.json [--title 歌名]
  uv run lyrics_timing.py --audio assets/song.wav --transcribe-only      # 还没有歌词时，先看 whisper 听写

lyrics.txt 一行一句，可以是整首歌（fetch_lyrics.py 取来的），脚本会自动挑出片段里唱到的那几句；
片段从半句开始或在半句结束时，会把没唱到的字裁掉。

做法：Demucs 分出人声 → whisper 听写两遍（带歌词提示、不带提示），按拼音和歌词匹配，估出每句的大致位置
→ MMS_FA 逐句开窗强制对齐 → 每个字贴到最近的人声起音点（0.12 秒内）。
副歌和声重时 MMS_FA 容易漂：对齐分低于 0.25、又和听写差 0.4 秒以上的句子，先看人声包络（哪个句首前面有换气的静音
就信哪个），看不出来就取更早的那个（宁早勿晚，source=听写估）。
句内人声真的停了 --split-gap 秒以上、且停在词边界上的，拆成两行。打印的表里「⚠」行要复核：看 vocals.wav 那一段的响度包络（--env）。
"""
import argparse, difflib, json, os, re, subprocess, sys
import numpy as np

UNIT = re.compile(r"[A-Za-z']+|[一-鿿]")


def units(s):
    return UNIT.findall(s)


def syllables(us):
    """每个 unit 的无声调拼音（英文词原样小写），按词组上下文取多音字读音。"""
    from pypinyin import lazy_pinyin, Style
    out, i = [], 0
    while i < len(us):
        if us[i].isascii():
            out.append(us[i].lower()); i += 1; continue
        j = i
        while j < len(us) and not us[j].isascii():
            j += 1
        py = lazy_pinyin(''.join(us[i:j]), style=Style.NORMAL, errors='ignore')
        if len(py) != j - i:
            py = [(lazy_pinyin(c, style=Style.NORMAL) or ['a'])[0] for c in us[i:j]]
        out += [p.replace('ü', 'v') for p in py]; i = j
    return out


def separate(audio, work):
    stem = os.path.splitext(os.path.basename(audio))[0]
    out = os.path.join(work, 'htdemucs', stem, 'vocals.wav')
    if not os.path.exists(out):
        print('· Demucs 分离人声（CPU，约 30–60 秒）')
        subprocess.run([sys.executable, '-m', 'demucs', '-d', 'cpu', '--shifts', '0', '--two-stems=vocals', '-n', 'htdemucs', '-o', work, audio],
                       check=True, stdout=subprocess.DEVNULL)
    return out


def transcribe(vocals, prompt, lang='zh'):
    import mlx_whisper, zhconv
    res = mlx_whisper.transcribe(vocals, path_or_hf_repo='mlx-community/whisper-large-v3-turbo', language=lang,
                                 word_timestamps=True, initial_prompt=prompt or None, condition_on_previous_text=False, temperature=0.0)
    rec, segs = [], []
    for seg in res['segments']:
        segs.append((seg['start'], seg['end'], zhconv.convert(seg['text'], 'zh-cn').strip()))
        for w in seg.get('words', []):
            us = units(zhconv.convert(w['word'], 'zh-cn'))
            if not us:
                continue
            d = (w['end'] - w['start']) / len(us)
            for k, u in enumerate(us):
                rec.append((u, w['start'] + k * d))
    return rec, segs


def match(L, rec):
    """L: 每行的拼音列表；rec: [(unit, t)]。找片段唱到的连续几行，返回 (起行, 止行, {(行, 字): t})。"""
    R = syllables([u for u, _ in rec]); T = [t for _, t in rec]
    best = None
    for s in range(len(L)):
        canon, owner, e = [], [], s
        while e < len(L) and len(canon) < len(R) * 1.25 + 4:
            canon += L[e]; owner += [(e, k) for k in range(len(L[e]))]; e += 1
        sm = difflib.SequenceMatcher(None, canon, R, autojunk=False)
        m = sum(b.size for b in sm.get_matching_blocks())
        if best is None or m > best[0]:
            best = (m, s, e, owner, sm)
    _, s, e, owner, sm = best
    hit = {}
    for b in sm.get_matching_blocks():
        for j in range(b.size):
            hit[owner[b.a + j]] = T[b.b + j]
    return s, e, hit


def priors(span, dur):
    """用听写命中的字估每句的句首：t_k - k × 字距。没命中的句子按字数在前后句之间插值。"""
    steps = []
    for _, _, hits in span:
        hk = sorted(hits.items())
        for (k1, t1), (k2, t2) in zip(hk, hk[1:]):
            if 0 < (t2 - t1) / (k2 - k1) < .8:
                steps.append((t2 - t1) / (k2 - k1))
    cp = float(np.median(steps)) if steps else .25
    est = [float(np.median([t - k * cp for k, t in hits.items()])) if hits else None for _, _, hits in span]
    n = [len(ks) for _, ks, _ in span]
    for i in range(len(est)):
        if est[i] is None:
            p = next((j for j in range(i - 1, -1, -1) if est[j] is not None), None)
            q = next((j for j in range(i + 1, len(est)) if est[j] is not None), None)
            if p is not None and q is not None:
                est[i] = est[p] + (est[q] - est[p]) * sum(n[p:i]) / max(1, sum(n[p:q]))
            elif p is not None:
                est[i] = est[p] + sum(n[p:i]) * cp * 1.3
            else:
                est[i] = max(0.0, est[q] - sum(n[i:q]) * cp * 1.3) if q is not None else 0.0
    return [min(max(0.0, x), dur) for x in est], cp


def lrc_fit(pts):
    """拟合 片段时间 = k × 原曲时间 + b（加速版 k > 1）。pts = [(原曲时间, 片段里观测到的句首)]，RANSAC 去掉错配。"""
    from itertools import combinations
    best = None
    for (x1, y1), (x2, y2) in combinations(pts, 2):
        if abs(x2 - x1) < 2 or y2 == y1:
            continue
        k = (y2 - y1) / (x2 - x1)
        if not .6 < k < 1.7:
            continue
        b = y1 - k * x1
        inl = [(x, y) for x, y in pts if abs(k * x + b - y) < .35]
        if best is None or len(inl) > len(best):
            best = inl
    if not best or len(best) < max(4, .4 * len(pts)):
        return None
    xs, ys = np.array(best).T
    k, b = np.linalg.lstsq(np.vstack([xs, np.ones_like(xs)]).T, ys, rcond=None)[0]
    return float(k), float(b), float(np.median(np.abs(k * xs + b - ys))), len(best), len(pts), float(ys.max() - ys.min())


def from_hits(hits, n, cp):
    """只用听写时间给一句的每个字定时：命中的字用听写时间，中间线性插值，两头按字距外推。"""
    hk = sorted(hits.items())
    ts = [None] * n
    for k, t in hk:
        ts[k] = t
    for i in range(n):
        if ts[i] is None:
            p = next(((j, ts[j]) for j in range(i - 1, -1, -1) if ts[j] is not None), None)
            q = next(((j, ts[j]) for j in range(i + 1, n) if ts[j] is not None), None)
            if p and q:
                ts[i] = p[1] + (q[1] - p[1]) * (i - p[0]) / (q[0] - p[0])
            elif p:
                ts[i] = p[1] + (i - p[0]) * cp
            else:
                ts[i] = q[1] - (q[0] - i) * cp
    for i in range(1, n):   # 保证递增
        ts[i] = max(ts[i], ts[i - 1] + .05)
    return ts


class Aligner:
    def __init__(self, vocals):
        import torch, torchaudio
        self.torch, self.ta = torch, torchaudio
        b = torchaudio.pipelines.MMS_FA
        self.model = b.get_model(with_star=True); self.D = b.get_dict(star='*'); self.SR = b.sample_rate
        wav, sr = torchaudio.load(vocals)
        self.wav = torchaudio.functional.resample(wav.mean(0, keepdim=True), sr, self.SR)
        self.dur = self.wav.size(1) / self.SR

    def align(self, words, a, b):
        """在 [a, b] 秒的窗里对齐一句（words 是拼音/英文词列表），返回 [(start, end, score)]。"""
        torch, ta = self.torch, self.ta
        if b - a < .3:
            return None
        seg = self.wav[:, int(a * self.SR):int(b * self.SR)]
        with torch.inference_mode():
            em, _ = self.model(seg)
        words = [''.join(c for c in w if c in self.D) or 'a' for w in words]
        toks = [[self.D['*']]] + [[self.D[c] for c in w] for w in words] + [[self.D['*']]]
        flat = [t for w in toks for t in w]
        if len(flat) > em.size(1):
            return None
        ali, sc = ta.functional.forced_align(em, torch.tensor([flat], dtype=torch.int32))
        spans = ta.functional.merge_tokens(ali[0], sc[0].exp())
        ratio = seg.size(1) / em.size(1) / self.SR
        out, k = [], 0
        for gi, w in enumerate(toks):
            g = spans[k:k + len(w)]; k += len(w)
            if 0 < gi < len(toks) - 1:
                out.append((a + g[0].start * ratio, a + g[-1].end * ratio, float(np.mean([x.score for x in g]))))
        return out


def onsets(vocals):
    import librosa
    y, sr = librosa.load(vocals, sr=22050, mono=True)
    return librosa.onset.onset_detect(y=y, sr=sr, units='time', backtrack=True, delta=.03)


def snap(ts, on, lo, hi, win=.12):
    ts = list(ts)
    for i in range(len(ts)):
        if not len(on):
            break
        j = int(np.argmin(np.abs(on - ts[i])))
        a = ts[i - 1] + .04 if i else lo
        b = ts[i + 1] - .04 if i + 1 < len(ts) else hi
        if abs(on[j] - ts[i]) <= win and a <= on[j] <= b:
            ts[i] = float(on[j])
    return ts


class Env:
    """人声响度（20ms 一格），用来判断「这里前面有没有换气的静音」和「句中是不是真停了」。"""
    def __init__(self, vocals):
        import soundfile as sf
        y, sr = sf.read(vocals); y = y.mean(1) if y.ndim > 1 else y; hop = int(.02 * sr); n = len(y) // hop
        self.db = 20 * np.log10(np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)

    def at(self, a, b):
        i, j = max(0, int(a / .02)), max(int(a / .02) + 1, int(b / .02))
        return self.db[i:j]

    def entry(self, t):
        """t 处像不像一句的开头：前 0.16 秒有静音、后 0.1 秒响起来。"""
        q, r = self.at(t - .16, t - .01), self.at(t, t + .1)
        return bool(len(q) and len(r) and q.min() < -40 and r.max() > -26)

    def voiced(self, a, b, thr=-32):
        """[a, b] 里有人声的秒数。"""
        return float((self.at(a, b) > thr).sum() * .02)

    def next_voice(self, t, thr=-30):
        """t 之后第一次持续 0.1 秒有人声的时间。"""
        d = self.db; i = max(0, int(t / .02))
        while i + 5 < len(d):
            if (d[i:i + 5] > thr).all():
                return i * .02
            i += 1
        return t

    def quiet_run(self, a, b, thr=-36):
        best = cur = 0
        for v in self.at(a, b):
            cur = cur + 1 if v < thr else 0; best = max(best, cur)
        return best * .02


def envelope(vocals, a, b):
    import soundfile as sf
    y, sr = sf.read(vocals); y = y.mean(1) if y.ndim > 1 else y; hop = int(.02 * sr)
    for t in np.arange(a, b, .02):
        s = y[int(t * sr):int(t * sr) + hop]; db = 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-9)
        print(f'{t:6.2f} {db:6.1f} ' + '#' * max(0, int((db + 50) / 1.5)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--audio', required=True); ap.add_argument('--lyrics'); ap.add_argument('--out')
    ap.add_argument('--title', default=''); ap.add_argument('--work', default='.lyrics_work')
    ap.add_argument('--split-gap', type=float, default=.3, help='句内停顿超过这个秒数就拆行（0 = 不拆）')
    ap.add_argument('--transcribe-only', action='store_true')
    ap.add_argument('--lang', default='zh', help='听写语言。一大段对不上时，用 --transcribe-only --lang en 再听一遍（抖音 DJ 版常在中间接一段英文说唱）')
    ap.add_argument('--env', help='打印人声响度包络，例如 --env 36.2:37.4（复核 ⚠ 行用：开唱处响度会突然抬升）')
    a = ap.parse_args()
    os.makedirs(a.work, exist_ok=True)
    vocals = separate(a.audio, a.work)
    if a.env:
        envelope(vocals, *map(float, a.env.split(':'))); return
    LT, lines = [], []
    for l in (open(a.lyrics, encoding='utf-8') if a.lyrics else []):
        m = re.match(r'^\s*\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$', l.strip())
        t, text = (int(m[1]) * 60 + float(m[2]), m[3]) if m else (None, l.strip())
        if units(text):
            LT.append(t); lines.append(text)
    print('· whisper 听写人声（两遍）')
    rec_p, segs = transcribe(vocals, '，'.join(lines)[:180] if lines and a.lang == 'zh' else '', a.lang)
    if a.transcribe_only or not lines:
        print('\n听写结果（只作参考，同音字常错；用其中一句去 fetch_lyrics.py --query 搜原词）：')
        for s, e, t in segs:
            print(f'  {s:6.2f}–{e:6.2f}  {t}')
        if not lines:
            print('\n没有 --lyrics：先取到正确歌词再跑。')
        return
    rec_n, _ = transcribe(vocals, '')

    AL = Aligner(vocals); dur = AL.dur
    LU = [units(l) for l in lines]; LS = [syllables(u) for u in LU]
    # 两遍听写各自匹配；对上字多的那遍定范围，另一遍只在范围内、时间相差 1.5 秒以内时补充命中
    (s1, e1, h1), (s2, e2, h2) = match(LS, rec_p), match(LS, rec_n)
    if len(h2) > len(h1):
        h1, h2 = h2, h1
    got = sorted({li for li, _ in h1})
    if not got:
        sys.exit('歌词和听写对不上：确认 lyrics.txt 是这首歌，或者先 --transcribe-only 看听写')
    # 范围两头只认「命中至少 2 个字、或命中过半」的行，防止幻听的零星字把范围拉长
    solid = [li for li in got if (n_hit := sum(1 for (l2, _) in h1 if l2 == li)) >= 2 or n_hit >= len(LU[li]) / 2]
    lo_l, hi_l = (solid[0], solid[-1]) if solid else (got[0], got[-1])
    hit = {}
    for (li, k), t in h1.items():
        if lo_l <= li <= hi_l:
            hit[(li, k)] = [t]
    for (li, k), t in h2.items():
        if lo_l <= li <= hi_l:
            near = [v[0] for (l2, _), v in hit.items() if l2 == li]
            if not near or abs(t - float(np.median(near))) < 1.5:
                hit.setdefault((li, k), []).append(t)
    hit = {k: float(np.median(v)) for k, v in hit.items()}
    span = []
    for li in range(lo_l, hi_l + 1):
        ks = list(range(len(LU[li])))
        hk = [k for k in ks if (li, k) in hit]
        if li == lo_l and hk and hk[0] >= 2 and hit[(li, hk[0])] < 1.0:
            ks = ks[hk[0]:]   # 片段从半句开始
        if li == hi_l and hk and len(ks) - 1 - hk[-1] >= 2 and hit[(li, hk[-1])] > dur - 1.5:
            ks = ks[:hk[-1] + 1]   # 片段在半句结束
        span.append((li, ks, {ks.index(k): hit[(li, k)] for k in hk if k in ks}))
    ENV = Env(vocals); on = onsets(vocals)
    base_span = list(span)
    pri0, cp = priors(span, dur)

    def run(span, pri, lrc, strong, n_anchor):
        rows, prev_end, last_t = [], 0.0, -1.0
        for i, (li, ks, hits) in enumerate(span):
            us = [LU[li][k] for k in ks]; wd = [LS[li][k] for k in ks]; n = len(us)
            if i >= n_anchor and lrc is None:   # 听写没覆盖到的尾段：从上一句之后第一次出现人声的地方开始找
                pri[i] = ENV.next_voice(max(last_t + .15, prev_end))
                if pri[i] >= dur - .3 or ENV.voiced(max(last_t + .15, prev_end), dur) < .3:
                    break   # 后面没人声了，歌词到此为止
            elif not hits and lrc is None:   # 听写一个字都没对上的短句（常见于英文、和声）：取上一句之后第一次出现人声的地方
                nv = ENV.next_voice(max(last_t + .15, prev_end))
                if nv < pri[i] + 1.0:
                    pri[i] = nv
            nxt = pri[i + 1] if i + 1 < len(pri) and pri[i + 1] is not None else (dur if i + 1 >= len(pri) else pri[i] + n * cp * 2.2 + .8)
            lo = max(prev_end - .05, pri[i] - .8, last_t + .12, 0.0)
            hi = min(dur, max(nxt + .5, lo + n * cp * 1.5 + .5))
            res = AL.align(wd, lo, hi)
            sc = float(np.mean([x[2] for x in res])) if res else 0.0
            frac = len(hits) / max(1, n)
            flags = []
            ts_w = from_hits(hits, n, cp) if hits else None
            if not res and ts_w is None:   # 窗太短又没听写：按字距从估的句首铺开
                ts_w = [pri[i] + k * cp for k in range(n)]
            use_fa, alt = bool(res), '听写估'
            far = lambda x: abs(x - lrc[i]) > .5
            cand_start = res[0][0] if res else (ts_w[0] if ts_w else None)
            split = bool(res) and ts_w is not None and abs(res[0][0] - ts_w[0]) > .4
            if lrc and lrc[i] is not None and ((sc < .25 and frac < .3) or (strong and cand_start is not None and (far(cand_start) or split))):
                # 听写在这句失灵、或者对齐和听写各说各的，又有可靠的时间轴：只信离时间轴 0.4 秒以内的句首（都在就取早的）；都不在就按时间轴铺
                opts = ([('FA', res[0][0])] if res else []) + ([('听写估', ts_w[0])] if hits else [])
                near = [o for o in opts if abs(o[1] - lrc[i]) <= .4]
                if near:
                    use_fa = min(near, key=lambda o: o[1])[0] == 'FA'   # 都在时间轴附近时取更早的（宁早勿晚）
                else:
                    use_fa = False
                    end_cap = (lrc[i + 1] - .15) if i + 1 < len(lrc) and lrc[i + 1] is not None else min(dur, lrc[i] + n * cp * 1.6)
                    step = min(cp * 1.15, max(.08, (end_cap - lrc[i]) / max(1, n)))
                    ts_w, alt = [lrc[i] + k2 * step for k2 in range(n)], '时间轴估'
            elif res and ts_w is not None and sc < .25 and frac >= .3 and abs(res[0][0] - ts_w[0]) > .4:
                # 没有时间轴：哪个句首前面有换气的静音就信哪个，看不出来就取更早的（宁早勿晚）
                ef, ew = ENV.entry(res[0][0]), ENV.entry(ts_w[0])
                use_fa = ef and not ew if ef != ew else res[0][0] <= ts_w[0]
            if use_fa:
                ts, ends, src = snap([x[0] for x in res], on, lo, hi), [x[1] for x in res], 'FA'
                if sc < .12:
                    flags.append(f'对齐分很低 {sc:.2f}')
            else:
                ts = snap(ts_w, on, max(0, ts_w[0] - .2), min(dur, ts_w[-1] + .3), win=.1)
                ends = [t2 - .02 for t2 in ts[1:]] + [ts[-1] + cp]
                src = alt
                flags.append(f'按{alt}（对齐分 {sc:.2f}' + (f'，对齐给的句首 {res[0][0]:.2f}' if res else '') + '）')
            if i >= n_anchor and lrc is None:
                flags.append('听写没覆盖，只靠对齐')
            elif frac < .3:
                flags.append(f'听写只对上 {frac:.0%}')
            if abs(ts[0] - pri[i]) > .8:
                flags.append(f'和听写估的句首 {pri[i]:.2f} 差 {ts[0] - pri[i]:+.2f}s')
            ts = [max(t, last_t + .12) if k == 0 else t for k, t in enumerate(ts)]
            for k2 in range(1, n):
                ts[k2] = max(ts[k2], ts[k2 - 1] + .06)
            if n > 1 and ts[-1] - ts[0] < n * .09:   # 挤成一团：按字距重新铺开
                ts = [ts[0] + k2 * cp for k2 in range(n)]; flags.append('字挤在一起，已按字距铺开')
            prev_end, last_t = max(prev_end, ends[-1] - .3), ts[-1]
            # earliest：几路来源里最早、又不离谱（0.8 秒内）的句首，给字幕「宁早勿晚」用
            sure = sc >= .25 or ENV.entry(ts[0])
            cands = [ts[0]] if sure else [ts[0], pri[i]] + ([ts_w[0]] if ts_w else [])
            earliest = min(c for c in cands if c > ts[0] - .8)
            if ts[0] >= dur - .15:
                break
            rows.append({'chars': [{'c': c, 't': round(t, 2)} for c, t in zip(us, ts)], 'ends': ends,
                         'earliest': round(max(0.0, earliest), 2), 'source': src, 'score': round(sc, 2),
                         'lrc_line': li + 1, 'flags': flags})
        return rows

    # 第一遍：只靠听写定位（听写覆盖不到的尾段按人声活动往后接）
    span1, pri1 = list(base_span), list(pri0)
    tail_from = pri1[-1] + len(span1[-1][1]) * cp
    while span1[-1][0] + 1 < len(LU) and ENV.voiced(tail_from, dur - .2) >= .8:
        li = span1[-1][0] + 1; span1.append((li, list(range(len(LU[li]))), {})); tail_from += len(LU[li]) * cp * 1.2
    pri1 += [None] * (len(span1) - len(pri1))
    rows = run(span1, pri1, None, False, len(base_span))
    # 第二遍：歌词带原曲时间戳时，用第一遍里对得稳的句首（加上听写命中多的句子）拟合时间轴，按时间轴再对一遍
    obs = {r['lrc_line'] - 1: r['chars'][0]['t'] for r in rows if r['source'] == 'FA' and r['score'] >= .2}
    for (li, ks, hits), p in zip(base_span, pri0):
        if li not in obs and len(hits) >= 2:
            obs[li] = p
    fit = lrc_fit([(LT[li], y) for li, y in obs.items() if LT[li] is not None]) if any(t is not None for t in LT) else None
    if fit and fit[2] < .15:
        def lrc_pass(fit):
            k, b, med, n_in, n_pt, spread = fit
            P = lambda li: k * LT[li] + b if LT[li] is not None else None
            span2 = list(base_span); lo2, hi2 = span2[0][0], span2[-1][0]
            while lo2 > 0 and P(lo2 - 1) is not None and P(lo2 - 1) > -.3 and ENV.voiced(max(0, P(lo2 - 1)), max(0, P(lo2 - 1)) + .6) >= .2:
                lo2 -= 1; span2.insert(0, (lo2, list(range(len(LU[lo2]))), {}))
            # 按时间轴往后补句：预测的位置上真有人声才补（片段结尾常被硬切或淡出，时间轴会预测出没唱的句子）
            while hi2 + 1 < len(LU) and P(hi2 + 1) is not None and P(hi2 + 1) < dur - .3 and ENV.voiced(P(hi2 + 1) - .1, min(dur, P(hi2 + 1) + .5)) >= .2:
                hi2 += 1; span2.append((hi2, list(range(len(LU[hi2]))), {}))
            lrc = [P(li) for li, _, _ in span2]
            p2, _ = priors(span2, dur)
            # 拟合点要铺满大半个片段才算「强」：只靠主歌外推，到副歌斜率差一点就会漂
            strong = med < .1 and spread >= .6 * dur
            return run(span2, [l if l is not None else p for l, p in zip(lrc, p2)], lrc, strong, len(span2))
        for it in range(3):
            k, b, med, n_in, n_pt, spread = fit
            print(f'· 歌词时间轴（第 {it + 1} 次拟合）：片段时间 = {k:.3f} × 原曲时间 {b:+.2f}（{n_in}/{n_pt} 句吻合，中位残差 {med:.2f}s，拟合点覆盖 {spread:.1f}s）')
            rows = lrc_pass(fit)
            # 按时间轴对出来、对齐分够的句首当新的拟合点再拟合一次；时间轴不再变就停
            pts = [(LT[r['lrc_line'] - 1], r['chars'][0]['t']) for r in rows if r['source'] == 'FA' and r['score'] >= .2 and LT[r['lrc_line'] - 1] is not None]
            nf = lrc_fit(pts)
            if not nf or nf[2] >= .15 or max(abs((nf[0] - k) * x + nf[1] - b) for x, _ in pts) < .05:
                break
            fit = nf
    elif any(t is not None for t in LT):
        print('· 歌词自带的时间戳和片段对不上（翻唱/改编版），不用')
    print(f"· 片段唱到第 {rows[0]['lrc_line']}–{rows[-1]['lrc_line']} 行，共 {len(rows)} 句；字距约 {cp:.2f}s")
    # 按气口拆行：两个字之间人声真的静了 split_gap 秒以上，停在 jieba 分词的词边界上，且两边都至少 3 个字
    import jieba, logging
    jieba.setLogLevel(logging.ERROR)
    out = []
    for r in rows:
        keep = max(1, sum(c['t'] < dur - .15 for c in r['chars']))   # 片段在半句结束：唱不到的字裁掉
        r['chars'], r['ends'] = r['chars'][:keep], r['ends'][:keep]
        cs, ends, cut = r['chars'], r['ends'], None
        if a.split_gap and len(cs) >= 6 and r['source'] == 'FA':
            text = ''.join(c['c'] for c in cs) if all(not c['c'].isascii() for c in cs) else None
            bounds, pos = set(), 0
            for w in (jieba.cut(text) if text else []):
                pos += len(w); bounds.add(pos)
            cand = [(ENV.quiet_run(cs[k - 1]['t'] + .05, cs[k]['t']), k) for k in range(3, len(cs) - 2) if not text or k in bounds]
            if cand:
                g, k = max(cand)
                if g >= a.split_gap:
                    cut = k
        parts = [(cs[:cut], ends[:cut]), (cs[cut:], ends[cut:])] if cut else [(cs, ends)]
        for j, (p, pe) in enumerate(parts):
            out.append({'line': re.sub(r'\s+', ' ', ''.join(c['c'] if not c['c'].isascii() else f" {c['c']} " for c in p)).strip(),
                        'start': p[0]['t'], 'end': round(pe[-1], 2), 'earliest': r['earliest'] if j == 0 else p[0]['t'],
                        'chars': p, 'source': r['source'], 'score': r['score'], 'lrc_line': r['lrc_line'], 'flags': r['flags']})
    data = {'song': a.title, 'duration': round(dur, 2),
            'note': '每个字的开唱时间（秒，片段时间）。Demucs 人声 + MMS_FA 强制对齐 + 人声起音点；对齐分低的句子用 whisper 听写时间（source=听写估）。字幕比 t 早 0.1–0.3 秒出现，宁早勿晚。',
            'lines': out}
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump(data, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(f'wrote {a.out}')
    print(f"\n{'句首':>6} {'句尾':>6}  分数  来源    歌词")
    for o in out:
        print(f"{o['start']:6.2f} {o['end']:6.2f}  {o['score']:.2f}  {o['source']:<5} {o['line']}  {'⚠ ' + '；'.join(o['flags']) if o['flags'] else ''}")
        print('        ' + ' '.join(f"{c['c']}{c['t']:.2f}" for c in o['chars']))


if __name__ == '__main__':
    main()
