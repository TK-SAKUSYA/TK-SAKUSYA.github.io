(() => {
  "use strict";
  const KEY = "kotobaAI_v2";
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
    let parts = segmenter ? [...segmenter.segment(cleaned)].filter(x=>x.isWordLike).map(x=>x.segment) : cleaned.match(/[一-龯々〆ヵヶぁ-んァ-ヶー]+|[a-zA-Z0-9]+/g)||[];
    return parts.map(x=>x.toLowerCase()).filter(x=>x.length>0);
  }
  function learn(text){
    const tokens=tokenize(text);
    for(const token of tokens)data.vocabulary[token]=(data.vocabulary[token]||0)+1;
    if(tokens.length)data.utterances.push({tokens, text, at:Date.now()});
    if(data.utterances.length>600)data.utterances=data.utterances.slice(-600);
    return tokens;
  }
  function overlap(a,b){
    const aa=new Set(a),bb=new Set(b);let hit=0;
    for(const w of aa)if(bb.has(w))hit++;
    return hit/(aa.size+bb.size-hit||1);
  }
  function respond(inputTokens){
    if(Object.keys(data.vocabulary).length===0)return "まだ言葉を知らないよ。いろいろ話しかけてね。";
    if(!inputTokens.length)return "言葉としてまだ覚えられていないみたい。";
    const candidates=data.utterances.filter(x=>x.tokens.length);
    if(!candidates.length)return "まだ会話の記録が少ないよ。もう少し話してね。";
    let ranked=candidates.map((x,i)=>({x,score:overlap(inputTokens,x.tokens),i}));
    ranked.sort((a,b)=>b.score-a.score);
    const best=ranked[0];
    if(!best||best.score===0){
      const known=inputTokens.filter(w=>data.vocabulary[w]);
      if(known.length)return known.slice(0,Math.min(3,known.length)).join(" ")+"…その言葉は覚えたよ。";
      return "その言葉はまだ知らないよ。";
    }
    // 似た発言をそのまま反復し続けないよう、近い記録から短い語列を選ぶ
    const pool=ranked.filter(x=>x.score>=Math.max(.12,best.score*.72)).slice(0,8);
    const chosen=pool[Math.floor(Math.random()*pool.length)].x;
    let words=chosen.tokens.filter(w=>data.vocabulary[w]);
    const unique=[];
    for(const w of words){if(unique.length===0||unique[unique.length-1]!==w)unique.push(w);}
    const limited=unique.slice(0,7);
    if(!limited.length)return "まだうまく返事を作れないよ。";
    return limited.join(" ")+"。";
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
  function send(text){
    const value=text.trim();if(!value)return;
    addMessage("user",value);
    const tokens=tokenize(value);
    const answer=respond(tokens);
    learn(value);
    data.turns++;
    addMessage("bot",answer);
    save();updateStats();
  }
  $("chatForm").addEventListener("submit",e=>{e.preventDefault();send($("messageInput").value);$("messageInput").value="";$("messageInput").style.height="44px";});
  $("messageInput").addEventListener("input",e=>{e.target.style.height="44px";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";});
  $("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("chatForm").requestSubmit();}});
  $("menuToggle").addEventListener("click",()=>$("settings").hidden=false);
  $("closeSettings").addEventListener("click",()=>$("settings").hidden=true);
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
  if(data.messages.length===0)addMessage("bot","こんにちは！ぼくは「ことばAI」。会話から言葉を覚えていくプログラムだよ。まだ何も知らないから、たくさん話しかけてね！");
  renderAll();save();
})();