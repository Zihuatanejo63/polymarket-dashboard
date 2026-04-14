#!/usr/bin/env node

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';
import fs from 'fs';

const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

// 扩展中文翻译字典
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
    // 人物
    'Trump': '特朗普', 'Biden': '拜登', 'Obama': '奥巴马',
    'President': '总统', 'CEO': '首席执行官',
    // 加密货币
    'Bitcoin': '比特币', 'Ethereum': '以太坊', 'BTC': '比特币', 'ETH': '以太坊',
    'crypto': '加密', 'Coinbase': 'Coinbase交易所',
    // 金融
    'stock': '股票', 'market': '市场', 'inflation': '通胀',
    'GDP': 'GDP', 'interest rate': '利率', 'Fed': '美联储',
    'recession': '衰退', 'unemployment': '失业',
    // 体育
    'NBA': 'NBA', 'NFL': 'NFL', 'Super Bowl': '超级碗',
    'football': '橄榄球', 'soccer': '足球', 'baseball': '棒球',
    'championship': '冠军', 'finals': '决赛', 'playoffs': '季后赛',
    // 事件
    'election': '选举', 'vote': '投票', 'war': '战争',
    'treaty': '条约', 'agreement': '协议', 'deal': '协议',
    'summit': '峰会', 'meeting': '会议',
    // 科技
    'AI': 'AI', 'GPT': 'GPT', 'Tesla': '特斯拉',
    'Apple': '苹果', 'Google': '谷歌', 'Microsoft': '微软',
    'launch': '发布', 'approve': '批准', 'release': '发布',
    // 游戏
    'GTA': 'GTA', 'album': '专辑', 'concert': '演唱会',
    // 其他
    'price': '价格', 'higher': '更高', 'lower': '更低',
    'above': '超过', 'below': '低于', 'million': '百万',
    'billion': '十亿', 'before': '之前', 'after': '之后',
    'by': '在...之前', 'until': '直到',
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
        catch (e) { reject(new Error(`JSON解析失败`)); }
      });
    }).on('error', reject).setTimeout(30000, () => reject(new Error('超时')));
  });
}

function transformData(rawData) {
  let markets = Array.isArray(rawData) ? rawData : (rawData.events || rawData.markets || []);
  console.log(`原始数据量: ${markets.length}`);
  
  return markets.map(item => {
    // PolyMarket: YES价格=outcomePrices[0], NO价格=outcomePrices[1]
    const outcomePrices = item.outcomePrices || ['0.5', '0.5'];
    const yesPrice = parseFloat(outcomePrices[0]) || 0.5;  // 修正：取索引0
    const probability = Math.round(yesPrice * 100);
    
    const originalQuestion = item.question || 'Unknown';
    const tag = item.tags?.[0] || '';
    const tagLabel = typeof tag === 'object' ? tag?.label : tag;
    
    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      question: originalQuestion,
      questionZh: translateToChinese(originalQuestion),
      outcomes: item.outcomes || ['YES', 'NO'],
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
  const cos = new COS({ SecretId: COS_CONFIG.secretId, SecretKey: COS_CONFIG.secretKey });
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: COS_CONFIG.bucket, Region: COS_CONFIG.region,
      Key: 'polymarket-data.json',
      Body: Buffer.from(JSON.stringify(data)),
      ContentType: 'application/json', ACL: 'public-read'
    }, (err, result) => err ? reject(err) : resolve(result));
  });
}

async function main() {
  try {
    console.log('=== PolyMarket Data Fetcher ===');
    let rawData = null;
    const endpoints = [
      'https://gamma-api.polymarket.com/markets?closed=false&limit=200',
      'https://gamma-api.polymarket.com/events?active=true&closed=false&limit=200',
    ];
    
    for (const endpoint of endpoints) {
      try {
        rawData = await fetchUrl(endpoint);
        if (rawData) { console.log('API响应成功!'); break; }
      } catch (e) { console.log(`失败: ${e.message}`); }
    }
    
    if (!rawData) throw new Error('所有API端点都失败');
    
    const markets = transformData(rawData);
    
    // 统计概率分布
    const probStats = {};
    markets.forEach(m => {
      const p = String(m.probability);
      probStats[p] = (probStats[p] || 0) + 1;
    });
    
    console.log('\n=== 概率分布 ===');
    Object.keys(probStats).sort((a, b) => parseInt(b) - parseInt(a)).slice(0, 10).forEach(p => {
      console.log(`  ${p}%: ${probStats[p]}条`);
    });
    
    console.log('\n=== 示例数据 ===');
    markets.slice(0, 5).forEach(m => {
      console.log(`原文: ${m.question}`);
      console.log(`中文: ${m.questionZh}`);
      console.log(`概率: ${m.probability}% 价格: [${m.outcomePrices}] 分类: ${m.categoryZh}`);
      console.log();
    });
    
    const result = { markets, total: markets.length, fetchedAt: new Date().toISOString(), source: 'polymarket-gamma-api', translated: true };
    fs.writeFileSync('polymarket-data.json', JSON.stringify(result, null, 2));
    console.log('数据已保存到本地');
    
    await uploadToCOS(result);
    console.log('上传COS成功!');
    console.log(`URL: https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-data.json`);
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

main();
