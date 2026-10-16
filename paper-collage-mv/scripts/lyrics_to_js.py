"""把工程的 assets/lyrics_timing.json 转成 src/lyrics_data.js。改了时间以后重跑：python3 lyrics_to_js.py <工程目录>"""
import json, os, sys
d = sys.argv[1] if len(sys.argv) > 1 else '.'
data = json.load(open(os.path.join(d, 'assets/lyrics_timing.json'), encoding='utf-8'))
for l in data['lines']:
    l.pop('flags', None)
    for k in range(1, len(l['chars'])):
        if l['chars'][k]['t'] < l['chars'][k - 1]['t']:
            sys.exit(f"第 {data['lines'].index(l) + 1} 句「{l['line']}」的时间不是递增的，先改对")
open(os.path.join(d, 'src/lyrics_data.js'), 'w', encoding='utf-8').write(
    '// 由 assets/lyrics_timing.json 生成；改时间请改 json 后重跑 scripts/lyrics_to_js.py\nconst LYR_DATA = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n')
print(f"src/lyrics_data.js：{len(data['lines'])} 句")
