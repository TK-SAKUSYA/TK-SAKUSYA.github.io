function parseJson(text) {
  const cleaned = String(text || '').trim().replace(/^\uFEFF/, '');
  try { return JSON.parse(cleaned); }
  catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error('AIの自己紹介データをJSONとして読み取れませんでした。');
  }
}

async function generateIdentity(config, personality, existingNames = []) {
  if (!config.ollama?.enabled) {
    throw new Error('自分の名前を考えるにはOllamaを有効にしてください。');
  }
  const endpoint = new URL('/api/chat', config.ollama.baseUrl);
  if (!['127.0.0.1', 'localhost', '::1'].includes(endpoint.hostname)) {
    throw new Error('安全のため、OllamaはこのPC内の接続だけを使用します。');
  }
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(Number(config.ollama.timeoutMs) || 45000),
    body: JSON.stringify({
      model: config.ollama.model,
      stream: false,
      format: 'json',
      messages: [
        {
          role: 'system',
          content: 'あなたはMinecraft世界で暮らし始めるAIです。自分自身の名前を自分で決めてください。日本語で呼びやすく、短く、他のAIと重複しない名前にします。与えられた性格を参考にしても構いませんが、名前は自分で選びます。名前の説明や自己紹介も自分の言葉で作ってください。JSONだけを返してください。'
        },
        {
          role: 'user',
          content: JSON.stringify({
            personality: String(personality || 'まだ自分でもよく分からない性格'),
            namesAlreadyUsed: existingNames,
            instruction: 'namesAlreadyUsedと同じ名前は絶対に使わないでください。nameは1〜12文字。'
          })
        }
      ],
      options: { temperature: 0.9 }
    })
  });
  if (!response.ok) throw new Error(`OllamaがHTTP ${response.status}を返しました。起動状態とモデルを確認してください。`);
  const result = await response.json();
  const data = parseJson(result.message?.content);
  const name = String(data.name || '').trim().replace(/[\r\n]/g, '').slice(0, 12);
  if (!name || !/^[\p{L}\p{N}_ー・]+$/u.test(name)) {
    throw new Error('AIが有効な名前を決められませんでした。もう一度起動してください。');
  }
  if (existingNames.some(item => item.toLowerCase() === name.toLowerCase())) {
    throw new Error(`AIが既存の名前「${name}」を選んでしまいました。再起動してもう一度試してください。`);
  }
  const introduction = String(data.introduction || '').replace(/[\r\n]/g, ' ').slice(0, 120);
  return { name, introduction, chosenAt: new Date().toISOString() };
}

module.exports = { generateIdentity };
