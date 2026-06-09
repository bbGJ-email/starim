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

/**
 * 从文件加载敏感词
 */
function loadWordsFromFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const words = content.split('\n')
      .map(word => word.trim())
      .filter(word => word.length > 0);
    return words;
  } catch (error) {
    console.error(`加载词库失败 ${filePath}:`, error);
    return [];
  }
}

/**
 * 初始化敏感词过滤工具
 */
function initSensitiveWordTool() {
  console.log('正在加载敏感词库...');
  
  let allWords = [];
  
  for (const file of LEXICON_FILES) {
    const filePath = path.join(LEXICON_DIR, file);
    const words = loadWordsFromFile(filePath);
    allWords = allWords.concat(words);
    console.log(`  加载 ${file}: ${words.length} 个词`);
  }
  
  // 去重
  const uniqueWords = Array.from(new Set(allWords));
  
  // 初始化敏感词工具
  sensitiveWordTool = new SensitiveWordTool({
    wordList: uniqueWords,
    useDefaultWords: false
  });
  
  console.log(`敏感词库加载完成，共 ${uniqueWords.length} 个敏感词`);
}

/**
 * 过滤敏感词
 * @param {string} content - 待过滤的内容
 * @returns {Promise<string>} 过滤后的内容
 */
async function filterSensitiveWords(content) {
  if (!content) return content;

  if (!sensitiveWordTool) {
    initSensitiveWordTool();
  }

  try {
    return sensitiveWordTool.filter(content);
  } catch (error) {
    console.error('过滤敏感词失败:', error);
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

  if (!sensitiveWordTool) {
    initSensitiveWordTool();
  }

  try {
    return sensitiveWordTool.verify(content);
  } catch (error) {
    console.error('检测敏感词失败:', error);
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

  if (!sensitiveWordTool) {
    initSensitiveWordTool();
  }

  try {
    return sensitiveWordTool.match(content);
  } catch (error) {
    console.error('查找敏感词失败:', error);
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
