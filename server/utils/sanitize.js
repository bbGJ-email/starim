const path = require('path');
const fs = require('fs');
const { SensitiveWordTool } = require('sensitive-word-tool');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// 词库目录
const LEXICON_DIR = path.join(__dirname, '../../Sensitive-lexicon/Vocabulary');

// 要加载的词库文件
const LEXICON_FILES = [
  'COVID-19词库.txt',
  'GFW补充词库.txt',
  '其他词库.txt',
  '反动词库.txt',
  '广告类型.txt',
  '政治类型.txt',
  '新思想启蒙.txt',
  '暴恐词库.txt',
  '民生词库.txt',
  '涉枪涉爆.txt',
  '网易前端过滤敏感词库.txt',
  '色情类型.txt',
  '色情词库.txt',
  '补充词库.txt',
  '贪腐词库.txt',
  '零时-Tencent.txt',
  '非法网址.txt'
];

// 初始化敏感词工具
let sensitiveWordTool = null;
let sensitiveWordToolInitialized = false;

/**
 * 从文件加载敏感词
 */
function loadWordsFromFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`词库文件不存在，已跳过: ${filePath}`);
      return [];
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split(/\r?\n/)
      .map(word => word.trim())
      .filter(word => word.length > 0 && !word.startsWith('#'));
    return words;
  } catch (error) {
    console.error(`加载词库失败 ${filePath}:`, error.message);
    return [];
  }
}

/**
 * 初始化敏感词过滤工具
 */
function initSensitiveWordTool() {
  if (sensitiveWordToolInitialized) {
    return sensitiveWordTool;
  }

  sensitiveWordToolInitialized = true;
  console.log('正在加载敏感词库...');
  
  let allWords = [];
  
  for (const file of LEXICON_FILES) {
    const filePath = path.join(LEXICON_DIR, file);
    const words = loadWordsFromFile(filePath);
    allWords = allWords.concat(words);
    console.log(`  加载 ${file}: ${words.length} 个词`);
  }
  
  const uniqueWords = Array.from(new Set(allWords));
  
  try {
    sensitiveWordTool = new SensitiveWordTool({
      wordList: uniqueWords,
      useDefaultWords: false
    });
    console.log(`敏感词库加载完成，共 ${uniqueWords.length} 个敏感词`);
  } catch (error) {
    sensitiveWordTool = null;
    console.error('初始化敏感词工具失败:', error.message);
  }

  return sensitiveWordTool;
}

function getSensitiveWordTool() {
  return sensitiveWordTool || initSensitiveWordTool();
}

/**
 * 过滤敏感词
 * @param {string} content - 待过滤的内容
 * @returns {Promise<string>} 过滤后的内容
 */
async function filterSensitiveWords(content) {
  if (!content) return content;

  const tool = getSensitiveWordTool();
  if (!tool) return content;

  try {
    return tool.filter(String(content));
  } catch (error) {
    console.error('过滤敏感词失败:', error.message);
    return content;
  }
}

/**
 * 检测是否包含敏感词
 * @param {string} content - 待检测的内容
 * @returns {boolean} 是否包含敏感词
 */
function hasSensitiveWords(content) {
  if (!content) return false;

  const tool = getSensitiveWordTool();
  if (!tool) return false;

  try {
    return tool.verify(String(content));
  } catch (error) {
    console.error('检测敏感词失败:', error.message);
    return false;
  }
}

/**
 * 获取所有匹配的敏感词
 * @param {string} content - 待检测的内容
 * @returns {Array<string>} 匹配的敏感词列表
 */
function findSensitiveWords(content) {
  if (!content) return [];

  const tool = getSensitiveWordTool();
  if (!tool) return [];

  try {
    return tool.match(String(content));
  } catch (error) {
    console.error('查找敏感词失败:', error.message);
    return [];
  }
}

function sanitizeHTML(html) {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href']
  });
}

function sanitizeText(text) {
  if (!text) return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 启动时初始化
initSensitiveWordTool();

module.exports = {
  filterSensitiveWords,
  hasSensitiveWords,
  findSensitiveWords,
  sanitizeHTML,
  sanitizeText
};
