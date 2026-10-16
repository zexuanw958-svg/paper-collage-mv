# 纸艺引擎 API（src/paper.js + src/lyrics.js）

引擎是纯 Canvas 2D，没有用 p5。全局画布 `C`（CanvasRenderingContext2D），尺寸 `W = 1920`、`H = 1080`；当前时间 `T`，全片时长 `DUR`，`BPM`、`BEAT`、`OFF` 来自 `src/config.js`。每一帧由 `drawWorld(t)` 从头画完整个画面。

## 时间线

```js
const SC = {};
SC.open = (t, lt, dur) => { ... };      // t = 全片时间，lt = 本镜已过时间，dur = 本镜长度
shots([[0, SC.open], [6.6, SC.room], [23.3, SC.chorus]]);   // 按开始时间登记镜头，每个函数画整帧（含背景）
LOOPS.sheet = t => { ... }; LOOPS.sheet.len = 1;            // 独立循环：设定图、测试图。渲染时加 --loop=sheet
```

一个镜头函数的典型顺序：`camK` 定镜头 → `layer(d)` 由远到近画 → `screen()` 画屏幕空间的东西（光点、字卡）→ `lyricLine` → `post`。

## 镜头与分层

- `camK(t, [[t, x, y, zoom, 缓动?], ...], rot = 0)`：主镜头。世界坐标 `(x, y)` 落在屏幕中心，缩放为 `zoom`。位置逐段插值，缩放在对数空间插值，段内单调，不会过冲。想停一下，就连放两个相同的关键帧。第 5 项写到达这一帧的那段怎么走：不写是两头慢的 ease；`'in'` 一路加速到这一帧，推进匹配推到切点用它，不会在最满的时候减速停住；`'out'` 起步快、越走越慢，切过去以后往外拉用它；`'lin'` 匀速。
- **推进匹配**（定版开场和屋里那段的转场都是这么做的，见 `examples/scenes/s1_room.js` 的 `SC.open` 和 `SC.room`）：上一场最后一个 `camK` 关键帧对准物件 A、推到它占满画面；下一场第一个关键帧对准形状对得上的物件 B，缩放算成让 B 在屏幕上和 A 一样大（屏幕大小 = 世界大小 × 缩放），然后拉出来。切的那一帧前后画面几乎一样。推进那段关键帧写 `'in'`，拉出那段写 `'out'`，镜头就是一路冲进去、切、马上往外退，不会停在满屏上。

  ```js
  // 上一场：9.6 秒推进杯口（杯口半径 60）
  camK(t, [[8.4, 1000, 560, 1.3], [9.6, CUP[0], CUP[1], 9]]);
  // 下一场：从同样大小的月亮（半径 90）拉出来，9 × 60 / 90 = 6
  camK(t, [[9.6, MOON[0], MOON[1], 6], [11.2, 960, 540, 1.1]]);
  ```
- `layer(d)`：按视差深度 `d` 套用镜头。`d = 1` 是主平面，`< 1` 是更远（动得少），`> 1` 是更近的前景。推拉时，前、中、远景速度不同，2.5D 纸模型感就出来了。
- `screen()`：回到屏幕坐标，不跟镜头。
- `toScreen(x, y, d)`：世界坐标换算到屏幕坐标，比如让字卡跟着某个物件。
- `setCam(x, y, z, r)`：底层设镜头。主镜头别直接用它，用 `camK`，否则 `camcheck` 检查不到。
- `ZB`：当前主平面的屏幕缩放的平方根。纸边、投影随它变粗，但变得很柔和。

## 纸片

`piece(pts, colour, o)` 是一切的基础：把点列 `pts`（局部坐标）剪成一块纸，带不规则白纸边、右下淡投影、顶光渐变和纸纤维颗粒。返回内轮廓的 `Path2D`。

| 选项 | 默认 | 作用 |
|---|---|---|
| `seed` | 1 | 纸边抖动的种子。同一块纸每帧用同一个 seed，否则纸边会闪 |
| `border` | 4 | 白纸边宽度（屏幕 px，1080p）。小零件用 1.5–2.5，大块用 4–6 |
| `lift` | 1 | 投影深浅，0 表示没有投影。浮起来的东西用 1.2–1.6 |
| `grain` | .55 | 纸纹强度 |
| `shade` | .5 | 顶亮底暗的渐变 |
| `rough` | 1 | 剪口粗糙度 |
| `noBorder` | false | 不要白边（印在纸上的花纹、口袋、阴影块） |
| `alpha` | — | 整块透明度 |
| `back` | 纸白 | 白纸边的颜色 |
| `stains` | — | 裁在纸里的水渍：`[[i, x, y, w, h, colour, alpha], ...]` |
| `after(path, bbox)` | — | 在纸里面继续画（已裁剪），比如格子布纹、窗框里的风景、一整个小世界 |

