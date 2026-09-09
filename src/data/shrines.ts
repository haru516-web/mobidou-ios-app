export const SHRINES = [
  { id: 'star', name: '星もびこより宮', reading: 'ほしもびこよりぐう', place: 'もびの丘・星つなぎの峰', theme: '星がつなぐ、小さな一歩。', description: '見上げた空に、ひとつの光。\n遠い夢も、今日の一歩から。\nモビーと願いをこよりに結ぶ、星の宮。', blessing: '一歩の勇気・夢のつながり', color: '#647F97', icon: 'sparkles' },
  { id: 'moon', name: '月もびゆら結社', reading: 'つきもびゆらゆいしゃ', place: 'もびの丘・ゆらぎの月見台', theme: 'また会える、ご縁を結ぶ。', description: '月がゆらりと浮かぶ夜。\n今日出会えた、ちいさな幸せを\nほどけない結び目にして。', blessing: 'ご縁・再会・旅の安全', color: '#B36256', icon: 'moon' },
  { id: 'rain', name: '雨もびしず葉社', reading: 'あめもびしずはしゃ', place: 'もびの森・しずくの小径', theme: '雨のあと、こころに新しい芽。', description: '葉先に残る、雨のしずく。\n立ち止まる日も、芽は育つ。\nあなたの歩幅で、また会いに来て。', blessing: 'ひと休み・こころの潤い', color: '#7D9CAD', icon: 'rainy' },
  { id: 'forest', name: '森もびこもれ宮', reading: 'もりもびこもれぐう', place: 'もびの森・こもれびの庭', theme: '木漏れ日を、ポケットに。', description: '風が葉っぱをくすぐる森。\n深呼吸をひとつしたら、\nいつもの道もちょっと違って見える。', blessing: 'やすらぎ・新しい発見', color: '#758566', icon: 'leaf' },
  { id: 'cloud', name: '雲もびふわ灯社', reading: 'くももびふわともししゃ', place: 'もびの空・あかりの坂', theme: 'ふわり、あなたを照らす。', description: '雲のあいだに灯る明かり。\nうまくいかない日があっても、\nモビーはあなたの帰りを待っている。', blessing: 'ぬくもり・明日への希望', color: '#B59158', icon: 'cloud' },
  { id: 'flower', name: '花もびむすび宮', reading: 'はなもびむすびぐう', place: 'もびの里・はなびらの庭', theme: '歩いた日々が、花になる。', description: 'ひとひらずつ、ゆっくりと。\n重ねた一歩が花ひらく、\n小さなお祝いの宮。', blessing: 'よろこび・はじまり', color: '#BC858D', icon: 'flower' },
] as const;
export type Shrine = typeof SHRINES[number];
export type ShrineId = Shrine['id'];
export const STAMP_IMAGES = {
  star: require('../../assets/goshuin/star.png'),
  moon: require('../../assets/goshuin/moon.png'),
  rain: require('../../assets/goshuin/rain.png'),
  forest: require('../../assets/goshuin/forest.png'),
  cloud: require('../../assets/goshuin/cloud.png'),
  flower: require('../../assets/goshuin/flower.png'),
};
