<div align="center">

# 纸艺拼贴 MV · paper-collage-mv

**给一首歌，让 Agent 写代码画出一支纸艺拼贴风的歌词 MV**

剪纸木偶人物 · 白纸边和投影 · 水彩背景 · 宋体纸片歌词逐字卡点 · 画面全部是代码画的，不用任何 AI 绘画或视频模型

一个给 Codex 用的 Agent Skill（Claude Code 也能装）

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![output: 1080p MV](https://img.shields.io/badge/output-1080p%20%C2%B7%2024fps%20MV-ff7a59?style=flat-square)](#做出来是什么样)
[![no AI image model](https://img.shields.io/badge/AI%20image%20model-none-22c55e?style=flat-square)](#做出来是什么样)
[![Codex · Claude Code](https://img.shields.io/badge/Codex-%C2%B7%20Claude%20Code-8b5cf6?style=flat-square)](#安装)

<sub>作者：抖音 <strong>@泽轩604</strong> · X <a href="https://x.com/zexuan604">@zexuan604</a></sub>

</div>

---

## 做出来是什么样

[![同一个 Codex，同一首歌：左边没用 skill，右边用了](docs/compare.jpg)](docs/compare.mp4)

<sub>点图看视频（43 秒）。同一个 Codex（GPT-6.1，xhigh 推理）、同一段音频、同一支参考片：左边没用这个 skill，右边用了现在这一版。</sub>

这类 MV 的样子，最早是 Claude 做出来的：《只对你有感觉》那一支，作者看了很满意（下图每 3 秒一格）。这个 skill 做的事，是把那一支好在哪里写成 Codex 能照着做的流程、设计哲学和工具。

![《只对你有感觉》定版，每 3 秒一格](docs/reference-mv.jpg)

## 同一首歌，三组对照

2026-10-16 拿邹沛沛《沉溺》的一段做了三组，材料完全一样（同一段音频，加上一支定版成片当风格参考）：

| 组 | 模型 | skill | 用时 | 结果 |
|---|---|---|---|---|
| A | Codex · GPT-6.1 · xhigh | 不用 | 9 分钟 | 每句歌词都画了对应的东西，但像幻灯片：42 秒里有 23 秒画面几乎不动，同一间屋子用了 5 次，人物一直站着笑 |
| B | Codex · GPT-6.1 · xhigh | 用 | 28 分钟 | 纸艺做工和镜头最好，每句都演成一个动作，表情有来由；毛病是整体偏灰（这一条已经写进 skill） |
| C | Claude Opus 5.5 · medium | 不用 | 28 分钟 | 句句都是正在发生的事，颜色最甜，和 B 打平 |
| B′ | Codex · GPT-6.1 · xhigh | 用（加上色调规则后） | 28 分钟 | 不再发灰，画面透亮，动作量没掉。上面对比视频右边就是这一支 |

结论很直接：**这个 skill 对 Codex 是刚需，对 Claude 是可选项。** 所以 skill 里写明了：Codex 照流程做；Claude 不用照流程，只借这里的脚本和引擎当工具，放开做。

## 安装

```bash
git clone https://github.com/zexuanw958-svg/paper-collage-mv.git
# Codex
ln -s "$PWD/paper-collage-mv/paper-collage-mv" ~/.codex/skills/paper-collage-mv
# Claude Code
ln -s "$PWD/paper-collage-mv/paper-collage-mv" ~/.claude/skills/paper-collage-mv
```

需要这些（作者在 macOS · Apple Silicon 上用）：

- [uv](https://docs.astral.sh/uv/)：跑备料脚本，Python 依赖会自动装。歌词对齐用的是 `mlx-whisper` 和 Demucs，**目前只支持 Apple Silicon 的 Mac**；第一次跑会下载几个 GB 的模型。
- Node.js 18 以上，`npm`：建工程时自动装 `puppeteer-core`。
- Google Chrome（或用 `CHROME_PATH` 指定 Chromium）：无头渲染每一帧。
- `ffmpeg` / `ffprobe`，`zsh`（macOS 自带）。

## 用法

把歌（mp3 / wav / m4a，或者抖音导出的视频）放进一个空目录，对 Agent 说：

> 用 paper-collage-mv 这个 skill，把当前目录里的 xxx.mp3 做成一支 MV。

它会自己走完这几步：切掉抖音导出音频结尾的水印尾音，从网易云取歌词，人声分离后逐字对齐，写分镜，先过人物和道具关，逐段搭场景并自查，最后渲染出 `out/<歌名>MV.mp4`（1920×1080、24fps、带原音轨）。一段 40–60 秒的片段，Codex 用 xhigh 推理大约半小时出片。

Codex 建议至少开 high 推理（联调后期都用 xhigh）；Claude 开 medium 就够。

## 这个 skill 是怎么调出来的

先由 Claude 做出一支满意的定版，再把它写成 skill，交给 Codex 照着做；看 Codex 的成片，找它和定版差在哪，改 skill，再让 Codex 重做。前后 13 轮，用了 6 首歌。几条最有用的教训：

- **给道理，不给数字。** 只要检查工具打印出一个数，Codex 就会把它当成目标去刷：写了「每秒至少一个拍点」，它就把九段戏的动作排在同样的几个时间点上；写了「定版每 10 秒 6.1 个动作」，换了快歌慢歌它都做成 6 个。所以现在检查工具只报哪里坏了，不给能「过关」的数。
- **歌词就是剧本。** 定版好看，是因为每个画面都在演那一句；Codex 一开始按整段的意境自己编故事，歌词成了背景音乐。起因是 skill 里写过一句「不要逐句照字面演歌词」。
- **表情有来由，换了就拿住。** 定版 50 秒的戏里写了 32 个表情关键帧，每次换都有一件事引起；Codex 有一支 55 秒写了 98 个，一会哭一会笑。
- **亮处要真亮。** 用了 skill 的 Codex 做工最好，却灰扑扑的：平均亮度和定版差不多，差在几乎没有接近纸白的亮处。

每条规矩的来历在 [`paper-collage-mv/references/taste.md`](paper-collage-mv/references/taste.md)，设计哲学在 [`references/philosophy.md`](paper-collage-mv/references/philosophy.md)。

## 注意

- 做出来的 MV 用的是别人的歌，发到平台上，音乐版权要自己确认。
- 风格参考是王贰浪《把回忆拼好给你》的 MV。参考片截图属于原作者，不随仓库发布；skill 里只用文字描述它的画法。

## 许可

MIT，见 [LICENSE](LICENSE)。`paper-collage-mv/template/render.mjs` 改自 [JohnHeibel/ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase)（MIT，原许可见同目录 `LICENSE-render.mjs.txt`）。字体 Noto Serif SC 使用 SIL Open Font License（见 `paper-collage-mv/assets/fonts/`）。

---

## English

**paper-collage-mv** is an Agent Skill (built for Codex, also installable in Claude Code) that turns a song clip into a paper-collage lyric music video: cut-paper puppets with white paper edges and soft shadows, watercolor backgrounds, and per-character lyric cards timed to the vocals. Every frame is drawn by code on a Canvas 2D engine and rendered with headless Chrome. No image or video generation model is used.

The demo above shows the same Codex model (GPT-6.1, xhigh reasoning) on the same song, without the skill (left) and with it (right). In a three-way test, Codex with the skill matched Claude working without one.

Requirements: macOS on Apple Silicon (lyric alignment uses `mlx-whisper` and Demucs), `uv`, Node.js 18+, Google Chrome, `ffmpeg`. Install by symlinking the inner `paper-collage-mv/` folder into `~/.codex/skills/` or `~/.claude/skills/`, then ask your agent: "Use paper-collage-mv to turn song.mp3 into an MV." The skill's documents are written in Chinese.
