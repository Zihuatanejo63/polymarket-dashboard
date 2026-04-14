#!/usr/bin/env node

/**
 * PolyMarket Data Fetcher
 * 用于GitHub Actions的独立脚本
 * 功能：抓取数据、翻译为中文、上传到腾讯云COS
 */

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';
import http from 'http';
import fs from 'fs';

// COS配置（通过环境变量传入）
const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

console.log('=== PolyMarket Data Fetcher ===');
console.log('Bucket:', COS_CONFIG.bucket);
console.log('Region:', COS_CONFIG.region);

// 验证配置
if (!COS_CONFIG.secretId || !COS_CONFIG.secretKey || !COS_CONFIG.bucket || !COS_CONFIG.region) {
  console.error('Missing required environment variables!');
  console.error('Required: COS_SECRET_ID, COS_SECRET_KEY, COS_BUCKET, COS_REGION');
  process.exit(1);
}

// PolyMarket API端点
const POLYMARKET_ENDPOINTS = [
  'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=100',
  'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100'
];

// 中文翻译字典
const TRANSLATIONS = {
  // 分类翻译
  categories: {
    'Finance': '金融',
    'Crypto': '加密货币',
    'Politics': '政治',
    'US Politics': '美国政治',
    'World': '国际',
    'Sports': '体育',
    'Technology': '科技',
    'Science': '科学',
    'Entertainment': '娱乐',
    'Business': '商业',
    'Economics': '经济',
    'Elections': '选举',
    'Bitcoin': '比特币',
    'Ethereum': '以太坊',
    'Stock Market': '股票市场',
    'Tech': '科技',
    'Geopolitics': '地缘政治',
    'Climate': '气候',
    'Health': '健康',
    'Metals': '金属',
    'Energy': '能源',
    'Science/Math': '科技',
    'War': '战争',
    'Weather': '天气',
  },
  // 关键词翻译
  keywords: {
    'bitcoin': '比特币',
    'btc': '比特币',
    'ethereum': '以太坊',
    'eth': '以太坊',
    'price': '价格',
    'higher': '更高',
    'lower': '更低',
    'above': '超过',
    'below': '低于',
    'million': '百万',
    'billion': '十亿',
    'percent': '百分之',
    'will': '会',
    'by': '到',
    'before': '之前',
    'after': '之后',
    'election': '选举',
    'president': '总统',
    'court': '法院',
    'supreme': '最高',
    'congress': '国会',
    'senate': '参议院',
    'house': '众议院',
    'nba': 'NBA',
    'football': '橄榄球',
    'soccer': '足球',
    'baseball': '棒球',
    'inflation': '通胀',
    'recession': '衰退',
    'gdp': 'GDP',
    'unemployment': '失业',
    'trade war': '贸易战',
    'stock': '股票',
    'market': '市场',
    'launch': '发布',
    'approve': '批准',
    'reject': '拒绝',
    'ban': '禁令',
    'deal': '协议',
    'agreement': '协议',
    'summit': '峰会',
    'meeting': '会议',
    'announcement': '公告',
    'report': '报告',
    'earnings': '财报',
    'revenue': '营收',
    'profit': '利润',
    'series': '系列',
    'season': '赛季',
    'championship': '冠军',
    'finals': '决赛',
    'playoffs': '季后赛',
    'gold': '金牌',
    'oscar': '奥斯卡',
    'award': '奖项',
    'olympics': '奥运会',
    'world cup': '世界杯',
    'temperature': '温度',
    'hurricane': '飓风',
    'earthquake': '地震',
    'flood': '洪水',
    'storm': '风暴',
  }
};

/**
 * 翻译文本为中文
 */
function translateToChinese(text) {
  if (!text) return '';

  let translated = text;

  // 翻译关键词
  for (const [eng, chn] of Object.entries(TRANSLATIONS.keywords)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }

  return translated;
}

/**
 * 翻译分类标签
 */
function translateCategory(category) {
  if (!category) return '其他';

  const normalized = String(category).trim();

  // 直接匹配
  if (TRANSLATIONS.categories[normalized]) {
    return TRANSLATIONS.categories[normalized];
  }

  // 不区分大小写匹配
  for (const [key, value] of Object.entries(TRANSLATIONS.categories)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value;
    }
  }

  // 部分匹配
  const lower = normalized.toLowerCase();
  for (const [key, value] of Object.entries(TRANSLATIONS.categories)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value;
    }
  }

  return normalized;
}

