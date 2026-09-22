export type OmikujiFortune = {
  id: string;
  rank: '大吉' | '中吉' | '小吉' | '吉' | '末吉';
  title: string;
  message: string;
  action: string;
  lucky: string;
  categories: readonly { label: string; text: string }[];
};

export const OMIKUJI_FORTUNES: readonly OmikujiFortune[] = [
  { id: 'morning-path', rank: '大吉', title: '朝の一歩が、道をひらく', message: '迷っていたことに小さな追い風。完璧を待たず、今日できる最初の一歩を。', action: 'いつもより5分早く外へ出る', lucky: '朱色のもの', categories: [{ label: '願望', text: '急がず進めば叶う' }, { label: '待人', text: '笑顔とともに来る' }, { label: '旅立', text: '朝の出発が吉' }] },
  { id: 'kind-word', rank: '中吉', title: 'やさしい言葉が、ご縁を結ぶ', message: '何気ないひと言が誰かの心を軽くする日。先に挨拶すると運が巡ります。', action: 'ひとりに感謝を伝える', lucky: '温かいお茶', categories: [{ label: '対人', text: '素直な言葉が吉' }, { label: '仕事', text: '相談すると整う' }, { label: '健康', text: '肩の力を抜く' }] },
  { id: 'slow-river', rank: '吉', title: 'ゆるやかな流れに、福が宿る', message: '答えを急がないほど見えるものがあります。今日は予定に小さな余白を。', action: '深呼吸を三回する', lucky: '水辺の景色', categories: [{ label: '願望', text: '時を待てば整う' }, { label: '学問', text: '復習に実りあり' }, { label: '旅立', text: '寄り道に発見あり' }] },
  { id: 'small-light', rank: '小吉', title: '小さな灯りを、見逃さないで', message: '派手ではなくても確かな前進の日。昨日より少し良かったことを数えて。', action: 'できたことを一つ書く', lucky: '丸い小物', categories: [{ label: '仕事', text: '丁寧さが評価される' }, { label: '恋愛', text: '聞き上手が吉' }, { label: '健康', text: '温めて休む' }] },
  { id: 'after-rain', rank: '末吉', title: '雨あがりのように、少しずつ', message: '思い通りでなくても運は育っています。整える日にすると明日が軽くなります。', action: '机の上を一か所だけ整える', lucky: '白い紙', categories: [{ label: '願望', text: '焦らず足元から' }, { label: '金運', text: '買う前に一晩置く' }, { label: '待人', text: '便りはゆっくり届く' }] },
  { id: 'new-breeze', rank: '大吉', title: '新しい風が、背中を押す', message: '今日は選び直す力があります。気になっていたことを一つ試すと景色が変わります。', action: '初めての道を少し歩く', lucky: '木漏れ日', categories: [{ label: '願望', text: '思い切れば叶う' }, { label: '仕事', text: '新案に追い風' }, { label: '旅立', text: '方角を変えると吉' }] },
  { id: 'steady-root', rank: '中吉', title: '根を張るほど、花は近づく', message: '積み重ねが静かに形になる日。目立たない習慣こそ、今日の開運です。', action: 'いつもの習慣を一つ続ける', lucky: '木の香り', categories: [{ label: '学問', text: '反復に成果あり' }, { label: '金運', text: '小さな節約が吉' }, { label: '健康', text: '歩幅を整える' }] },
  { id: 'open-window', rank: '吉', title: '窓をひらけば、気持ちも巡る', message: '滞っていた気分に新しい風が入る日。環境を少し変えると考えがまとまります。', action: '窓を開けて空を見上げる', lucky: '青い布', categories: [{ label: '仕事', text: '場所を変えると進む' }, { label: '対人', text: '先入観を手放す' }, { label: '健康', text: '新鮮な空気が吉' }] },
  { id: 'warm-hand', rank: '小吉', title: 'ぬくもりは、近くにある', message: '遠くの答えより身近な支えに気づく日。頼ることも、ご縁を育てる一歩です。', action: '身近な人に声をかける', lucky: '手のひらサイズの物', categories: [{ label: '待人', text: '身近な場所に縁あり' }, { label: '恋愛', text: '飾らない会話が吉' }, { label: '願望', text: '協力で近づく' }] },
  { id: 'moon-rest', rank: '末吉', title: '休むことも、明日への支度', message: '力を足すより余分なものを減らしたい日。早めに区切ると運気が整います。', action: '今夜は10分早く休む', lucky: '月の模様', categories: [{ label: '健康', text: '睡眠を優先して吉' }, { label: '仕事', text: '抱え込みに注意' }, { label: '金運', text: '今日は守りが吉' }] },
  { id: 'clear-bell', rank: '大吉', title: '澄んだ音が、福を呼ぶ', message: '伝えたかったことが素直に届く日。短くても自分の言葉で話してみて。', action: '気持ちのよい返事をする', lucky: '鈴の音', categories: [{ label: '対人', text: '言葉がよく届く' }, { label: '願望', text: '宣言すると動き出す' }, { label: '学問', text: '音読が吉' }] },
  { id: 'one-page', rank: '中吉', title: '一頁から、物語が動く', message: '大きな目標も小さく始めれば続きます。最初の一行を今日の成果にして。', action: '本や資料を一頁だけ読む', lucky: 'しおり', categories: [{ label: '学問', text: '始めるほど身につく' }, { label: '仕事', text: '下書きに福あり' }, { label: '願望', text: '小分けにすると叶う' }] },
  { id: 'sunny-corner', rank: '吉', title: '陽だまりに、答えがほどける', message: '考え込みすぎた心が軽くなる日。明るい場所でひと息つくと良い案が浮かびます。', action: '日なたで温かい飲み物を飲む', lucky: '黄色いもの', categories: [{ label: '仕事', text: '午後にひらめきあり' }, { label: '健康', text: '体を冷やさない' }, { label: '恋愛', text: '笑顔が縁を呼ぶ' }] },
  { id: 'tidy-pocket', rank: '小吉', title: '小さく整え、軽やかに', message: '手元を整えるほど次の行動が見える日。全部ではなく一か所で十分です。', action: '鞄かポケットを一つ整える', lucky: '小さな巾着', categories: [{ label: '金運', text: '忘れ物の確認が吉' }, { label: '仕事', text: '優先順位が整う' }, { label: '旅立', text: '荷物は軽めに' }] },
  { id: 'bridge-meeting', rank: '大吉', title: '橋の向こうに、新しいご縁', message: 'いつもと違う人や場所が幸運を運ぶ日。小さな誘いには前向きな返事を。', action: '普段話さない人に挨拶する', lucky: '橋のある景色', categories: [{ label: '待人', text: '思わぬ場所で会う' }, { label: '仕事', text: '新しい組合せが吉' }, { label: '旅立', text: '初めての場所へ' }] },
  { id: 'gentle-rain', rank: '中吉', title: '静かな雨が、芽を育てる', message: '目に見えない努力が根づく日。結果を急がず、今日の手入れを丁寧に。', action: '途中のことを一つ仕上げる', lucky: '透明な傘', categories: [{ label: '願望', text: '水面下で進む' }, { label: '学問', text: '静かな場所が吉' }, { label: '健康', text: '水分を忘れずに' }] },
  { id: 'good-detour', rank: '吉', title: '寄り道に、今日だけの宝物', message: '予定外の出来事が気分転換になる日。少しの遠回りを楽しむ余裕が福を呼びます。', action: '帰り道を少しだけ変える', lucky: '道端の花', categories: [{ label: '旅立', text: '寄り道に発見あり' }, { label: '対人', text: '偶然の会話が吉' }, { label: '金運', text: '小さな楽しみは吉' }] },
  { id: 'listen-first', rank: '小吉', title: '耳を澄ませば、道が見える', message: '今日は話すより聞くことで運が開きます。相手の言葉の奥に大切なヒントがありそう。', action: '最後まで遮らずに聞く', lucky: '静かな音楽', categories: [{ label: '対人', text: '聞き役に福あり' }, { label: '仕事', text: '確認すると整う' }, { label: '恋愛', text: '相手の歩幅を大切に' }] },
  { id: 'save-spark', rank: '末吉', title: '小さな火種を、大切に', message: '勢いより持続を選びたい日。やる気が少ない時は、消さない工夫だけで十分です。', action: '一分だけ手をつける', lucky: '小さな灯り', categories: [{ label: '願望', text: '細く長く続ける' }, { label: '仕事', text: '無理な約束は避ける' }, { label: '健康', text: '疲れをためない' }] },
  { id: 'shared-smile', rank: '大吉', title: '分けた喜びが、倍になる', message: '嬉しいことを誰かと分かち合うほど福が広がる日。小さな朗報も言葉にして。', action: 'うれしかったことを一つ話す', lucky: '二つ並んだもの', categories: [{ label: '対人', text: '共感から縁が深まる' }, { label: '恋愛', text: '素直な喜びが吉' }, { label: '金運', text: '贈り物に福あり' }] },
  { id: 'evening-note', rank: '中吉', title: '夕暮れに、今日の福を数える', message: '終わったことを認めるほど明日が整う日。足りなかったことより、できたことを見つけて。', action: '今日よかったことを三つ書く', lucky: '夕焼け色', categories: [{ label: '願望', text: '振り返りで近づく' }, { label: '健康', text: '心を静めて休む' }, { label: '学問', text: '復習に実りあり' }] },
];

export function localOmikujiDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hash(value: string) {
  let result = 2166136261;
  for (let i = 0; i < value.length; i++) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
  return result >>> 0;
}

export function fortuneForDay(day: string, petId: string) {
  return OMIKUJI_FORTUNES[hash(`${day}:${petId}:mobidou`) % OMIKUJI_FORTUNES.length];
}
