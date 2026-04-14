#!/usr/bin/env node

/**
 * PolyMarket Data Fetcher
 * 用于GitHub Actions的独立脚本
 * 功能：抓取数据、翻译为中文、上传到腾讯云COS
 */

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';
import fs from 'fs';

// COS配置
const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

// 中文翻译字典
const TRANSLATIONS = {
  categories: {
    'Finance': '金融', 'Crypto': '加密货币', 'Politics': '政治',
    'US Politics': '美国政治', 'World': '国际', 'Sports': '体育',
    'Technology': '科技', 'Science': '科技', 'Entertainment': '娱乐',
    'Business': '商业', 'Economics': '经济', 'Elections': '选举',
    'Bitcoin': '比特币', 'Ethereum': '以太坊', 'Stock Market': '股票',
    'War': '战争', 'Weather': '天气', 'Metals': '金属', 'Energy': '能源',
  },
  keywords: {
    'bitcoin': '比特币', 'ethereum': '以太坊', 'price': '价格',
    'election': '选举', 'president': '总统', 'nba': 'NBA',
    'inflation': '通胀', 'gdp': 'GDP', 'stock': '股票', 'market': '市场',
    'higher': '更高', 'lower': '更低', 'million': '百万',
  }
};

function translateToChinese(text) {
  if (!text) return '';
  let translated = text;
  for (const [eng, chn] of Object.entries(TRANSLATIONS.keywords)) {
    const regex = new RegExp(`\\b${eng}\\b`, 'gi');
    translated = translated.replace(regex, chn);
  }
  return translated;
}

function translateCategory(category) {
  if (!category) return '其他';
  const normalized = String(category).trim();
  if (TRANSLATIONS.categories[normalized]) return TRANSLATIONS.categories[normalized];
  for (const [key, value] of Object.entries(TRANSLATIONS.categories)) {
    if (key.toLowerCase() === normalized.toLowerCase()) return value;
  }
  return normalized;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);
    https.get(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON解析失败: ${e.message}`)); }
      });
    }).on('error', reject).on('timeout', (req) => {
      req.destroy();
      reject(new Error('请求超时'));
    }).setTimeout(30000);
  });
}

// 计算概率
function calculateProbability(outcomePrices) {
  if (!outcomePrices || outcomePrices.length < 2) return 50;
  // outcomePrices[0] = NO价格, outcomePrices[1] = YES价格
  // YES价格直接就是概率（0-1范围）
  const yesPrice = parseFloat(outcomePrices[1]) || 0.5;
  return Math.round(yesPrice * 100);
}

function transformData(rawData) {
  let markets = Array.isArray(rawData) ? rawData : (rawData.events || rawData.markets || []);
  
  console.log(`原始数据量: ${markets.length}`);
  
  return markets.map(item => {
    const outcomePrices = item.outcomePrices || ['0.5', '0.5'];
    const yesPrice = parseFloat(outcomePrices[1]) || 0.5;
    const probability = Math.round(yesPrice * 100);
    
    const originalQuestion = item.question || item.title || 'Unknown';
    const originalTag = item.tags?.[0] || '';
    const tagLabel = typeof originalTag === 'object' ? originalTag?.label : originalTag;
    
    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      question: originalQuestion,
      questionZh: translateToChinese(originalQuestion),
      outcomes: item.outcomes || ['NO', 'YES'],
      outcomePrices: outcomePrices,
      probability: probability,
      volume: parseFloat(item.volume || '0'),
      liquidity: parseFloat(item.liquidity || '0'),
      tags: Array.isArray(item.tags) ? item.tags : [],
      categoryZh: translateCategory(tagLabel),
      slug: item.slug || '',
      createdAt: item.creationTime || new Date().toISOString(),
      expiresAt: item.expirationTime || '',
      updatedAt: new Date().toISOString()
    };
  });
}

async function uploadToCOS(data) {
  const { secretId, secretKey, bucket, region } = COS_CONFIG;
  return new Promise((resolve, reject) => {
    const cos = new COS({ SecretId: secretId, SecretKey: secretKey });
    cos.putObject({
      Bucket: bucket, Region: region, Key: 'polymarket-data.json',
      Body: Buffer.from(JSON.stringify(data)),
      ContentType: 'application/json', ACL: 'public-read'
    }, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function main() {
  try {
    console.log('=== PolyMarket Data Fetcher ===');
    console.log('Bucket:', COS_CONFIG.bucket);
    
    // 尝试多个API端点
    const endpoints = [
      'https://gamma-api.polymarket.com/markets?closed=false&limit=200',
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=200',
    ];
    
    let rawData = null;
    for (const endpoint of endpoints) {
      try {
        rawData = await fetchUrl(endpoint);
        if (rawData && (Array.isArray(rawData) || rawData.markets || rawData.events)) {
          console.log('API响应成功!');
          break;
        }
      } catch (e) {
        console.log(`端点失败: ${e.message}`);
      }
    }
    
    if (!rawData) throw new Error('所有API端点都失败');
    
    // 转换数据
    const markets = transformData(rawData);
    
    // 统计概率分布
    const probStats = {};
    markets.forEach(m => {
      const p = m.probability;
      probStats[p] = (probStats[p] || 0) + 1;
    });
    
    console.log('\n概率分布统计:');
    Object.keys(probStats).sort((a, b) => parseInt(b) - parseInt(a)).slice(0, 10).forEach(p => {
      console.log(`  ${p}%: ${probStats[p]}条`);
    });
    
    // 示例
    console.log('\n示例数据:');
    markets.slice(0, 3).forEach(m => {
      console.log(`  ${m.questionZh || m.question}`);
      console.log(`    概率: ${m.probability}%, 价格: [${m.outcomePrices}], 分类: ${m.categoryZh}`);
    });
    
    const result = {
      markets,
      total: markets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api',
      translated: true
    };
    
    // 保存本地
    fs.writeFileSync('polymarket-data.json', JSON.stringify(result, null, 2));
    console.log('\n数据已保存到本地');
    
    // 上传COS
    await uploadToCOS(result);
    console.log('上传COS成功!');
    console.log(`URL: https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-data.json');
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
