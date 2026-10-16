// sheet.js: 人物设定图（LOOPS.sheet）。设定图里可以有标签。
(() => {
  const label = (txt, x, y, s = 22, col = '#5a4a52') => { C.save(); C.font = `600 ${s}px ${FONT}`; C.fillStyle = col; C.textAlign = 'center'; C.fillText(txt, x, y); C.restore(); };
  LOOPS.sheet = t => {
    screen();
    wash(0, 0, W, H, [[0, '#f1e7d6'], [1, '#e6d8c3']], { seed: 4, stains: 9, stainA: .12, stainCol: '#d9c6ab' });
    // ground strips
    piece([[ -40, 600], [W + 40, 606], [W + 40, 640], [-40, 640]], '#d9c9b0', { seed: 3, border: 3, lift: .5 });
    const G = 590, S = 1.5;
    const tt = 2.2;
    groundShadow(200, G, S); kid('boy', 200, G, S, { t: tt, face: [[0, 'neutral']] });
    groundShadow(480, G, S); kid('boy', 480, G, S, { t: tt + .5, turn: .8, face: [[0, { ...EXPR.neutral, look: [.6, 0] }]] });
    groundShadow(760, G, S); kid('boy', 760, G, S, { t: tt + .9, aR: 2.5, aL: .05, face: [[0, 'grin']] });
    groundShadow(1160, G, S); kid('girl', 1160, G, S, { t: tt + .3, face: [[0, 'neutral']] });
    groundShadow(1440, G, S); kid('girl', 1440, G, S, { t: tt + 1.1, turn: -.8, face: [[0, { ...EXPR.neutral, look: [-.6, 0] }]] });
    groundShadow(1720, G, S); kid('girl', 1720, G, S, { t: tt + 1.6, aL: 2.3, aR: .05, tilt: -.08, face: [[0, 'happy']] });
    label('阿栗 · 正面', 200, 690); label('阿栗 · 侧面', 480, 690); label('阿栗 · 抬手', 760, 690);
    label('小柿 · 正面', 1160, 690); label('小柿 · 侧面', 1440, 690); label('小柿 · 抬手', 1720, 690);
    // expression busts
    const ex = [['boy', 'happy', '开心'], ['boy', 'surprised', '惊讶'], ['boy', 'puzzled', '犯迷糊'], ['boy', 'shy', '害羞'],
                ['girl', 'love', '心动'], ['girl', 'annoyed', '生气'], ['girl', 'deadpan', '无语'], ['girl', 'sad', '委屈']];
    ex.forEach(([who, e, name], i) => {
      const x = 130 + i * 237, y = 1105;
      C.save(); C.beginPath(); C.rect(x - 112, 720, 224, 330); C.clip();
      kid(who, x, y, 1.38, { t: tt + i * .37, face: [[0, e]], turn: e === 'shy' ? .3 : 0 });
      C.restore();
      label(name, x, 1068, 20);
    });
    post(t, { vigA: .35 });
  };
  LOOPS.sheet.len = 1;
})();
// 对照用：特写 + 中景，背景用简单的水彩天和纸片草地
(() => {
  const bg = () => {
    screen();
    wash(0, 0, W, H, [[0, '#c9dbe3'], [1, '#e8eee6']], { seed: 6, stains: 8, stainA: .14, stainCol: '#a9c2cf' });
    glow(1500, 160, 520, '#fff3d6', .55);
  };
  LOOPS.cmpClose = t => {
    bg(); setCam(960, -185 + 20, 6.2); layer(1);
    kid('boy', 960, 0, 1, { t: 1.3, face: [[0, 'surprised']] });
    post(t, { vigA: .45 });
  };
  LOOPS.cmpClose.len = 1;
  LOOPS.cmpMid = t => {
    bg(); setCam(960, 540, 1); layer(1);
    piece([[-60, 760], [700, 730], [1300, 745], [W + 60, 770], [W + 60, H + 60], [-60, H + 60]], '#a9bf9c', { seed: 8, border: 4, lift: 1, stains: [[1, 500, 900, 1100, 600, '#8aa680', .16], [2, 1400, 850, 1000, 500, '#8aa680', .13]] });
    groundShadow(700, 880, 1.9); kid('girl', 700, 880, 1.9, { t: 2.1, face: [[0, 'neutral']], aR: .15 });
    groundShadow(1220, 880, 1.9); kid('boy', 1220, 880, 1.9, { t: 1.2, face: [[0, 'annoyed']], aL: 1.45, turn: -.5 });
    post(t, { vigA: .5 });
  };
  LOOPS.cmpMid.len = 1;
})();
