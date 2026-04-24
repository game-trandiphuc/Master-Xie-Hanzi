/* useAILookup.js — Calls AI API (Qwen) to get Pinyin & Meaning */
import { useState } from 'react';

const MODEL = "qwen-turbo";

function extractJSON(text) {
  try { return JSON.parse(text.trim()); } catch { }
  const stripped = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch { }
  const match = text.match(/\{[\s\S]*?\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { }
  }
  return null;
}

async function callQwen(prompt, apiKey) {
  const res = await fetch(
    `https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 150
      })
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`HTTP ${res.status}: ${errBody}`);
  }
  return res.json();
}

export function useAILookup(apiKey) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const lookup = async (characters) => {
    if (!characters.trim()) return null;

    // 1. Check Cache First
    const cachedData = localStorage.getItem('mxh_ai_cache');
    const cache = cachedData ? JSON.parse(cachedData) : {};
    if (cache[characters]) {
      return cache[characters];
    }

    if (!apiKey) {
      setError('Vui lòng cài đặt Qwen API Key.');
      return null;
    }
    
    setLoading(true);
    setError(null);

    const prompt = `For the Chinese text: "${characters}"\nRespond ONLY with a raw JSON object, no markdown formatting:\n{"pinyin":"<pinyin with tones>","meaning":"<Vietnamese meaning, 1-5 words>"}`;

    try {
      const data = await callQwen(prompt, apiKey);
      const text = data.choices?.[0]?.message?.content || '';
      const parsed = extractJSON(text);
      if (parsed?.pinyin || parsed?.meaning) {
        // 2. Save to Cache
        cache[characters] = parsed;
        localStorage.setItem('mxh_ai_cache', JSON.stringify(cache));
        
        setLoading(false);
        return parsed;
      }
    } catch (err) {
      console.warn(`[useAILookup] API failed:`, err.message);
      if (err.message.includes('429')) {
        setError('Lỗi 429: API đang quá tải. Vui lòng thử lại sau.');
      } else if (err.message.includes('401')) {
        setError('Lỗi 401: API Key không hợp lệ.');
      } else {
        setError('Lỗi kết nối API Qwen.');
      }
      setLoading(false);
      return null;
    }

    setError('Không thể xử lý phản hồi từ AI.');
    setLoading(false);
    return null;
  };

  return { lookup, loading, error };
}
