# 第五轮定版的源码（只作参考）

《只对你有感觉》第五轮 medium 版的部分源码，2026-10-16 定版。成片的样子见 `../assets/bar/第五轮medium-全片.jpg`，分镜见 `STORYBOARD.md`。

| 文件 | 看什么 |
|---|---|
| `kids.js` | 剪纸木偶的原型，已经泛化成 `template/src/puppet.js`。看它怎么给两个角色定不同的长相 |
| `sheet.js` | 人物设定图 `LOOPS.sheet` 和对照用的特写/中景 |
| `props.js` | 道具全用 `piece()` 拼：东南西北（会翻开的四瓣）、灯泡、问号 |
| `scenes/common.js` | 场景小工具：手、飘起的小心、闪光、汗滴 |
| `scenes/s1_room.js` | 开场：第一秒强图形 + 揭示，镜头一路推进完成匹配剪辑。`SC.room` 是表演最密的一段，拍表拆解见 `../references/motion.md` |
| `scenes/s3_chorus.js` | 副歌：一整张纸摊开成四格世界，镜头一格格走过，最后四角折起 |
| `scenes/mv.js` | 时间线 |

这些文件引用 `KIDS`、`fortune`、`SC` 等名字，直接搬进新工程跑不起来，也不该搬：角色长相和母题要按新歌重新设计。值得学的是结构和工艺。
