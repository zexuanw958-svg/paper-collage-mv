# /// script
# requires-python = ">=3.11,<3.12"
# dependencies = ["numpy<2", "librosa", "soundfile"]
# ///
"""音频预处理：转成干净的 wav，测节拍和能量；是抖音导出的音频时，顺手切掉水印尾音。

用法：uv run prep_audio.py <输入音频或视频> <输出.wav> [--info song_info.json] [--start 秒] [--max 秒]

大多数歌曲原样转 wav，只去掉结尾的纯数字静音。只有结尾完整出现抖音水印的特征时才切：
音乐被硬切 → 约 0.85 秒数字静音 → 约 0.45 秒「抖音」人声 → 静音到结尾。这时从硬切点截断，最后 1 秒淡出。
打印的 JSON 里 douyin_tail 说明有没有切。--start/--max 用来从整首歌里截一段。
"""
import argparse, json, subprocess, sys
import numpy as np

SR = 44100


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()


def level_db(mono, hop):
    n = len(mono) // hop
    r = np.sqrt(np.mean(mono[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-20)
    return 20 * np.log10(r + 1e-12)


def find_cut(y):
    """返回 (截断点秒数, 是否抖音尾音)。"""
    mono = y.mean(1); hop = int(.05 * SR); db = level_db(mono, hop); n = len(db)
    dur = len(mono) / SR
    quiet = db < -90                          # 数字静音
    # 抖音水印：结尾 8 秒内出现「音乐 → 静音 ≥0.5 秒 → 0.2–0.9 秒短促人声 → 静音到结尾」，四段都在才算
    for i in range(max(4, n - int(8 / .05)), n):
        if not (quiet[i] and not quiet[i - 1] and db[i - 4:i].max() > -40):
            continue
        j = i
        while j < n and quiet[j]: j += 1
        if j - i < 10: continue                # 第一段静音不到 0.5 秒
        k = j
        while k < n and not quiet[k]: k += 1
        if not (4 <= k - j <= 18) or db[j:k].max() < -35: continue   # 中间那声「抖音」
        if k < n and quiet[k:].mean() < .9: continue                 # 之后应该一直静到结尾
        while i > 0 and db[i - 1] < -60: i -= 1                     # 退到硬切那一刻（衰减尾巴不要）
        return i * .05, True
    # 普通歌曲：原样保留，只去掉结尾超过 0.5 秒的纯数字静音（留 0.3 秒）
    loud = np.where(~quiet)[0]
    end = min(dur, (loud[-1] + 1) * .05 + .3) if len(loud) else dur
    return (end if dur - end > .5 else dur), False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('out'); ap.add_argument('--info')
    ap.add_argument('--fade', type=float, default=1.0)
    ap.add_argument('--start', type=float, default=0, help='从第几秒开始截（整首歌只做一段时用）')
    ap.add_argument('--max', type=float, default=0, help='最多保留多少秒（0 = 不限）')
    a = ap.parse_args()
    y = load(a.src); raw_dur = len(y) / SR
    cut, tail = find_cut(y)
    if a.start:
        y = y[int(a.start * SR):]; cut -= a.start
        k = int(.03 * SR); y[:k] *= np.linspace(0, 1, k)[:, None]
    clipped = bool(a.max and cut > a.max)
    if clipped:
        cut = a.max
    cut = round(cut, 2); y = y[:int(cut * SR)]
    if tail or clipped:
        k = int(min(a.fade, cut / 4) * SR); y[-k:] *= np.linspace(1, 0, k)[:, None] ** 1.5
    import soundfile as sf, os
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    sf.write(a.out, y, SR, subtype='PCM_16')

    import librosa
    mono = librosa.to_mono(y.T); y22 = librosa.resample(mono, orig_sr=SR, target_sr=22050)
    tempo, beats = librosa.beat.beat_track(y=y22, sr=22050, units='time')
    tempo = float(np.atleast_1d(tempo)[0])
    rms = librosa.feature.rms(y=y22, frame_length=2048, hop_length=512)[0]; tt = librosa.times_like(rms, sr=22050, hop_length=512)
    per = [round(float(20 * np.log10(rms[(tt >= s) & (tt < s + 1)].mean() + 1e-9)), 1) for s in range(int(cut))]
    # 能量最大的一次抬升（2 秒均值对比前 2 秒），常常就是副歌或 drop 进来的地方
    jumps = [(per[i] + per[i + 1] - per[i - 2] - per[i - 1], i) for i in range(2, len(per) - 1)]
    lift = max(jumps)[1] if jumps else None
    info = {'source': a.src, 'raw_duration': round(raw_dur, 2), 'start': a.start, 'duration': cut, 'douyin_tail': tail,
            'removed_seconds': round(raw_dur - a.start - cut, 2), 'bpm': round(tempo, 1),
            'first_beat': round(float(beats[0]), 3) if len(beats) else 0.0,
            'biggest_lift_at': lift, 'energy_db_per_second': per,
            'note': 'bpm 由 librosa 估计，DJ/加速版常见半速或倍速误判，需要听感复核；energy 只作参考'}
    if a.info:
        os.makedirs(os.path.dirname(os.path.abspath(a.info)), exist_ok=True)
        json.dump(info, open(a.info, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({k: v for k, v in info.items() if k != 'energy_db_per_second'}, ensure_ascii=False, indent=1))
    print('energy dB/s:', ' '.join(f'{i}:{v}' for i, v in enumerate(per)))


if __name__ == '__main__':
    main()
