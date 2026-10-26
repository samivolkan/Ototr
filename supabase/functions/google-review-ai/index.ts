import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
});

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    reply: { type: 'string', minLength: 10, maxLength: 700 },
    tone: { type: 'string', enum: ['samimi', 'profesyonel', 'empatik', 'temkinli'] },
    requires_human_review: { type: 'boolean' },
    risk_reason: { type: 'string', maxLength: 300 },
    suggested_route: { type: 'string', enum: ['standard', 'branch_manager', 'customer_experience', 'legal', 'crisis'] },
    quality_score: { type: 'integer', minimum: 0, maximum: 100 },
  },
  required: ['reply', 'tone', 'requires_human_review', 'risk_reason', 'suggested_route', 'quality_score'],
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Yalnızca POST desteklenir.' }, 405);

  try {
    const body = await req.json();
    const review = body?.review;
    const branch = body?.branch;
    if (body?.action !== 'generate' || !review || !branch) return json({ error: 'Geçersiz istek.' }, 400);
    const rating = Number(review.rating);
    const comment = String(review.comment || '').trim().slice(0, 3000);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) return json({ error: 'Puan ve yorum metni zorunludur.' }, 400);

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return json({ error: 'OPENAI_API_KEY sunucu sırrı tanımlı değil.' }, 503);

    const replySignatureName = String(branch.replySignatureName || branch.name || 'OTOTR').slice(0, 180);
    const prompt = `Şube: ${String(branch.name || 'OTOTR').slice(0, 180)}\nŞehir: ${String(branch.city || '').slice(0, 80)}\nPuan: ${rating}/5\nMüşteri yorumu: ${comment}`;
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_MODEL') || 'gpt-5-mini',
        max_output_tokens: 450,
        moderation: { model: 'omni-moderation-latest' },
        instructions: `Sen OTOTR genel merkez müşteri deneyimi editörüsün. Google Haritalar yorumuna Türkçe, doğal ve gerçekten insan yazmış gibi kısa bir işletme yanıtı üret. Yorumdaki somut ayrıntıya değin; klişe ve tekrar eden cümlelerden kaçın. Müşterinin adını kullanma. Gerçekleştirilmemiş inceleme, arama, telafi veya sonuç vaadinde bulunma. Özel bilgi isteme; gerekirse yalnızca resmi iletişim kanalına davet et. 4-5 yıldızda sıcak ve özgün teşekkür; 3 yıldızda teşekkür ve iyileştirme niyeti; 1-2 yıldızda savunmaya geçmeden empati ve inceleme daveti kullan. Hukuk, dava, dolandırıcılık, güvenlik, ayrımcılık, kişisel veri, ücret iadesi veya ciddi teknik hata iddiasında requires_human_review=true ve uygun route seç. Yanıtın sonunda ayrı satırda "${replySignatureName} ekibi" imzası olsun. 90 kelimeyi geçme.`,
        input: prompt,
        text: { format: { type: 'json_schema', name: 'google_review_reply', strict: true, schema } },
      }),
    });
    const payload = await response.json();
    if (!response.ok) return json({ error: payload?.error?.message || `OpenAI API hatası: ${response.status}` }, 502);
    if (payload?.moderation?.input?.flagged || payload?.moderation?.output?.flagged) return json({ error: 'İçerik güvenlik kontrolüne takıldı; manuel inceleme gerekli.' }, 422);
    const outputText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text;
    if (!outputText) return json({ error: 'Model geçerli bir yanıt üretmedi.' }, 502);
    return json(JSON.parse(outputText));
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Beklenmeyen servis hatası.' }, 500);
  }
});