/**
 * 使用原生http模块获取数据
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);

    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000
    }, (res) => {
      let data = '';

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * 转换PolyMarket数据格式（带中文翻译）
 */
function transformData(rawData) {
  let markets = [];

  if (Array.isArray(rawData)) {
    markets = rawData;
  } else if (rawData.events) {
    markets = rawData.events;
  } else if (rawData.markets) {
    markets = rawData.markets;
  }

  return markets.map(item => {
    const yesPrice = parseFloat(item.outcomePrices?.[0]) || parseFloat(item.outcomePrices?.[1]) || 0.5;
    const originalQuestion = item.question || item.title || 'Unknown';
    const originalTag = item.tags?.[0] || '';
    const tagLabel = typeof originalTag === 'object' ? originalTag?.label : originalTag;

    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      // 保留原文
      question: originalQuestion,
      questionZh: translateToChinese(originalQuestion),
      description: item.description || '',
      descriptionZh: translateToChinese(item.description || ''),
      outcomes: item.outcomes || ['NO', 'YES'],
      outcomePrices: item.outcomePrices || ['0.5', '0.5'],
      probability: Math.round(yesPrice * 100),
      volume: parseFloat(item.volume || '0'),
      liquidity: parseFloat(item.liquidity || '0'),
      active: item.active !== false,
      closed: item.closed === true,
      // 原始标签
      tags: Array.isArray(item.tags) ? item.tags : [],
      // 中文翻译后的分类
      categoryZh: translateCategory(tagLabel),
      slug: item.slug || '',
      createdAt: item.creationTime || new Date().toISOString(),
      expiresAt: item.expirationTime || '',
      updatedAt: new Date().toISOString()
    };
  });
}

/**
 * 上传到腾讯云COS
 */
async function uploadToCOS(data) {
  const { secretId, secretKey, bucket, region } = COS_CONFIG;

  console.log('Initializing COS client...');

  return new Promise((resolve, reject) => {
    const cos = new COS({
      SecretId: secretId,
      SecretKey: secretKey
    });

    const body = JSON.stringify(data);

    console.log('Uploading to COS...');
    console.log('Bucket:', bucket);
    console.log('Region:', region);

    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: 'polymarket-data.json',
      Body: Buffer.from(body),
      ContentType: 'application/json',
      ACL: 'public-read'
    }, (err, data) => {
      if (err) {
        console.error('COS Error:', err);
        reject(err);
      } else {
        console.log('Upload successful!');
        console.log('ETag:', data.ETag);
        resolve(data);
      }
    });
  });
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('\n--- Step 1: Fetching PolyMarket Data ---');

    let rawData = null;
    for (const endpoint of POLYMARKET_ENDPOINTS) {
      try {
        console.log(`Trying: ${endpoint}`);
        rawData = await fetchUrl(endpoint);
        if (rawData && (Array.isArray(rawData) || rawData.events || rawData.markets)) {
          console.log('Successfully fetched data!');
          break;
        }
      } catch (error) {
        console.log(`Failed: ${error.message}`);
      }
    }

    if (!rawData) {
      throw new Error('Failed to fetch data from all endpoints');
    }

    console.log('\n--- Step 2: Transforming Data (with Chinese Translation) ---');
    const markets = transformData(rawData);
    console.log(`Transformed ${markets.length} markets`);

    // 打印示例
    if (markets.length > 0) {
      console.log('\nSample market (original):', markets[0].question);
      console.log('Sample market (Chinese):', markets[0].questionZh);
      console.log('Sample category:', markets[0].categoryZh);
    }

    const result = {
      markets: markets,
      total: markets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api',
      translated: true
    };

    // 保存到本地文件
    fs.writeFileSync('polymarket-data.json', JSON.stringify(result, null, 2));
    console.log('Data saved to polymarket-data.json');

    console.log('\n--- Step 3: Uploading to COS ---');
    await uploadToCOS(result);

    console.log('\n=== All steps completed successfully! ===');
    console.log(`Data URL: https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-data.json`);

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();