形状工具（返回点列）：`rectP(x, y, w, h)`、`rrP(x, y, w, h, r)` 圆角矩形、`ellP(cx, cy, rx, ry, n, rot)`、`starP(cx, cy, r, inner, n)`、`heartP(cx, cy, r)`、`cloudP(cx, cy, w, h, seed, bumps)` 平底纸云、`triP(a, b, c)`。自己写点列也行：锯齿刘海、撕纸边、山、楼都直接列点。

细线和点缀：`line(P, w, colour)`、`curve(P, w, colour)`（缝线、眉毛、嘴）、`fillP(P, colour)`、`softDot(x, y, rx, ry, colour, a)`（腮红、柔光斑）。`SIL = '#色值'` 打开剪影模式，所有纸片平涂成一个颜色，适合做影子戏，用完设回 `null`。

## 背景、光、后期

- `wash(x, y, w, h, [[0, c1], [1, c2]], o)`：水彩渐变铺底，带水渍和晕开的亮斑。选项 `radial: [cx, cy, r]`、`horiz`、`stains`（个数）、`stainA`、`stainCol`、`blooms`、`seed`。
- `stain(i, x, y, w, h, colour, a, op, rot)`：单个水渍。
- `glow(x, y, r, colour, a)`：柔光（screen 混合）。太阳、灯、手里的光点都要配它。
- `rays(x, y, angle, spread, n, len, colour, a, t)`：光束，体积光。
- `motes(t, n, [x, y, w, h], colour, a)`：往上飘的光点。
- `post(t, { tone, toneA, vig, vigA, grain })`：每帧最后调用，做调色、暗角和胶片颗粒。每一段给一个明确的 `tone`。

## 文字

- `card(ch, x, y, s, o)`：奶白小纸片上一个宋体字。`o.bg` 底色，`o.col` 字色，`o.rot`、`o.k` 缩放，`o.alpha`。
- `cutText(txt, x, y, s, colour, o)`：剪纸大字，带白纸边和投影，默认红色。用在副歌的关键句，或者把字放进场景里。
- 字体是 `FONT = '"NotoSerifSC"'`（思源宋体，可变字重 200–900）。歌词里出现的字，引擎会自动预载。歌词以外还要用的字写进 `PROJECT.extraText`。

## 歌词（src/lyrics.js）

- `LYR.lines[i]`：`{ line, start, end, earliest, chars: [{ c, t }] }`，`t` 是每个字的开唱时间。
- `lyricLine(t, i, o)`：画第 i 句。默认放在屏幕底部，奶白字卡，逐字落下。选项：`x, y, size, exit`（整句飘走的时间，常用 `lyricEnd(i)`）、`style: 'big'`（红色剪纸大字）、`hi: { 字号: 底色 }`（单个字换底色）、`align`、`gap`、`vertical`、`bg`、`col`、`rotAmp`。
- `lyricAt(i, k)`：第 i 句第 k 个字应该出现的时间，已经提前了 `LEAD`（0.22 秒）。
- `lyricMark(i, k)`：在场景里自己画歌词时，每画出一个字就调一次，让 `lyricscheck` 记上这个字。
- `lyricEnd(i)`：这句唱完的时间。

## 数学

`clamp lerp seg(t, a, b) ease ease5 easeOut easeIn backOut(x, s) frac hash(i) hashS(str) wob(t, f, ph) vn(x, seed)`；`kf(t, [[t, v], ...], e)` 是逐段 ease 的关键帧，值可以是数组。`spring(t, t0)` 会回弹，只用在小物件落地上，不要用在运镜上。

## 人物与表演（src/puppet.js + src/fx.js）

