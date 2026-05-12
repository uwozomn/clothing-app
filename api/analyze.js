export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { imageBase64, mediaType, filename } = req.body;
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: `你是服飾店商品辨識助手。檔名：「${filename}」

這張照片上有用紅色或白色手寫的價格數字（通常是兩位數乘以10，如45=450、50=500、60=600、80=800）。檔名也可能包含價格或款式資訊可以參考。

請辨識並只回傳以下JSON，不要有任何其他文字、說明或markdown：
{"price":數字或null,"category":"top_fitted或two_piece或top_other或outer或bottom或dress或other","colors":["顏色"],"note":"10字內特徵"}

category說明：top_fitted=貼身上衣、two_piece=兩件套、top_other=其他上衣、outer=外套、bottom=下身、dress=洋裝、other=其他` }
          ]
        }]
      })
    });
    const data = await response.json();
    const text = data.content?.find(b => b.type === 'text')?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch(e) {
      const priceMatch = clean.match(/\b([3-9]\d{2}|[1-9]\d{3})\b/);
      parsed = { price: priceMatch ? parseInt(priceMatch[1]) : null, category: 'top_other', colors: [], note: '' };
    }
    res.status(200).json(parsed);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
