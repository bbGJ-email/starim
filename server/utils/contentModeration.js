const config = require('../config/app');
const { filterSensitiveWords, findSensitiveWords } = require('./sanitize');

const LAYERS = {
  AI: 'ai',
  EXTERNAL_FILTER: 'external_filter',
  LOCAL_LEXICON: 'local_lexicon',
  NONE: 'none'
};

function timeoutMs() {
  const value = Number(config.contentModeration?.timeoutMs || 5000);
  return Number.isFinite(value) && value > 0 ? value : 5000;
}

function normalizeText(text) {
  if (text === null || text === undefined) return '';
  return String(text);
}

function normalizeContext(context) {
  if (!context || typeof context !== 'object') return {};

  const normalized = {};
  for (const [key, value] of Object.entries(context)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value;
    }
  }
  return normalized;
}

function withTimeout(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { controller, timer };
}

function buildOpenAIChatUrl(endpoint) {
  const trimmed = String(endpoint || '').trim();
  if (!trimmed) return '';
  if (/\/chat\/completions\/?$/.test(trimmed)) return trimmed;
  return `${trimmed.replace(/\/+$/, '')}/v1/chat/completions`;
}

function extractJsonObject(content) {
  if (!content || typeof content !== 'string') return null;

  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (error) {
    return null;
  }
}

function parseAiResult(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed.sensitive !== 'boolean') return null;

  return {
    sensitive: parsed.sensitive,
    layer: LAYERS.AI,
    reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : 'AI 审核完成'
  };
}

function buildAiMessages(text, context) {
  return [
    {
      role: 'system',
      content: [
        '你是即时通讯产品的敏感内容审核器。',
        '请结合内容和上下文判断是否包含违法违规、暴恐、色情、诈骗、广告引流、政治敏感、仇恨骚扰或其他需要屏蔽的敏感内容。',
        '只输出稳定 JSON，不要输出 Markdown、解释或多余文本。',
        'JSON 格式必须为：{"sensitive":boolean,"reason":"简短中文原因"}。'
      ].join('\n')
    },
    {
      role: 'user',
      content: JSON.stringify({ text, context: normalizeContext(context) })
    }
  ];
}

async function moderateByAI(text, context) {
  const aiConfig = config.contentModeration?.ai || {};
  const endpoint = buildOpenAIChatUrl(aiConfig.endpoint);
  if (!endpoint || !aiConfig.key || !aiConfig.model) return null;

  const { controller, timer } = withTimeout(timeoutMs());
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.key}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: buildAiMessages(text, context),
        temperature: 0,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    if (!response.ok) return null;
    return parseAiResult(await response.json());
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function getResponseText(payload) {
  if (typeof payload === 'string') return payload;
  if (!payload || typeof payload !== 'object') return '';

  const candidates = [
    payload.filteredText,
    payload.filtered,
    payload.replacedText,
    payload.resultText,
    payload.data,
    payload.data?.filteredText,
    payload.data?.filtered,
    payload.data?.replacedText,
    payload.data?.resultText,
    payload.data?.text,
    payload.data?.content
  ];

  const matched = candidates.find((value) => typeof value === 'string');
  return matched || '';
}

async function moderateByExternalFilter(text) {
  const externalConfig = config.contentModeration?.externalFilter || {};
  if (!externalConfig.endpoint || !externalConfig.token) return null;

  const { controller, timer } = withTimeout(timeoutMs());
  try {
    const response = await fetch(externalConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${externalConfig.token}`,
        token: externalConfig.token
      },
      body: JSON.stringify({ msg: text }),
      signal: controller.signal
    });

    if (!response.ok) return null;

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : await response.text();
    const filteredText = getResponseText(payload);
    if (!filteredText) return null;

    const sensitive = filteredText !== text || filteredText.includes('*');
    return {
      sensitive,
      layer: LAYERS.EXTERNAL_FILTER,
      reason: sensitive ? '外部敏感文本过滤 API 命中' : '外部敏感文本过滤 API 未命中'
    };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function moderateByLocalLexicon(text) {
  try {
    const filteredText = await filterSensitiveWords(text);
    const matchedWords = findSensitiveWords(text);
    const sensitive = filteredText !== text || matchedWords.length > 0;

    return {
      sensitive,
      layer: LAYERS.LOCAL_LEXICON,
      reason: sensitive ? `本地词库命中${matchedWords.length ? `：${matchedWords.slice(0, 3).join('、')}` : ''}` : '本地词库未命中'
    };
  } catch (error) {
    return {
      sensitive: false,
      layer: LAYERS.LOCAL_LEXICON,
      reason: '本地词库审核异常，已放行'
    };
  }
}

async function moderateContent(text, context = {}) {
  const content = normalizeText(text);
  if (!content) {
    return { sensitive: false, layer: LAYERS.NONE, reason: '空内容' };
  }

  try {
    const aiResult = await moderateByAI(content, context);
    if (aiResult?.sensitive) return aiResult;

    const externalResult = await moderateByExternalFilter(content);
    if (externalResult?.sensitive) return externalResult;

    return await moderateByLocalLexicon(content);
  } catch (error) {
    return {
      sensitive: false,
      layer: LAYERS.NONE,
      reason: '内容审核异常，已放行'
    };
  }
}

module.exports = {
  LAYERS,
  moderateContent,
  moderateByAI,
  moderateByExternalFilter,
  moderateByLocalLexicon
};
