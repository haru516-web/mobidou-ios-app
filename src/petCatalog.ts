import type { ImageSourcePropType } from 'react-native';

export type PetId =
  | 'mobirin'
  | 'mobichi'
  | 'yami'
  | 'mobiyan'
  | 'mobiyura'
  | 'reomoby'
  | 'potemoby'
  | 'mobibou'
  | 'babumoby'
  | 'bearmobby'
  | 'boymobby'
  | 'cat1mobby'
  | 'cat2mobby'
  | 'cat3mobby'
  | 'cat4mobby'
  | 'dogmobby'
  | 'fashionablemobby'
  | 'gamermobby'
  | 'garibenmobby'
  | 'koreamobby'
  | 'lanimobby'
  | 'ojimobby'
  | 'reamobby'
  | 'shikamobby'
  | 'uyumobby'
  | 'wolfmobby';

export type PetCharacter = {
  id: PetId;
  name: string;
  catchphrase: string;
  accent: string;
  image: ImageSourcePropType;
  meaningTemplates: readonly string[];
};

// Keep this roster in the same order and with the same artwork as mobby-main.
// The English chat app starts with babumoby, but every mobby character remains
// available from the in-app picker.
export const PET_CHARACTERS: readonly PetCharacter[] = [
  {
    id: 'mobirin',
    name: 'もびりん',
    catchphrase: '知的なおじ',
    accent: '#DCEAF0',
    image: require('../assets/mobies/mobirin.webp'),
    meaningTemplates: ['{meaning}という意味ですぞ。', '{meaning}ってことですな。'],
  },
  {
    id: 'mobichi',
    name: 'もびち',
    catchphrase: '気ままギャル♡',
    accent: '#FFE1EA',
    image: require('../assets/mobies/mobichi.webp'),
    meaningTemplates: ['{meaning}って意味だよ〜♡', '{meaning}ってこと！ わかった？'],
  },
  {
    id: 'yami',
    name: '病みモビー',
    catchphrase: 'メンヘラちゃん',
    accent: '#E9E0F4',
    image: require('../assets/mobies/yami-mobby.webp'),
    meaningTemplates: ['{meaning}って意味……だよ。', '{meaning}ってこと。忘れないでね……。'],
  },
  {
    id: 'mobiyan',
    name: 'もびやん',
    catchphrase: 'まっすぐなヤンキー',
    accent: '#D8EFF4',
    image: require('../assets/mobies/mobiyan.webp'),
    meaningTemplates: ['{meaning}って意味やで！', '{meaning}っちゅうことや。覚えとき！'],
  },
  {
    id: 'mobiyura',
    name: 'もびゆら',
    catchphrase: '痛いほど本気な堕天王',
    accent: '#E8D9FF',
    image: require('../assets/mobies/mobiyura.webp'),
    meaningTemplates: ['{meaning}という意味だ。覚えておけ。', '{meaning}……それがこの言葉の真実だ。'],
  },
  {
    id: 'reomoby',
    name: 'れおモビー',
    catchphrase: 'お姫様専属の王子様',
    accent: '#FFE3DC',
    image: require('../assets/mobies/reomoby.webp'),
    meaningTemplates: ['{meaning}って意味さ。君のために覚えておこう。', '{meaning}ということだよ。素敵な言葉だね。'],
  },
  {
    id: 'potemoby',
    name: 'ぽてモビー',
    catchphrase: '休むことに全力なニート',
    accent: '#FFF0D9',
    image: require('../assets/mobies/potemoby.webp'),
    meaningTemplates: ['{meaning}って意味だよ〜。覚えたら、ひと休みしよ。', '{meaning}ってこと。ゆっくりで大丈夫〜。'],
  },
  {
    id: 'mobibou',
    name: 'モビ坊',
    catchphrase: '調子のいい悪ガキ',
    accent: '#FFE6C5',
    image: require('../assets/mobies/mobibou.webp'),
    meaningTemplates: ['{meaning}って意味だぞ！ メモったか？', '{meaning}ってこと！ へへ、ひとつ賢くなったな！'],
  },
  {
    id: 'babumoby',
    name: 'ばぶモビー',
    catchphrase: 'みんなを動かす赤ちゃん',
    accent: '#FFF0F3',
    image: require('../assets/mobies/babumoby.webp'),
    meaningTemplates: ['{meaning}って意味だばぶ〜', '{meaning}ってことだばぶ。わかった？'],
  },
  {
    id: 'bearmobby',
    name: 'くまモビー',
    catchphrase: 'ゆっくり寄り添うくま',
    accent: '#F2D1B1',
    image: require('../assets/mobies/bearmobby.png'),
    meaningTemplates: ['{meaning}ってことだよ。あわてず、ひとつずつ覚えようね。', '{meaning}という意味だね。ぼくはこういう言葉、好きだな。'],
  },
  {
    id: 'boymobby',
    name: 'ボーイモビー',
    catchphrase: '元気なキャップボーイ',
    accent: '#BFD7F5',
    image: require('../assets/mobies/boymobby.png'),
    meaningTemplates: ['{meaning}ってこと！ いいね、またひとつ使える言葉が増えた。', '{meaning}って意味だよ。次に見つけたらすぐ使ってみよう！'],
  },
  {
    id: 'cat1mobby',
    name: 'ねこモビー1',
    catchphrase: '好奇心いっぱいのねこ',
    accent: '#F5C89D',
    image: require('../assets/mobies/cat1mobby.png'),
    meaningTemplates: ['{meaning}って意味。にゃ、なんだか面白い響きだね。', '{meaning}ってことだよ。気になったら、もう一回ゆっくり見てみよ。'],
  },
  {
    id: 'cat2mobby',
    name: 'ねこモビー2',
    catchphrase: '夜ふかし黒ねこ',
    accent: '#D0C2E8',
    image: require('../assets/mobies/cat2mobby.png'),
    meaningTemplates: ['{meaning}って意味……夜に聞くと、ちょっと秘密っぽいね。', '{meaning}ってこと。ふふ、覚えておくと便利かも。'],
  },
  {
    id: 'cat3mobby',
    name: 'ねこモビー3',
    catchphrase: 'ふわふわ三毛ねこ',
    accent: '#EBD6C1',
    image: require('../assets/mobies/cat3mobby.png'),
    meaningTemplates: ['{meaning}という意味だよ。今日の気分にちょうどいい言葉だね。', '{meaning}ってこと。にゃんとなく覚えられそう？'],
  },
  {
    id: 'cat4mobby',
    name: 'ねこモビー4',
    catchphrase: 'いたずら好きのしまねこ',
    accent: '#E8B46A',
    image: require('../assets/mobies/cat4mobby.png'),
    meaningTemplates: ['{meaning}って意味！ じゃあ次は、その言葉でちょっと遊んでみよう。', '{meaning}ってことだね。ぼくなら、さらっと会話に混ぜるかな。'],
  },
  {
    id: 'dogmobby',
    name: 'いぬモビー',
    catchphrase: 'まっすぐなわんこ',
    accent: '#D9A66C',
    image: require('../assets/mobies/dogmobby.png'),
    meaningTemplates: ['{meaning}って意味だよ！ わかったら、しっぽを振りたくなるね。', '{meaning}ってこと。大丈夫、何度でも一緒に覚えよう！'],
  },
  {
    id: 'fashionablemobby',
    name: 'おしゃれモビー',
    catchphrase: 'こだわり派のファッショニスタ',
    accent: '#C9B5A5',
    image: require('../assets/mobies/fashionablemobby.png'),
    meaningTemplates: ['{meaning}って意味。言葉もコーディネートみたいに、場面で選ぶと素敵よ。', '{meaning}ということね。響きまで含めて、きれいに使いたい言葉だわ。'],
  },
  {
    id: 'gamermobby',
    name: 'ゲーモビー',
    catchphrase: '集中型の夜更かしゲーマー',
    accent: '#B5A5F5',
    image: require('../assets/mobies/gamermobby.png'),
    meaningTemplates: ['{meaning}って意味。ここ、覚えたら次のステージに進めるやつ。', '{meaning}ってこと。実戦で使えるか、今の会話で試してみよう。'],
  },
  {
    id: 'garibenmobby',
    name: 'ガリ勉モビー',
    catchphrase: '知識を集める努力家',
    accent: '#C7D5E0',
    image: require('../assets/mobies/garibenmobby.png'),
    meaningTemplates: ['{meaning}という意味です。用例まで押さえると、記憶に定着しやすいですよ。', '{meaning}ということですね。似た表現との違いも、あとで整理しておきましょう。'],
  },
  {
    id: 'koreamobby',
    name: 'コリアモビー',
    catchphrase: 'トレンドに敏感なストリート派',
    accent: '#C9D6E8',
    image: require('../assets/mobies/koreamobby.png'),
    meaningTemplates: ['{meaning}って意味。カジュアルな会話なら、こんなふうにさらっと使えるよ。', '{meaning}ってことだね。響きも今っぽくて、覚えやすいと思わない？'],
  },
  {
    id: 'lanimobby',
    name: 'ラニモビー',
    catchphrase: '静かに甘えるふわふわねこ',
    accent: '#E7D3D2',
    image: require('../assets/mobies/lanimobby.png'),
    meaningTemplates: ['{meaning}って意味だよ。ふわっとした言葉だけど、ちゃんと伝わるね。', '{meaning}ってこと。ゆっくり言うと、もっと自然に聞こえるよ。'],
  },
  {
    id: 'ojimobby',
    name: 'おじモビー',
    catchphrase: '渋くて物知りなおじさん',
    accent: '#CBB79C',
    image: require('../assets/mobies/ojimobby.png'),
    meaningTemplates: ['{meaning}という意味じゃ。昔から、こういう言葉は会話の味になるんじゃよ。', '{meaning}ってことだな。急がず、使う場面ごと覚えるといい。'],
  },
  {
    id: 'reamobby',
    name: 'レアモビー',
    catchphrase: '森から来た気まぐれねこ',
    accent: '#C8A46E',
    image: require('../assets/mobies/reamobby.png'),
    meaningTemplates: ['{meaning}って意味。珍しい言葉を見つけると、ちょっと得した気分になるね。', '{meaning}ってことだよ。森の中で聞いたら、もっと不思議に響きそう。'],
  },
  {
    id: 'shikamobby',
    name: 'しかモビー',
    catchphrase: '森を駆けるやさしいしか',
    accent: '#D6A36F',
    image: require('../assets/mobies/shikamobby.png'),
    meaningTemplates: ['{meaning}という意味だよ。木漏れ日みたいに、ゆっくり覚えていこう。', '{meaning}ってこと。森で誰かに会ったら、使ってみたい言葉だね。'],
  },
  {
    id: 'uyumobby',
    name: 'うゆモビー',
    catchphrase: 'ふんわり甘えんぼ',
    accent: '#E7D7D3',
    image: require('../assets/mobies/uyumobby.png'),
    meaningTemplates: ['{meaning}って意味だよ。やさしい感じで、覚えやすいね。', '{meaning}ってこと。わからなくても、もう一度聞いていいからね。'],
  },
  {
    id: 'wolfmobby',
    name: 'ウルフモビー',
    catchphrase: '静かに燃えるオオカミ',
    accent: '#AEBBCB',
    image: require('../assets/mobies/wolfmobby.png'),
    meaningTemplates: ['{meaning}って意味だ。短くても、使う場面を選べば強く伝わる。', '{meaning}ということだな。言葉は数より、タイミングが大事だ。'],
  },
] as const;

export function isPetId(value: unknown): value is PetId {
  return typeof value === 'string' && PET_CHARACTERS.some((pet) => pet.id === value);
}

export function getPetCharacter(id: PetId) {
  return PET_CHARACTERS.find((pet) => pet.id === id) ?? PET_CHARACTERS[PET_CHARACTERS.length - 1];
}