- `puppet(spec, x, y, s, P)`：剪纸木偶。`(x, y)` 是两脚之间的地面点，`s = 1` 时全高约 250px。spec 定长相（配色、发型点列 `hairFront` / `hairBack`、`head` 配饰、`coatDetail`、`sleeve`、`sock`……），P 定动作：`turn` 侧身、`lean` 倾斜、`tilt` 歪头、`aL` / `aR` 手臂角度（0 垂下，1.57 平举，2.7 举过头；`aL` 往画面左抬，`aR` 往画面右抬）、`armLen` 手臂长度（默认 70，够东西拉到 90）、`kickL` / `kickR` 抬腿、`dy` 上下位移、`squash` 压扁拉长、`sit` 坐下、`holdL` / `holdR` 手里拿的东西、`armFront` 这只手画在脸前面、`face` 表情关键帧。返回 `{ handL, handR, head, neck }`，是调用处坐标系里的位置。完整说明在文件顶部和 `puppet()` 上方的注释。
- 全身姿势：关键帧里写 `pose: '名字'`（`dir: -1` 朝左镜像），一次摆好重心、头、两只手和高度：stand reach offer point peek startle crouch cheer slump shy heart cover sulk。pose 不管 `turn` 和 `x`；同一帧里另写的参数盖过 pose。`armBack: 'L' | 'R' | 'LR'` 把手画到身子后面（藏东西），`armFront: 'LR'` 两只手都画在脸前（捂脸）。
- `act(t, [[t, { 参数 }, 缓动], ...])`：表演关键帧，结果直接展开进 `puppet` 的 P。每个参数只在写了它的关键帧之间插值；缓动写在到达的那一帧：`'ease'`（默认）、`'back'`（过冲）、`'out'`（快出慢停）、`'in'`（慢起快收）、`'lin'`。`face: '名字'` 也写在关键帧里。不是 puppet 参数的数字（比如 `x`）也能插值，自己拿去用。
- `face(t, [[t, 名字 | {...}], ...], seed)` 和 `EXPR`：表情表和表情关键帧。表情有 neutral soft happy grin surprised annoyed deadpan shy sad puzzled love wow closed；`{ ...EXPR.sad, look: [.8, .3] }` 可以改视线。
- `actor(() => { ... })`：自己写的人物函数包一下，`motioncheck` 才认得出是人物。`hand(x, y, s)` 单独一只手，`groundShadow(x, y, s)` 脚下柔影，`mid(a, b, k)` 两点插值。
- `fx.js`：`pop(t, t0)` 弹出缩放（东西入场）、`jolt(t, t0, amp)` 余震（加到 tilt / lean 上）、`mark('?' | '!', x, y, size, col, k)` 反应符号、`heartsUp(t, t0, x, y, s, n)` 飘起小心、`sparkle(x, y, r, k)` 闪光、`sweat(x, y, s, k)` 汗滴、`burst(x, y, r, k)` 放射小纸条、`arc(a, b, h, k)` 抛物线飞行的位置、`sway(t, amp, f, ph)` 窗帘叶子挂饰的慢摆、`steam(x, y, t)` 热气、`drift(t, n, box, col)` 飘落的花瓣或纸屑。
- 道具零件（`fx.js`）：`strip(点, 宽, 颜色, { rib, bands, bandLen, fringe })` 沿一串点画软纸带（围巾、丝带、绳子、布），宽度可以是 `k => 宽` 做出收尖；`tail(x, y, 长, 角度, t, wind)` 一头挂着、一头垂下来会飘的中线（`wind` 0 下垂，1 被风吹平）；`sag(a, b, h)` 两点之间往下垂的一段；`flap(x, y, w, h, k, 颜色, { axis, front, back, backCol })` 绕一条边翻的平板（门、盒盖、书页），`k` 0 关着、.5 侧过去、1 翻到背面，`front` / `back` 画两面的细节。用法见 `src/scenes/example.js` 末尾的 `LOOPS.props`。
- 一次性的身体小动作（`fx.js`），返回参数增量，用 `add(P, ...)` 叠上去：`hop(t, t0, h)` 原地蹦一下（先蹲再弹）、`hopTo(t, t0, t1, x0, x1, n)` 蹦蹦跳跳挪过去（返回 x）、`nod(t, t0)` 点头、`headShake(t, t0)` 摇头、`stomp(t, t0, 'L' | 'R')` 跺脚、`shiver(t, t0, t1)` 发抖。例：`puppet(K, x, y, s, { t, ...add(P, hop(t, 4.6), { tilt: jolt(t, 2.2) }) })`。

## 渲染与检查（render.mjs）

```bash
node render.mjs --sheet=1,2.5,4 --cols=3 --w=640 --out=out/check/a.jpg        # 挑几个时间点拼图
node render.mjs --strip=2.0:2.5 --out=out/check/s.jpg                         # 一段里的每一帧（看动作是否顺）
node render.mjs --sheet=2.1 --crop=760,300,400,400 --w=600 --out=out/check/f.jpg   # 全分辨率局部
node render.mjs --loop=sheet --stills=0 --out=out/check/sheet                 # 设定图 PNG
node render.mjs --loop=props --sheet=0 --w=1920 --cols=1 --out=out/check/道具.jpg   # 道具设定图
node render.mjs --frames --workers=3 [--range=a:b]                            # 出帧（可续跑，已有的帧跳过；别的工程在渲时自动排队）
node render.mjs --encode --out=out/X.mp4 --audio=assets/song.wav              # 合成
node tools/camcheck.mjs ; node tools/lyricscheck.mjs ; node tools/motioncheck.mjs [--from=a --to=b]
```

第五轮这套引擎实测每帧 1–60 毫秒。某个场景如果超过 1 秒/帧，就减少纸片数量或 `stains` 数。
