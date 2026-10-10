export type OmikujiFortune = {
  id: string;
  rank: '大吉' | '中吉' | '小吉' | '吉' | '末吉';
  title: string;
  message: string;
  action: string;
  lucky: string;
  categories: readonly { label: string; text: string }[];
};

export const OMIKUJI_CATEGORY_LABELS = ['学問', '願い事', '健康', '恋愛'] as const;
export type OmikujiCategoryLabel = typeof OMIKUJI_CATEGORY_LABELS[number];

const CATEGORY_FALLBACKS: Record<OmikujiCategoryLabel, readonly string[]> = {
  学問: ['復習に実りあり', 'ひとつずつ学べば吉', '静かな集中が力になる', '好奇心のまま進んで吉', '基礎を大切にすると伸びる'],
  願い事: ['焦らず進めば近づく', '小さな一歩を大切に', '人の助けを借りると吉', '願いを言葉にすると開ける', '待つ間も自分のペースで'],
  健康: ['体を温めて休むと吉', '深呼吸で心身が整う', 'よく歩きよく眠ると吉', '無理をせず早めの休息を', 'ひと息ついて水分も忘れずに'],
  恋愛: ['飾らない言葉が縁を結ぶ', '聞き上手になると吉', '笑顔からよい流れが生まれる', 'ゆっくり歩幅を合わせて吉', '素直な気持ちを言葉にして'],
};

export function categoriesForFortune(fortune: OmikujiFortune) {
  return OMIKUJI_CATEGORY_LABELS.map((label, labelIndex) => {
    const sourceLabel = label === '願い事' ? '願望' : label;
    const existing = fortune.categories.find(item => item.label === sourceLabel);
    const pool = CATEGORY_FALLBACKS[label];
    const fallbackIndex = hash(`${fortune.id}:${label}:${labelIndex}`) % pool.length;
    return { label, text: existing?.text ?? pool[fallbackIndex] };
  });
}

