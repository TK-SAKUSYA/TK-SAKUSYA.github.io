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
    // 知っている言葉・表現だけを再利用する。知らない言葉は一切生成しない。
    const safeInput=inputTokens.filter(token=>!isBlocked(token));
    if(containsBlockedText(inputText) || (inputTokens.length && safeInput.length===0))return null;
    const learned=data.utterances.filter(item=>
      Array.isArray(item.tokens) &&
      item.tokens.length>0 &&
      item.tokens.every(token=>!isBlocked(token) && (data.vocabulary[token]||0)>0)
    );
    if(!learned.length)return null;

    // 入力と共通する学習済み表現を優先。共通語がなければ学習済み表現から選ぶ。
    const ranked=learned.map((item,index)=>({
      item,
      index,
      score:overlap(safeInput,item.tokens)
    })).sort((a,b)=>b.score-a.score || a.index-b.index);
    const best=ranked[0];
    const selected=best.score>0 ? best.item : learned[data.turns%learned.length];
    const reply=selected.text;
    // 出力に未学習語が混ざらないよう、語彙との一致を最後に確認する。
    const outputTokens=tokenize(reply);
    if(!outputTokens.length || outputTokens.some(token=>!data.vocabulary[token] || isBlocked(token)))return null;
    return reply;
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
    if(teachMatch){
      const teachingText=teachMatch[1].trim();
      if(teachingText && !containsBlockedText(teachingText))learn(teachingText);
      // 初期状態は完全に無言。学習完了メッセージも、未学習語を含むため送らない。
    }else{
      // 普通の発言は学習しない。既に教わった表現だけで返せる場合に限り返答する。
      const answer=makeLearnedReply(tokenize(value),value);
      if(answer)addMessage("bot",answer);
    }
    data.turns++;
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
  renderAll();save();
})();