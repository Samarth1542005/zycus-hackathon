/**
 * LLM Gateway — Groq Integration
 * Calls Groq's OpenAI-compatible API for fast LLM inference.
 * Returns parsed JSON from the LLM response.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

async function callLLM(prompt, { apiKey, model = 'llama-3.1-70b-versatile' } = {}) {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an AI commerce advisor for ShopStream, an online retail store. You analyze inventory and demand data to recommend pricing adjustments and reorder quantities. Always respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Empty response from Groq API');
  }

  try {
    return JSON.parse(content);
  } catch {
    console.error('Failed to parse LLM response as JSON:', content);
    throw new Error('LLM response was not valid JSON');
  }
}

module.exports = { callLLM };