export const OMIKUJI_FORTUNES: readonly OmikujiFortune[] = [
  { id: 'morning-path', rank: '大吉', title: '朝の一歩が、道をひらく', message: '迷っていたことに小さな追い風。完璧を待たず、今日できる最初の一歩を。', action: 'いつもより5分早く外へ出る', lucky: '赤いペン', categories: [{ label: '願望', text: 'できることから少しずつ' }, { label: '待人', text: '笑顔とともに来る' }, { label: '旅立', text: '朝の出発が吉' }] },
  { id: 'kind-word', rank: '中吉', title: 'やさしい言葉が、ご縁を結ぶ', message: '何気ないひと言が誰かの心を軽くする日。先に挨拶すると運が巡ります。', action: 'ひとりに感謝を伝える', lucky: '温かいお茶', categories: [{ label: '対人', text: '素直な言葉が吉' }, { label: '仕事', text: '相談すると整う' }, { label: '健康', text: '肩の力を抜く' }] },
  { id: 'slow-river', rank: '吉', title: 'ゆるやかな流れに、福が宿る', message: '答えを急がないほど見えるものがあります。今日は予定に小さな余白を。', action: '深呼吸を三回する', lucky: '水辺の景色', categories: [{ label: '願望', text: '時を待てば整う' }, { label: '学問', text: '復習に実りあり' }, { label: '旅立', text: '寄り道に発見あり' }] },
  { id: 'small-light', rank: '小吉', title: '小さな灯りを、見逃さないで', message: '派手ではなくても確かな前進の日。昨日より少し良かったことを数えて。', action: 'できたことを一つ書く', lucky: 'ヘアゴム', categories: [{ label: '仕事', text: '丁寧さが評価される' }, { label: '恋愛', text: '聞き上手が吉' }, { label: '健康', text: '温めて休む' }] },
  { id: 'after-rain', rank: '末吉', title: '雨あがりのように、少しずつ', message: '思い通りでなくても運は育っています。整える日にすると明日が軽くなります。', action: '机の上を一か所だけ整える', lucky: '白い紙', categories: [{ label: '願望', text: '焦らず足元から' }, { label: '金運', text: '買う前に一晩置く' }, { label: '待人', text: '便りはゆっくり届く' }] },
  { id: 'new-breeze', rank: '大吉', title: '新しい風が、背中を押す', message: '今日は選び直す力があります。気になっていたことを一つ試すと景色が変わります。', action: '初めての道を少し歩く', lucky: '木漏れ日', categories: [{ label: '願望', text: '気になることを小さく試して' }, { label: '仕事', text: '新案に追い風' }, { label: '旅立', text: '方角を変えると吉' }] },
  { id: 'steady-root', rank: '中吉', title: '根を張るほど、花は近づく', message: '積み重ねが静かに形になる日。目立たない習慣こそ、今日の開運です。', action: 'いつもの習慣を一つ続ける', lucky: '木の香り', categories: [{ label: '学問', text: '反復に成果あり' }, { label: '金運', text: '小さな節約が吉' }, { label: '健康', text: '歩幅を整える' }] },
  { id: 'open-window', rank: '吉', title: '窓をひらけば、気持ちも巡る', message: '滞っていた気分に新しい風が入る日。環境を少し変えると考えがまとまります。', action: '窓を開けて空を見上げる', lucky: '青いタオル', categories: [{ label: '仕事', text: '場所を変えると進む' }, { label: '対人', text: '先入観を手放す' }, { label: '健康', text: '新鮮な空気が吉' }] },
  { id: 'warm-hand', rank: '小吉', title: 'ぬくもりは、近くにある', message: '遠くの答えより身近な支えに気づく日。頼ることも、ご縁を育てる一歩です。', action: '身近な人に声をかける', lucky: 'カイロ', categories: [{ label: '待人', text: '身近な場所に縁あり' }, { label: '恋愛', text: '飾らない会話が吉' }, { label: '願望', text: '協力で近づく' }] },
  { id: 'moon-rest', rank: '末吉', title: '休むことも、明日への支度', message: '力を足すより余分なものを減らしたい日。早めに区切ると運気が整います。', action: '今夜は10分早く休む', lucky: '三日月のキーホルダー', categories: [{ label: '健康', text: '睡眠を優先して吉' }, { label: '仕事', text: '抱え込みに注意' }, { label: '金運', text: '今日は守りが吉' }] },
  { id: 'clear-bell', rank: '大吉', title: '澄んだ音が、福を呼ぶ', message: '伝えたかったことが素直に届く日。短くても自分の言葉で話してみて。', action: '気持ちのよい返事をする', lucky: '鈴の音', categories: [{ label: '対人', text: '言葉がよく届く' }, { label: '願望', text: '宣言すると動き出す' }, { label: '学問', text: '音読が吉' }] },
  { id: 'one-page', rank: '中吉', title: '一頁から、物語が動く', message: '大きな目標も小さく始めれば続きます。最初の一行を今日の成果にして。', action: '本や資料を一頁だけ読む', lucky: 'しおり', categories: [{ label: '学問', text: '始めるほど身につく' }, { label: '仕事', text: '下書きに福あり' }, { label: '願望', text: '小分けにして取り組んで' }] },
  { id: 'sunny-corner', rank: '吉', title: '陽だまりに、答えがほどける', message: '考え込みすぎた心が軽くなる日。明るい場所でひと息つくと良い案が浮かびます。', action: '日なたで温かい飲み物を飲む', lucky: 'レモン', categories: [{ label: '仕事', text: '午後にひらめきあり' }, { label: '健康', text: '体を冷やさない' }, { label: '恋愛', text: '笑顔が縁を呼ぶ' }] },
  { id: 'tidy-pocket', rank: '小吉', title: '小さく整え、軽やかに', message: '手元を整えるほど次の行動が見える日。全部ではなく一か所で十分です。', action: '鞄かポケットを一つ整える', lucky: '小さな巾着', categories: [{ label: '金運', text: '忘れ物の確認が吉' }, { label: '仕事', text: '優先順位が整う' }, { label: '旅立', text: '荷物は軽めに' }] },
  { id: 'bridge-meeting', rank: '大吉', title: '橋の向こうに、新しいご縁', message: 'いつもと違う人や場所が幸運を運ぶ日。小さな誘いには前向きな返事を。', action: '普段話さない人に挨拶する', lucky: '橋のある景色', categories: [{ label: '待人', text: '思わぬ場所で会う' }, { label: '仕事', text: '新しい組合せが吉' }, { label: '旅立', text: '初めての場所へ' }] },
  { id: 'gentle-rain', rank: '中吉', title: '静かな雨が、芽を育てる', message: '目に見えない努力が根づく日。結果を急がず、今日の手入れを丁寧に。', action: '途中のことを一つ仕上げる', lucky: '透明な傘', categories: [{ label: '願望', text: '水面下で進む' }, { label: '学問', text: '静かな場所が吉' }, { label: '健康', text: '水分を忘れずに' }] },
  { id: 'good-detour', rank: '吉', title: '寄り道に、今日だけの宝物', message: '予定外の出来事が気分転換になる日。少しの遠回りを楽しむ余裕が福を呼びます。', action: '帰り道を少しだけ変える', lucky: '道端の花', categories: [{ label: '旅立', text: '寄り道に発見あり' }, { label: '対人', text: '偶然の会話が吉' }, { label: '金運', text: '小さな楽しみは吉' }] },
  { id: 'listen-first', rank: '小吉', title: '耳を澄ませば、道が見える', message: '今日は話すより聞くことで運が開きます。相手の言葉の奥に大切なヒントがありそう。', action: '最後まで遮らずに聞く', lucky: '静かな音楽', categories: [{ label: '対人', text: '聞き役に福あり' }, { label: '仕事', text: '確認すると整う' }, { label: '恋愛', text: '相手の歩幅を大切に' }] },
  { id: 'save-spark', rank: '末吉', title: '小さな火種を、大切に', message: '勢いより持続を選びたい日。やる気が少ない時は、消さない工夫だけで十分です。', action: '一分だけ手をつける', lucky: 'マッチ箱', categories: [{ label: '願望', text: '細く長く続ける' }, { label: '仕事', text: '無理な約束は避ける' }, { label: '健康', text: '疲れをためない' }] },
  { id: 'shared-smile', rank: '大吉', title: '分けた喜びが、倍になる', message: '嬉しいことを誰かと分かち合うほど福が広がる日。小さな朗報も言葉にして。', action: 'うれしかったことを一つ話す', lucky: 'お箸', categories: [{ label: '対人', text: '共感から縁が深まる' }, { label: '恋愛', text: '素直な喜びが吉' }, { label: '金運', text: '贈り物に福あり' }] },
  { id: 'evening-note', rank: '中吉', title: '夕暮れに、今日の福を数える', message: '終わったことを認めるほど明日が整う日。足りなかったことより、できたことを見つけて。', action: '今日よかったことを三つ書く', lucky: 'オレンジジュース', categories: [{ label: '願望', text: '振り返りで近づく' }, { label: '健康', text: '心を静めて休む' }, { label: '学問', text: '復習に実りあり' }] },
  { id: 'familiar-path', rank: '小吉', title: 'いつもの道に、小さな発見', message: '見慣れた道にも、季節の変化が隠れています。歩ける日は足元の花を、休む日は窓の外を眺めてみて。', action: '身近な景色の変化を一つ見つける', lucky: '道ばたの葉っぱ', categories: [{ label: '学問', text: '気になったことを一つ調べて' }, { label: '願望', text: '今できる小さなことから' }, { label: '健康', text: '疲れたら途中でひと息' }] },
  { id: 'quiet-bench', rank: '末吉', title: 'ひと息ついて、景色を眺める', message: '予定を少し緩めても大丈夫。座って空を眺める時間も、今日の大切なひとこまです。', action: '落ち着く場所でひと息つく', lucky: '木のベンチ', categories: [{ label: '学問', text: '短い時間で少しずつ' }, { label: '健康', text: '休む時間も大切に' }, { label: '恋愛', text: '返事は落ち着いてから' }] },
  { id: 'soft-footsteps', rank: '末吉', title: '歩幅は、今日の自分に合わせて', message: 'よく歩ける日も、休みたい日もあります。昨日と比べず、今の自分に心地よいペースを選んでみて。', action: '今日の気分をひと言で書く', lucky: 'やわらかな靴下', categories: [{ label: '願望', text: '今日は準備だけでも十分' }, { label: '健康', text: '無理のない歩幅で' }, { label: '恋愛', text: 'お互いのペースを大切に' }] },
  { id: 'little-margin', rank: '吉', title: '余白から、楽しみを見つける', message: 'すべてを終わらせなくても、今日を大切にできます。小さな楽しみをひとつ残して、ゆっくり過ごしてみて。', action: '好きな飲み物をゆっくり味わう', lucky: 'お気に入りの湯のみ', categories: [{ label: '学問', text: '一頁で区切ってもよい' }, { label: '願望', text: 'ひとつずつ順番に' }, { label: '恋愛', text: '何気ない会話を楽しんで' }] },
  { id: 'shrine-gate', rank: '大吉', title: '鳥居をくぐれば、気持ちが澄む', message: '一歩ごとに気分が切り替わる日。入口をくぐるつもりで、新しいことを始めてみて。', action: '深呼吸してから歩き出す', lucky: 'お守り', categories: [{ label: '学問', text: '新しい章は今日から' }, { label: '健康', text: '背すじを伸ばして吉' }, { label: '恋愛', text: '自然体がいちばん' }] },
  { id: 'first-light', rank: '大吉', title: '夜明けの光が、道を照らす', message: '早い時間ほど運が冴える日。静かな朝の空気が、今日の背中を押してくれます。', action: '朝の空を眺める', lucky: '金色のクリップ', categories: [{ label: '願望', text: '朝のうちに動くと吉' }, { label: '健康', text: '朝日を浴びて整う' }, { label: '恋愛', text: 'おはようが縁を呼ぶ' }] },
  { id: 'full-moon-path', rank: '大吉', title: '満ちる月の下、願いが育つ', message: '心にしまった願いが形になりやすい日。小さくても言葉にして残しておいて。', action: '願いを一行書き留める', lucky: '白い紙', categories: [{ label: '学問', text: '目標を書くと進む' }, { label: '願望', text: '口に出すほど近づく' }, { label: '恋愛', text: '本音を少しだけ話して' }] },
  { id: 'lucky-turn', rank: '大吉', title: '曲がり角で、福に出会う', message: 'いつもと違う角を曲がると良いことがありそう。迷ったら、行ったことのない方へ。', action: '一本違う道を選ぶ', lucky: '小さな地図', categories: [{ label: '学問', text: '違う角度から見ると吉' }, { label: '願望', text: '寄り道に答えがある' }, { label: '健康', text: 'よく歩けば運も巡る' }] },
  { id: 'rainbow-after', rank: '大吉', title: '空の端に、虹が待っている', message: '少し先に明るい景色がある日。今の頑張りは、ちゃんと空に届いています。', action: '空を見上げて三秒止まる', lucky: '色鉛筆', categories: [{ label: '学問', text: '努力が見えてくる' }, { label: '願望', text: 'もうひと息で届く' }, { label: '健康', text: '気分が晴れていく' }] },
  { id: 'festival-drum', rank: '大吉', title: '太鼓の音に、心が弾む', message: '気持ちが前向きに響く日。誘いがあれば乗ってみると、楽しい出会いが増えます。', action: '好きな曲を口ずさむ', lucky: '赤い提灯', categories: [{ label: '願望', text: '誘いに乗って吉' }, { label: '健康', text: '笑うほど元気になる' }, { label: '恋愛', text: 'にぎやかな場に縁あり' }] },
  { id: 'spring-bud', rank: '大吉', title: '蕾がほころぶ、うれしい知らせ', message: '待っていたことが動き出す日。焦らず迎えれば、良い形で届きます。', action: '連絡を一つ確認する', lucky: '桜餅', categories: [{ label: '学問', text: '良い知らせの予感' }, { label: '願望', text: '待った分だけ実る' }, { label: '恋愛', text: 'ほころぶ気配あり' }] },
  { id: 'golden-field', rank: '大吉', title: '黄金の野を、軽やかに行く', message: '努力が実を結びやすい日。積み重ねてきたことに、自信を持って進んで。', action: '得意なことを一つやる', lucky: '稲穂の飾り', categories: [{ label: '学問', text: '積み重ねが実る' }, { label: '願望', text: '収穫のとき' }, { label: '健康', text: 'よく食べよく歩く' }] },
  { id: 'river-sparkle', rank: '大吉', title: '川面のきらめきが、幸運の合図', message: '水辺に福が集まる日。流れを眺めるだけで、考えが軽くなります。', action: '水の近くを歩く', lucky: '透明なグラス', categories: [{ label: '学問', text: '考えが澄んでいく' }, { label: '健康', text: '水をひと口で整う' }, { label: '恋愛', text: '自然な流れに任せて' }] },
  { id: 'crane-wings', rank: '大吉', title: '鶴が舞い、道が広がる', message: '視野がぐっと広がる日。遠くまで見渡すと、新しい選択肢が見えてきます。', action: '高いところから景色を見る', lucky: '白い折り紙', categories: [{ label: '学問', text: '全体を見渡して吉' }, { label: '願望', text: '選択肢が増える' }, { label: '恋愛', text: '広い心で受け止めて' }] },
  { id: 'wish-lantern', rank: '大吉', title: '灯りに願いを込めて', message: '優しい気持ちが運を呼ぶ日。誰かの幸せを祈ると、自分にも返ってきます。', action: '誰かの幸せを心で願う', lucky: 'ランタン', categories: [{ label: '願望', text: '祈りがめぐってくる' }, { label: '健康', text: '穏やかな心が力に' }, { label: '恋愛', text: '思いやりが実る' }] },
  { id: 'big-wave', rank: '大吉', title: '大きな波に、のってみる', message: '流れが良い日。迷うより、まず乗ってみるのが吉。きっと運んでくれます。', action: '先延ばしを一つ片づける', lucky: '青いペン', categories: [{ label: '学問', text: '勢いのまま進んで' }, { label: '願望', text: '波に乗れば近い' }, { label: '健康', text: '体を動かすと吉' }] },
  { id: 'star-night', rank: '大吉', title: '星がそろう、とっておきの日', message: '巡り合わせが良く、物事が噛み合う日。感謝を口にすると、さらに運が巡ります。', action: 'ありがとうを三回言う', lucky: '星の形のもの', categories: [{ label: '学問', text: 'ひらめきが冴える' }, { label: '恋愛', text: 'よい巡り合わせあり' }, { label: '健康', text: 'よく眠れば万全' }] },
  { id: 'new-shoes', rank: '大吉', title: '新しい靴で、遠くまで', message: '軽やかな足取りで進める日。いつもより少し遠くまで、歩いてみて。', action: 'いつもより少し長く歩く', lucky: '履き慣れた靴', categories: [{ label: '願望', text: '遠くまで行けそう' }, { label: '健康', text: '足取りが軽い日' }, { label: '恋愛', text: '一歩踏み出して吉' }] },
  { id: 'bright-gate', rank: '大吉', title: '笑顔が、福の入口になる', message: '表情ひとつで流れが変わる日。口角を上げるだけで、周りの空気も和らぎます。', action: '鏡に向かって微笑む', lucky: '小さな鏡', categories: [{ label: '学問', text: '楽しむほど身につく' }, { label: '健康', text: '笑顔がいちばんの薬' }, { label: '恋愛', text: 'やさしい表情が吉' }] },
  { id: 'tea-time', rank: '中吉', title: '湯気の向こうに、ひらめき', message: '温かい飲み物が、思考をほぐす日。ひと休みの中に、良い案が眠っています。', action: 'ゆっくりお茶を味わう', lucky: '湯のみ', categories: [{ label: '学問', text: '休憩のあとに冴える' }, { label: '健康', text: '温かい飲み物で整う' }, { label: '恋愛', text: 'ゆっくり話して吉' }] },
  { id: 'stone-steps', rank: '中吉', title: '石段は一段ずつ、確かに', message: '急がず積み上げるほど力になる日。今日の一段を丁寧に。', action: '階段を選んで上る', lucky: '丸い小石', categories: [{ label: '学問', text: '一歩ずつ確実に' }, { label: '願望', text: '着実に近づく' }, { label: '健康', text: '足腰を労わって' }] },
  { id: 'wind-chime', rank: '中吉', title: '風鈴が、涼やかに知らせる', message: '小さな気づきが役立つ日。周りの変化に耳を澄ませてみて。', action: '周りの音に耳を傾ける', lucky: '風鈴', categories: [{ label: '学問', text: '小さな発見が鍵' }, { label: '願望', text: '兆しを見逃さずに' }, { label: '恋愛', text: '相手の声に耳を傾けて' }] },
  { id: 'old-friend', rank: '中吉', title: '懐かしい顔が、運を連れてくる', message: '昔のつながりが良い方向に動く日。ふと思い出した人に、ひと言送ってみて。', action: '懐かしい人を思い出す', lucky: '古い写真', categories: [{ label: '願望', text: '縁が巡ってくる' }, { label: '健康', text: '昔の習慣が助けに' }, { label: '恋愛', text: '懐かしさが縁に' }] },
  { id: 'seed-sowing', rank: '中吉', title: '小さな種を、今日まいておく', message: '今の行動が未来の実りになる日。結果を気にせず、まずまくこと。', action: '新しいことの準備を始める', lucky: '小さな鉢', categories: [{ label: '学問', text: '始めた分だけ実る' }, { label: '願望', text: '種まきの好機' }, { label: '健康', text: '習慣づくりに吉' }] },
  { id: 'cloud-watch', rank: '中吉', title: '流れる雲に、肩の力を抜く', message: '無理に進まなくても大丈夫な日。のんびりが、後の力になります。', action: '雲の形を探す', lucky: '白いハンカチ', categories: [{ label: '学問', text: '肩の力を抜いて吉' }, { label: '健康', text: 'ゆるめるほど整う' }, { label: '恋愛', text: '気楽に構えて吉' }] },
  { id: 'paper-crane', rank: '中吉', title: '折った鶴に、願いをのせて', message: '丁寧な手仕事が運を整える日。小さな作業に、心を込めてみて。', action: '手を動かして何かを作る', lucky: '折り紙', categories: [{ label: '学問', text: '手を動かすと覚える' }, { label: '願望', text: 'ていねいさが鍵' }, { label: '恋愛', text: '小さな心づかいが吉' }] },
  { id: 'market-day', rank: '中吉', title: 'にぎわいの中に、掘り出し物', message: '人の集まる場所で良い出会いがある日。気になるものは、のぞいてみて。', action: '気になる店をのぞく', lucky: 'エコバッグ', categories: [{ label: '学問', text: '新しい情報に出会う' }, { label: '願望', text: '掘り出し物の予感' }, { label: '恋愛', text: '人混みに縁あり' }] },
  { id: 'evening-glow', rank: '中吉', title: '夕焼けが、今日をねぎらう', message: '頑張りが認められる日。空の色を眺めて、自分に「おつかれさま」を。', action: '夕空を眺める', lucky: 'みかん', categories: [{ label: '学問', text: '今日の成果を認めて' }, { label: '健康', text: 'ねぎらいが回復に' }, { label: '恋愛', text: '感謝を伝えて吉' }] },
  { id: 'mountain-view', rank: '中吉', title: '山の向こうに、次の景色', message: '少し先を見て動くと良い日。目標を一つだけ、遠くに置いてみて。', action: '次の目標を一つ決める', lucky: '山のポストカード', categories: [{ label: '学問', text: '先を見て計画を' }, { label: '願望', text: '遠い目標に光あり' }, { label: '健康', text: '景色を見て心を休めて' }] },
  { id: 'careful-pack', rank: '中吉', title: '荷づくりが、旅を軽くする', message: '準備が運を呼ぶ日。持ち物や予定を整えると、物事がスムーズに。', action: '明日の準備を一つする', lucky: 'ポーチ', categories: [{ label: '学問', text: '準備をすれば安心' }, { label: '願望', text: '段取りが運を呼ぶ' }, { label: '健康', text: '備えあれば憂いなし' }] },
  { id: 'hot-spring', rank: '中吉', title: 'ほっと、湯気に包まれる', message: '心身を労わるほど運が上向く日。今日は自分に優しく過ごして。', action: 'ゆっくり湯につかる', lucky: '湯上がりタオル', categories: [{ label: '願望', text: '休んで力を蓄えて' }, { label: '健康', text: '温まるほど整う' }, { label: '恋愛', text: '自分を大切にして吉' }] },
  { id: 'bamboo-grove', rank: '中吉', title: '竹林に、まっすぐな風', message: 'まっすぐな気持ちが届く日。飾らない言葉で、思いを伝えてみて。', action: '思ったことを素直に話す', lucky: '竹のうちわ', categories: [{ label: '学問', text: '基本に立ち返って吉' }, { label: '願望', text: 'まっすぐ進んで吉' }, { label: '恋愛', text: '飾らない言葉が届く' }] },
  { id: 'map-open', rank: '中吉', title: '地図を広げれば、道が見える', message: '全体を見ると安心できる日。やることを書き出して、整えてみて。', action: '予定を紙に書き出す', lucky: '手帳', categories: [{ label: '学問', text: '全体像をつかんで吉' }, { label: '願望', text: '道筋が見えてくる' }, { label: '健康', text: '生活を整えて吉' }] },
  { id: 'lantern-road', rank: '中吉', title: '提灯の道を、ゆったりと', message: '周りの助けが得られる日。頼ることが、良い縁を結びます。', action: '一つだけ人に頼る', lucky: '提灯', categories: [{ label: '学問', text: '教わると進む' }, { label: '願望', text: '助けを借りて吉' }, { label: '恋愛', text: '頼り合える縁あり' }] },
  { id: 'mild-sun', rank: '吉', title: 'やわらかな日差しに、歩を合わせて', message: '穏やかに過ごせる日。無理をせず、自分のペースで歩くと気持ちよく進みます。', action: '日なたを選んで歩く', lucky: '日よけの帽子', categories: [{ label: '学問', text: '落ち着いて進めて吉' }, { label: '健康', text: '日なたでひと息' }, { label: '恋愛', text: 'ゆったりと構えて' }] },
  { id: 'fallen-leaf', rank: '吉', title: '落ち葉の道に、季節を拾う', message: '季節の移ろいを楽しむと運が整う日。足元の小さな変化に気づいてみて。', action: '落ちている葉を一枚見つける', lucky: '紅葉の栞', categories: [{ label: '学問', text: '小さな変化に気づく' }, { label: '願望', text: '季節に身を任せて' }, { label: '健康', text: '外の空気で整う' }] },
  { id: 'bakery-smell', rank: '吉', title: '焼きたての香りに、元気が湧く', message: '小さな楽しみが力になる日。好きな味を、今日のごほうびにして。', action: '好きなおやつを味わう', lucky: '紙袋', categories: [{ label: '学問', text: 'ごほうびで頑張れる' }, { label: '健康', text: 'おいしく食べて元気' }, { label: '恋愛', text: '分け合うと吉' }] },
  { id: 'cat-nap', rank: '吉', title: 'ひなたで、猫のように', message: '休むことも才能の日。少し目を閉じるだけで、気分が整います。', action: '五分だけ目を閉じる', lucky: 'ふわふわの毛布', categories: [{ label: '願望', text: '休んでから動いて吉' }, { label: '健康', text: '短い休息が効く' }, { label: '恋愛', text: '自分のペースで' }] },
  { id: 'stamp-day', rank: '吉', title: '判を押す日、気持ちも締まる', message: '区切りをつけると気持ちよく進める日。やりかけを一つ終わらせて。', action: 'やりかけを一つ終える', lucky: '判子', categories: [{ label: '学問', text: '区切りをつけて吉' }, { label: '願望', text: 'ひとつ片づけて前へ' }, { label: '健康', text: '生活にけじめを' }] },
  { id: 'pebble-skip', rank: '吉', title: '小石が、水面をはねる', message: '軽い気持ちで試すとうまくいく日。深く考えず、まず一回やってみて。', action: '気軽に一つ試す', lucky: '平たい石', categories: [{ label: '学問', text: 'まず試して吉' }, { label: '願望', text: '軽やかな一歩を' }, { label: '恋愛', text: '気軽な会話が吉' }] },
  { id: 'city-lights', rank: '吉', title: '街の灯りが、心を温める', message: '日常の中に、温かさが見つかる日。帰り道の景色を、ゆっくり眺めて。', action: '帰り道で足を止める', lucky: 'LEDライト', categories: [{ label: '学問', text: '夜の静けさで集中' }, { label: '健康', text: '穏やかな夜を' }, { label: '恋愛', text: '温かさに気づいて' }] },
  { id: 'song-hum', rank: '吉', title: '鼻歌まじりに、道をゆく', message: '気分が上向くと運も付いてくる日。好きな歌を、歩きながら思い出して。', action: '好きな曲を聴く', lucky: 'イヤホン', categories: [{ label: '学問', text: '楽しく覚えて吉' }, { label: '健康', text: '歌うと気分が晴れる' }, { label: '恋愛', text: '好きなものを共有して' }] },
  { id: 'pocket-sweet', rank: '吉', title: 'ポケットの中の、小さな幸せ', message: '身近なものに助けられる日。持っているものを、見直してみて。', action: '持ち物を一つ見直す', lucky: '飴玉', categories: [{ label: '学問', text: '手持ちの知識で十分' }, { label: '願望', text: '身近にヒントあり' }, { label: '健康', text: '小さな補給を忘れずに' }] },
  { id: 'bench-chat', rank: '吉', title: 'ベンチで、ひと言の会話', message: '何気ない会話が心を軽くする日。誰かと目が合ったら、ひと言交わして。', action: '近くの人に挨拶する', lucky: '木のベンチ', categories: [{ label: '学問', text: '人に聞いて吉' }, { label: '健康', text: '話すと心が軽い' }, { label: '恋愛', text: 'ひと言から始まる' }] },
  { id: 'garden-water', rank: '吉', title: '草花に水を、心に余白を', message: '世話をするほど心が満ちる日。身近なものを、丁寧に扱って。', action: '植物に水をやる', lucky: '小さな鉢植え', categories: [{ label: '学問', text: 'こつこつ育てて吉' }, { label: '願望', text: '世話した分だけ実る' }, { label: '恋愛', text: '気づかいが実る' }] },
  { id: 'echo-hill', rank: '吉', title: '山びこのように、よい返事が', message: '発した言葉が良い形で返ってくる日。柔らかい言い方を心がけて。', action: 'やさしい言葉を選ぶ', lucky: '鈴のストラップ', categories: [{ label: '学問', text: '質問すると返ってくる' }, { label: '願望', text: '言葉が道をひらく' }, { label: '恋愛', text: 'やさしい言葉が吉' }] },
  { id: 'book-corner', rank: '吉', title: '本の隅に、心強い言葉', message: '言葉が支えになる日。気になる一節を、メモしてみて。', action: '好きな言葉を書き写す', lucky: 'ブックカバー', categories: [{ label: '学問', text: '読むほど深まる' }, { label: '願望', text: '言葉が背中を押す' }, { label: '恋愛', text: '一冊が話題に' }] },
  { id: 'steady-breath', rank: '吉', title: '呼吸をそろえて、足をそろえて', message: 'リズムを整えると流れが良くなる日。ゆっくり息を吐いて歩き出して。', action: '息を長く吐く', lucky: 'ミントのタブレット', categories: [{ label: '学問', text: 'リズムを整えて吉' }, { label: '健康', text: '呼吸を深く' }, { label: '恋愛', text: '相手のペースに合わせて' }] },
  { id: 'corner-cafe', rank: '吉', title: '角のお店に、ほっとする時間', message: '小さな居場所が力をくれる日。お気に入りの場所で、少し休んで。', action: 'お気に入りの場所で休む', lucky: '小さなカップ', categories: [{ label: '学問', text: '落ち着く場所で集中' }, { label: '健康', text: '居場所が元気をくれる' }, { label: '恋愛', text: 'いつもの場所に縁あり' }] },
  { id: 'morning-dew', rank: '小吉', title: '朝露のように、すがすがしく', message: '小さなことが気持ちよく整う日。朝の空気を、少し多めに吸ってみて。', action: '窓を開けて空気を入れかえる', lucky: 'ペットボトルの水', categories: [{ label: '学問', text: '朝の十分が効く' }, { label: '健康', text: '朝の空気で整う' }, { label: '恋愛', text: 'すがすがしい挨拶を' }] },
  { id: 'gentle-stretch', rank: '小吉', title: '背伸びして、空気を入れかえる', message: '体をほぐすと気持ちも軽くなる日。ひと伸びして、息を深く。', action: '大きく背伸びをする', lucky: 'ヨガマット', categories: [{ label: '学問', text: '体をほぐして集中' }, { label: '願望', text: '気持ちを切り替えて' }, { label: '健康', text: 'ストレッチが吉' }] },
  { id: 'spare-time', rank: '小吉', title: 'すきま時間に、小さな喜び', message: '短い時間が宝物になる日。ほんの数分を、好きなことに使ってみて。', action: '五分だけ好きなことをする', lucky: '好きな栞', categories: [{ label: '学問', text: '短時間の集中が吉' }, { label: '願望', text: 'すきまに運あり' }, { label: '健康', text: '小休止を忘れずに' }] },
  { id: 'button-fix', rank: '小吉', title: 'ほつれを直して、気持ちを整える', message: '小さな手入れが気分を変える日。気になっていた綻びを、一つ直してみて。', action: '気になっていた綻びを一つ直す', lucky: '針と糸', categories: [{ label: '学問', text: '見直しが実を結ぶ' }, { label: '願望', text: '小さな修繕が吉' }, { label: '恋愛', text: 'ささいな誤解をほどく' }] },
  { id: 'shared-umbrella', rank: '小吉', title: '傘を寄せれば、距離も近づく', message: 'ささやかな思いやりが縁になる日。譲る気持ちが、気持ちよく巡ります。', action: '席や道を一つ譲る', lucky: '折りたたみ傘', categories: [{ label: '学問', text: '教え合って吉' }, { label: '健康', text: '人のぬくもりに癒される' }, { label: '恋愛', text: '寄り添うと吉' }] },
  { id: 'flower-corner', rank: '小吉', title: '花屋の前で、足を止める', message: '彩りが気分を明るくする日。季節の色を、少しだけ取り入れてみて。', action: '季節の花を眺める', lucky: '小さな花', categories: [{ label: '願望', text: '彩りを足して吉' }, { label: '健康', text: '目に優しい色を' }, { label: '恋愛', text: '花のように穏やかに' }] },
  { id: 'slow-sip', rank: '小吉', title: 'ゆっくり飲むと、ゆっくり満ちる', message: '急がないほど満たされる日。一口ずつ、味わうことを大切に。', action: 'ひと口ずつ味わう', lucky: '白いカップ', categories: [{ label: '学問', text: 'ゆっくり噛みしめて' }, { label: '健康', text: 'ゆっくり食べて吉' }, { label: '恋愛', text: 'じっくり話して吉' }] },
  { id: 'lantern-moth', rank: '小吉', title: '小さな灯りに、寄ってくる幸せ', message: '身近な明かりが運を運ぶ日。夜は少し、灯りを落として過ごしてみて。', action: '部屋の灯りを少し落とす', lucky: '卓上のあかり', categories: [{ label: '学問', text: '夜は静かに復習を' }, { label: '願望', text: '小さな光を大切に' }, { label: '健康', text: '夜は穏やかに' }] },
  { id: 'paper-note', rank: '小吉', title: 'ふせんに書いた、小さな約束', message: '小さな約束が力になる日。今日やることを、ひとつだけ書いておいて。', action: '今日の約束を一つ書く', lucky: '付箋', categories: [{ label: '学問', text: '書くと身につく' }, { label: '願望', text: '書いた約束は叶う' }, { label: '恋愛', text: '小さな約束を守って' }] },
  { id: 'morning-toast', rank: '小吉', title: '朝ごはんが、今日を支える', message: '整った朝が一日を支える日。温かいものを、ひと口入れてから動いて。', action: '温かい朝食をとる', lucky: 'お気に入りの皿', categories: [{ label: '学問', text: '朝の栄養が頭に効く' }, { label: '健康', text: '朝食で整う' }, { label: '恋愛', text: '朝の挨拶を大切に' }] },
  { id: 'window-seat', rank: '小吉', title: '窓際の席で、景色をひとり占め', message: '気分転換が効く日。景色の見える席を選ぶと、考えがまとまります。', action: '窓際の席を選ぶ', lucky: '小さな双眼鏡', categories: [{ label: '学問', text: '景色を見て休憩を' }, { label: '願望', text: '眺めて考えをまとめて' }, { label: '健康', text: '外を見て目を休めて' }] },
  { id: 'clean-desk', rank: '小吉', title: 'きれいな机に、風が通る', message: '整えるほど気持ちが軽くなる日。手元の一角だけ、きれいにしてみて。', action: '机の上を一か所拭く', lucky: 'やわらかな布巾', categories: [{ label: '学問', text: '整理して集中力アップ' }, { label: '願望', text: '片づけて運も整う' }, { label: '健康', text: '空間を整えて吉' }] },
  { id: 'old-song', rank: '小吉', title: '懐かしい歌に、元気をもらう', message: '思い出が力になる日。昔好きだった曲を、今日は聴いてみて。', action: '昔好きだった曲を聴く', lucky: '古いカセット', categories: [{ label: '学問', text: '思い出して覚え直す' }, { label: '健康', text: '懐かしさで元気に' }, { label: '恋愛', text: '思い出話が縁に' }] },
  { id: 'sunny-laundry', rank: '小吉', title: '洗いたての布に、気分も晴れる', message: '清潔さが気持ちを軽くする日。身の回りの布ものを、ひとつ洗ってみて。', action: 'タオルやハンカチを洗う', lucky: '洗いたてのシャツ', categories: [{ label: '学問', text: '気分一新で集中' }, { label: '願望', text: '清めると運も上向く' }, { label: '健康', text: '清潔にして吉' }] },
  { id: 'candy-trade', rank: '小吉', title: '小さな贈り物が、縁をつなぐ', message: 'ささやかな分け合いが運を呼ぶ日。お菓子をひとつ、誰かにお裾分けして。', action: '小さなものを誰かに渡す', lucky: '個包装のお菓子', categories: [{ label: '学問', text: '教え合うほど身につく' }, { label: '願望', text: '分け合って吉' }, { label: '恋愛', text: 'お裾分けが縁に' }] },
  { id: 'sleepy-day', rank: '末吉', title: 'のんびり日和、無理しない', message: '力を抜くほど整う日。今日は、頑張らないことを目標にしてみて。', action: '予定を一つ減らす', lucky: 'やわらかなクッション', categories: [{ label: '学問', text: '今日は軽めに' }, { label: '健康', text: '休息を優先して吉' }, { label: '恋愛', text: '焦らず待って吉' }] },
  { id: 'puddle-step', rank: '末吉', title: '水たまりをよけて、一歩ずつ', message: '足元に気をつけるほど安心な日。慌てず、確かめながら進んで。', action: '足元を見て歩く', lucky: '長靴', categories: [{ label: '学問', text: '見直しで安心' }, { label: '願望', text: '慎重に進んで吉' }, { label: '健康', text: '足元に気をつけて' }] },
  { id: 'deep-sleep', rank: '末吉', title: 'ぐっすり眠って、運を貯める', message: '休息が最良の開運になる日。今夜は、早めに灯りを消してみて。', action: '早めに布団に入る', lucky: '枕', categories: [{ label: '学問', text: '寝る前の復習が吉' }, { label: '願望', text: '休んで明日に託す' }, { label: '健康', text: '睡眠がいちばん' }] },
  { id: 'warm-blanket', rank: '末吉', title: '毛布にくるまる、静かな時間', message: '静けさが心を整える日。何もしない時間を、自分に許してあげて。', action: '静かな音楽を聴く', lucky: '毛布', categories: [{ label: '学問', text: '無理せず切り上げて' }, { label: '願望', text: '休む勇気も大切' }, { label: '恋愛', text: '静かな時間を共に' }] },
  { id: 'loose-plan', rank: '末吉', title: '予定をゆるめて、気楽に', message: '余白があるほど楽になる日。予定に、少しすき間を作ってみて。', action: '予定の間に十分あける', lucky: '余白のある手帳', categories: [{ label: '学問', text: '余裕を持って進めて' }, { label: '願望', text: '気楽に構えて吉' }, { label: '健康', text: '詰め込みすぎない' }] },
  { id: 'small-mistake', rank: '末吉', title: '小さな失敗も、味になる', message: 'うっかりも笑える日。気にしすぎず、ひとつ学んだと思えば十分です。', action: '失敗を一つ笑い話にする', lucky: '消しゴム', categories: [{ label: '学問', text: '間違いが力になる' }, { label: '願望', text: 'やり直せば吉' }, { label: '恋愛', text: '失敗も愛嬌に' }] },
  { id: 'candle-room', rank: '末吉', title: 'ろうそくの灯りで、心を静かに', message: '静かな灯りが心を落ち着ける日。夜は、少し暗めの部屋で過ごしてみて。', action: '照明を少しやわらかくする', lucky: 'アロマキャンドル', categories: [{ label: '学問', text: '静かな場所で読書を' }, { label: '健康', text: '夜は穏やかに過ごして' }, { label: '恋愛', text: 'ゆったり語らって吉' }] },
  { id: 'old-album', rank: '末吉', title: '古いアルバムに、元気の素', message: '思い出が力をくれる日。懐かしい写真を、ひとつ眺めてみて。', action: '懐かしい写真を一枚見る', lucky: 'アルバム', categories: [{ label: '願望', text: '原点を思い出して吉' }, { label: '健康', text: '思い出で心が満ちる' }, { label: '恋愛', text: '昔話に花が咲く' }] },
  { id: 'early-bath', rank: '末吉', title: '早めのお風呂で、リセット', message: '早めの区切りが運を整える日。今夜は、いつもより少し早めに湯を沸かして。', action: '早めにお風呂に入る', lucky: '入浴剤', categories: [{ label: '学問', text: '夜更かしは控えめに' }, { label: '健康', text: '温まって早めに休んで' }, { label: '恋愛', text: '気持ちを落ち着けて' }] },
  { id: 'slow-morning', rank: '末吉', title: 'ゆっくりな朝も、悪くない', message: '急がない朝が穏やかな一日をつくる日。いつもより五分、ゆとりを持って。', action: '五分早く起きてみる', lucky: 'マグカップ', categories: [{ label: '学問', text: '朝はゆっくり始めて' }, { label: '願望', text: '急がず進んで吉' }, { label: '健康', text: '朝の白湯が吉' }] },
  { id: 'cloudy-sky', rank: '末吉', title: 'くもり空でも、道は続く', message: '晴れでなくても前に進める日。曇りの日にしか見えない景色も、あります。', action: '曇り空の写真を撮る', lucky: '灰色のパーカー', categories: [{ label: '学問', text: '地道に続けて吉' }, { label: '願望', text: '曇りでも道は続く' }, { label: '恋愛', text: '穏やかな関係に感謝を' }] },
  { id: 'dust-off', rank: '末吉', title: 'ほこりを払って、気持ちも軽く', message: '溜まったものを手放す日。使っていないものを、ひとつ整理してみて。', action: 'いらないものを一つ手放す', lucky: '小さなはたき', categories: [{ label: '学問', text: '古いメモを整理して' }, { label: '願望', text: '手放して身軽に' }, { label: '健康', text: '身の回りを整えて' }] },
  { id: 'lazy-sunday', rank: '末吉', title: '何もしない時間を、許してあげる', message: '休むことも前進の日。今日は、何もしない時間をゆるしてみて。', action: 'ぼんやりする時間をとる', lucky: 'のんびりした音楽', categories: [{ label: '学問', text: '休んでまた明日' }, { label: '健康', text: 'のんびりが薬' }, { label: '恋愛', text: '一人の時間も大切に' }] },
  { id: 'soft-landing', rank: '末吉', title: 'やわらかく着地する、今日', message: '静かに一日を終える日。最後の三十分を、ゆるやかに過ごしてみて。', action: '寝る前にストレッチをする', lucky: 'やわらかな寝巻き', categories: [{ label: '学問', text: '今日の復習は軽く' }, { label: '願望', text: '一日を静かに締めて' }, { label: '健康', text: '夜は穏やかに' }] },
  { id: 'half-moon', rank: '末吉', title: '半分の月も、ちゃんと美しい', message: '完璧でなくても大丈夫な日。足りないところも、今日のあなたの形です。', action: 'できたことを一つ数える', lucky: 'お月見だんご', categories: [{ label: '学問', text: '半分できれば上出来' }, { label: '願望', text: '七分目で十分' }, { label: '恋愛', text: 'ありのままで吉' }] },
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
