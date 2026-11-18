(() => {
  "use strict";
  const KEY = "kotobaAI_v2";
  const THEME_KEY = "kotobaAI_theme";
  const $ = (id) => document.getElementById(id);
  const segmenter = typeof Intl !== "undefined" && Intl.Segmenter
    ? new Intl.Segmenter("ja", {granularity:"word"}) : null;
  const fresh = () => ({version:2, vocabulary:{}, utterances:[], messages:[], turns:0});
  let data = load();
  let toastTimer;
  function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&x.version===2&&x.vocabulary&&Array.isArray(x.utterances)&&Array.isArray(x.messages))return x;}catch(e){}return fresh();}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(e){notify("保存できませんでした。ブラウザの保存容量を確認してください。");}}
  function tokenize(text){
    const cleaned = text.normalize("NFKC").trim();
    if(!cleaned)return [];
    const parts = segmenter ? [...segmenter.segment(cleaned)].filter(x=>x.isWordLike).map(x=>x.segment) : cleaned.match(/[一-龯々〆ヵヶぁ-んァ-ヶー]+|[a-zA-Z0-9]+/g)||[];
    return parts.map(x=>x.toLowerCase()).filter(x=>x.length>0);
  }
  // 乱暴な言葉は語彙・会話例に登録しない
  const blockedWords = new Set(["死ね","しね","カス","かす","くず","クズ","ばか","バカ","あほ","アホ","ころす","殺す"]);
  function isBlocked(word){return blockedWords.has(word.toLowerCase());}
  function containsBlockedText(text){const normalized=text.normalize("NFKC").toLowerCase();return [...blockedWords].some(word=>normalized.includes(word));}
  function learn(text){
    if(containsBlockedText(text))return [];
    const tokens=tokenize(text).filter(token=>!isBlocked(token));
    for(const token of tokens)data.vocabulary[token]=(data.vocabulary[token]||0)+1;
    if(tokens.length)data.utterances.push({tokens, text:tokens.join(" "), at:Date.now()});
    if(data.utterances.length>600)data.utterances=data.utterances.slice(-600);
    return tokens;
  }
  function overlap(a,b){
    const aa=new Set(a),bb=new Set(b);let hit=0;
    for(const w of aa)if(bb.has(w))hit++;
    return hit/(aa.size+bb.size-hit||1);
  }
  function makeLearnedReply(inputTokens,inputText){
    const safeInput=inputTokens.filter(token=>!isBlocked(token));
    if(containsBlockedText(inputText) || (inputTokens.length && safeInput.length===0))return "その言葉は学習しないよ。別の言葉で話してね。";

    const text=inputText.normalize("NFKC").trim();
    const choose=(items)=>{
      // 直前の返事と同じになりにくいよう、最近の返答を避ける
      const recent=data.messages.filter(m=>m.role==="bot"&&!m.system).slice(-2).map(m=>m.text);
      const candidates=items.filter(item=>!recent.includes(item));
      const pool=candidates.length?candidates:items;
      return pool[data.turns%pool.length];
    };

    if(/^(おはよう|おはようございます)/.test(text))return choose(["おはよう！今日はどんな予定？","おはよう！朝から来てくれたんだね。","おはよう！何か話したいことある？"]);
    if(/^(こんにちは|こんちは)/.test(text))return choose(["こんにちは！今日は何の話をしようか？","やあ、こんにちは！何か面白いことあった？","こんにちは！気軽に話してね。"]);
    if(/^(こんばんは|こんばんわ)/.test(text))return choose(["こんばんは！今日はどんな一日だった？","こんばんは！今は何してた？","やあ、こんばんは！"]);
    if(/^(やあ|よっ|おっす)/.test(text))return choose(["やあ！今日はどうした？","おっす！何か話そう！","お、来たね！何の話にする？"]);
    if(/ありがとう|ありがと/.test(text))return choose(["どういたしまして！","いえいえ、こちらこそ！","役に立てたならよかった！"]);
    if(/ごめん|すみません|申し訳/.test(text))return choose(["大丈夫だよ！","気にしなくていいよ。","全然平気！"]);
    if(/元気/.test(text))return choose(["ぼくは元気だよ！そっちは？","元気！今日は何を話そうか？","なかなか調子いいよ。きみは？"]);

    // よく出る話題は、言葉に合わせて返す（ここは内蔵ルールで、会話から勝手に学習はしない）
    const topics=[
      {words:["凍る","凍っ","氷","冷凍","凍結"], replies:["「"+text+"」だね。水が氷になるような、冷たさに関係する言葉だね！","凍る話だ！水や地面、ものが凍る場面を思い浮かべるね。","「"+text+"」について、意味を深掘りする？それとも例文を考える？"]},
      {words:["雪","雨","雲","天気","台風","雷"], replies:["天気の話だね！今の季節や場所によっても変わりそう。","自然の話は面白いね。どんなところが気になった？","その言葉から天気を連想したよ。仕組みの話をする？"]},
      {words:["ゲーム","マイクラ","マインクラフト","スイッチ","switch"], replies:["ゲームの話だね！最近遊んだゲームのこと？","ゲームいいね！どんな作品や遊び方の話をしようか？","ゲームの話題だ！好きなところを聞かせてよ。"]},
      {words:["学校","授業","宿題","テスト","先生"], replies:["学校の話だね。授業のこと？それとも学校生活のこと？","学校っていろいろ話題があるよね。何があった？","勉強の話なら一緒に整理できるよ。どの教科？"]},
      {words:["歴史","天皇","平安","飛鳥","武将","卑弥呼"], replies:["歴史の話だね！人物・出来事・時代のどれが気になる？","昔の出来事って、つながりを調べると面白いよね。","歴史きた！誰やどの時代について話そうか？"]},
      {words:["ラップ","韻","リリック","ビート"], replies:["ラップの話だ！言葉選びや韻のこと？","韻を踏むなら、どんな言葉から始める？","ラップいいね。フレーズ作りの話もできるよ！"]},
      {words:["AI","人工知能","ことばAI"], replies:["AIの話だね！仕組みのこと？それともAIを作る話？","AIってできることがどんどん広がってるね。どこが気になる？","ことばAI自身の改善案かな？それなら一緒に考えよう！"]},
      {words:["バドミントン","ラケット","シャトル"], replies:["バドミントンの話だね！試合・練習・道具のどれについて？","ラリーやショットの話かな？もう少し聞かせて！","スポーツの話題だ！最近の出来事？"]},
      {words:["漫画","マンガ","アニメ"], replies:["漫画やアニメの話だね！作品のこと？キャラクターのこと？","そのジャンルいいね。どの作品について話そうか？","好きな作品の話かな？どんなところが気に入ってる？"]}
    ];
    const topic=topics.find(t=>t.words.some(word=>text.toLowerCase().includes(word.toLowerCase())));
    if(topic)return choose(topic.replies);

    if(/^[ぁ-んァ-ヶ一-龯々ー]{1,5}$/.test(text) && !/[。！？!?]/.test(text)){
      if(text==="あ"||text==="え"||text==="うん")return choose(["おっ、どうした？","何か思いついた？","続きがありそうだね。聞かせて！"]);
      if(text.length<=2)return choose(["短い言葉だね！もう少し続けてみて。","それはどういう意味で言ったの？","その一言、もうちょっと詳しく聞きたい！"]);
      return choose(["「"+text+"」について話したいんだね。意味・使い方・思いついたことのどれかな？","「"+text+"」か！それはどんな場面で使う言葉？","その言葉が気になった理由を聞いてもいい？"]);
    }

    if(/[？?]/.test(text) || /^(なに|何|どうして|なんで|いつ|どこ|だれ|誰)/.test(text))return choose(["質問だね！分かる範囲で一緒に考えるよ。","そこが気になったんだね。もう少し詳しく教えて！","いい質問！どの部分を知りたい？"]);
    if(/[！!]/.test(text))return choose(["おお、勢いがあるね！何があった？","その話、続きが気になる！","おっ！特にどこが面白かった？"]);

    const known=safeInput.filter(token=>data.vocabulary[token]);
    const ranked=data.utterances.filter(x=>x.tokens.length && !containsBlockedText(x.text) && x.tokens.every(w=>!isBlocked(w)))
      .map(x=>({x,score:overlap(safeInput,x.tokens)})).sort((a,b)=>b.score-a.score);
    if(ranked.length && ranked[0].score>=0.5)return choose(["前に覚えた「"+ranked[0].x.text+"」に近い話かな？","「"+ranked[0].x.text+"」の話とつながっていそうだね。","前に教えてくれた言葉を思い出したよ。"]);
    if(known.length)return choose(["その言葉は前に教えてもらったね！","覚えている言葉が入ってるよ。どんな話につながる？","その言葉を使って、もう少し詳しく話してみて！"]);
    return choose(["「"+text+"」なんだね。もう少し詳しく聞かせて！","なるほど。そう思ったきっかけは何かある？","その話について、もう一歩聞いてもいい？","どの部分を一番伝えたかった？"]);
  }
  function time(){return new Intl.DateTimeFormat("ja-JP",{hour:"2-digit",minute:"2-digit"}).format(new Date());}
  function addMessage(role,text,system=false,stamp=time()){
    data.messages.push({role,text,system,stamp});
    if(data.messages.length>400)data.messages=data.messages.slice(-400);
    renderMessage({role,text,system,stamp});
  }
  function renderMessage(m){
    const el=document.createElement("div");
    if(m.system){el.className="system-message";el.textContent=m.text;}
    else{
      el.className="message "+(m.role==="user"?"user":"bot");
      const bubble=document.createElement("div");bubble.className="bubble";bubble.textContent=m.text;
      const meta=document.createElement("div");meta.className="meta";meta.textContent=(m.role==="user"?"あなた":"ことばAI")+" · "+m.stamp;
      el.append(bubble,meta);
    }
    $("messages").append(el);$("messages").scrollTop=$("messages").scrollHeight;
  }
  function renderAll(){ $("messages").replaceChildren();data.messages.forEach(renderMessage);updateStats(); }
  function updateStats(){
    const words=Object.keys(data.vocabulary).length;
    $("wordCount").textContent="語彙 "+words+"語";
    $("pairCount").textContent="会話記録 "+data.utterances.length+"件";
    $("statWords").textContent=words;$("statPairs").textContent=data.utterances.length;$("statTurns").textContent=data.turns;
  }
  function notify(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove("show"),2200);}
  function applyTheme(theme){
    const selected=theme==="dark"?"dark":"light";
    document.body.dataset.theme=selected;
    $("lightTheme").classList.toggle("active",selected==="light");
    $("darkTheme").classList.toggle("active",selected==="dark");
    try{localStorage.setItem(THEME_KEY,selected);}catch(e){}
    document.querySelector('meta[name="theme-color"]').content=selected==="dark"?"#1e302b":"#06c755";
  }
  function send(text){
    const value=text.trim();if(!value)return;
    addMessage("user",value);
    const teachMatch=value.match(/^覚えて[：:]\s*(.+)$/);
    let answer;
    if(teachMatch){
      const teachingText=teachMatch[1].trim();
      if(!teachingText){
        answer="覚えたい言葉を「覚えて：〇〇」の形で送ってね！";
      }else if(containsBlockedText(teachingText)){
        answer="その言葉は学習しないよ。別の言葉を教えてね。";
      }else{
        const added=learn(teachingText);
        answer=added.length ? "「"+teachingText+"」を覚えたよ！" : "その文章から覚えられる言葉が見つからなかったよ。";
      }
    }else{
      // 普通の会話では学習データを変更しない
      answer=makeLearnedReply(tokenize(value),value);
    }
    data.turns++;
    addMessage("bot",answer);
    save();updateStats();
  }
  $("chatForm").addEventListener("submit",e=>{e.preventDefault();send($("messageInput").value);$("messageInput").value="";$("messageInput").style.height="43px";});
  $("messageInput").addEventListener("input",e=>{e.target.style.height="43px";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";});
  $("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("chatForm").requestSubmit();}});
  $("menuToggle").addEventListener("click",()=> $("settings").hidden=false);
  $("closeSettings").addEventListener("click",()=> $("settings").hidden=true);
  $("lightTheme").addEventListener("click",()=>applyTheme("light"));
  $("darkTheme").addEventListener("click",()=>applyTheme("dark"));
  $("exportBtn").addEventListener("click",()=>{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="kotoba-ai-data.json";a.click();URL.revokeObjectURL(url);notify("学習データを書き出しました！");
  });
  $("importFile").addEventListener("change",async e=>{
    const file=e.target.files[0];if(!file)return;
    try{const x=JSON.parse(await file.text());if(x.version!==2||!x.vocabulary||!Array.isArray(x.utterances)||!Array.isArray(x.messages))throw Error();
      data=x;save();renderAll();notify("学習データを読み込みました！");
    }catch(err){notify("読み込めないデータ形式です。");}e.target.value="";
  });
  $("clearBtn").addEventListener("click",()=>{
    if(!confirm("学習データと会話履歴をすべて削除します。よろしいですか？"))return;
    data=fresh();save();renderAll();notify("学習データをリセットしました。");
  });
  applyTheme(localStorage.getItem(THEME_KEY)||"light");
  if(data.messages.length===0)addMessage("bot","こんにちは！ぼくは「ことばAI」。会話から言葉を覚えていくよ。まずはいろいろ話しかけてね！");
  renderAll();save();
})();