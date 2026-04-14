#!/usr/bin/env node

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';

const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

// 中文翻译字典 - 扩展更多关键词
const TRANSLATIONS = {
  // 人物
  'Trump': '特朗普', 'Biden': '拜登', 'Obama': '奥巴马',
  'Putin': '普京', 'Zelensky': '泽连斯基',
  'President': '总统', 'CEO': '首席执行官',
  // 加密货币
  'Bitcoin': '比特币', 'Ethereum': '以太坊', 'BTC': '比特币', 'ETH': '以太坊',
  'crypto': '加密货币', 'cryptocurrency': '加密货币',
  'Coinbase': 'Coinbase交易所', 'Binance': '币安',
  // 金融
  'stock': '股票', 'market': '市场', 'inflation': '通胀',
  'GDP': 'GDP', 'interest rate': '利率', 'Fed': '美联储',
  'recession': '衰退', 'unemployment': '失业', 'price': '价格',
  // 体育
  'NBA': 'NBA', 'NFL': 'NFL', 'Super Bowl': '超级碗',
  'football': '橄榄球', 'soccer': '足球', 'baseball': '棒球',
  'championship': '冠军', 'finals': '决赛', 'playoffs': '季后赛',
  'MVP': 'MVP', 'Olympics': '奥运会', 'World Cup': '世界杯',
  // 科技
  'AI': 'AI', 'GPT': 'GPT', 'Tesla': '特斯拉',
  'Apple': '苹果', 'Google': '谷歌', 'Microsoft': '微软',
  'Amazon': '亚马逊', 'Meta': 'Meta', 'Twitter': '推特',
  'launch': '发布', 'approve': '批准', 'release': '发布',
  // 游戏/娱乐
  'GTA': 'GTA', 'GTA VI': 'GTA6', 'album': '专辑',
  'concert': '演唱会', 'Rihanna': '蕾哈娜',
  // 地缘政治
  'Russia': '俄罗斯', 'Ukraine': '乌克兰', 'China': '中国',
  'Taiwan': '台湾', 'Iran': '伊朗', 'Israel': '以色列',
  'war': '战争', 'treaty': '条约', 'agreement': '协议',
  'deal': '协议', 'sanctions': '制裁', 'Ceasefire': '停火',
  // 其他关键词
  'before': '之前', 'after': '之后', 'by': '在...之前',
  'higher': '更高', 'lower': '更低', 'above': '超过', 'below': '低于',
  'million': '百万', 'billion': '十亿',
  'election': '选举', 'vote': '投票', 'court': '法院',
  'return': '回归', 'out': '下台', 'invade': '入侵',
  'Will': '是否', 'hit': '达到', 'released': '发布',
};

function translateToChinese(text) {
  if (!text) return '';
  let translated = text;
  // 按关键词长度降序替换（避免短词影响长词）
  const sortedKeywords = Object.keys(TRANSLATIONS).sort((a, b) => b.length - a.length);
  for (const eng of sortedKeywords) {
    const chn = TRANSLATIONS[eng];
    // 使用单词边界匹配
    const regex = new RegExp(`\\b${eng}\\b`, 'g');
    translated = translated.replace(regex, chn);
  }
  return translated;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    console.log(`Fetching: ${url}`);
    https.get(url, {
      headers: { 
        'Accept': 'application/json', 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { 
          console.error('JSON解析失败:', e.message);
          reject(new Error(`JSON解析失败`)); 
        }
      });
    }).on('error', reject).setTimeout(30000, () => reject(new Error('超时')));
  });
}

function transformData(rawData, source = 'gamma') {
  let markets = Array.isArray(rawData) ? rawData : (rawData.events || rawData.markets || []);
  console.log(`原始数据量: ${markets.length}`);
  
  // 只保留活跃市场（未关闭且未过期）
  const now = new Date();
  const activeMarkets = markets.filter(m => {
    // 检查是否已关闭
    if (m.closed === true || m.isClosed === true) return false;
    // 检查是否已过期
    if (m.expirationTime || m.expiresAt) {
      const expireDate = new Date(m.expirationTime || m.expiresAt);
      if (expireDate < now) return false;
    }
    return true;
  });
  
  console.log(`活跃市场: ${activeMarkets.length}条 (过滤掉已关闭/过期)`);
  
  // 统计概率分布
  const probs = activeMarkets.map(m => {
    let outcomePrices = m.outcomePrices || ['0.5', '0.5'];
    if (typeof outcomePrices === 'string') {
      try { outcomePrices = JSON.parse(outcomePrices); } catch (e) { outcomePrices = ['0.5', '0.5']; }
    }
    const price = parseFloat(outcomePrices[0]) || 0.5;
    return Math.round(price * 100);
  });
  
  if (probs.length > 0) {
    console.log(`概率范围: ${Math.min(...probs)}% - ${Math.max(...probs)}%`);
  }
  
  return activeMarkets.map(item => {
    // 解析概率
    let outcomePrices = item.outcomePrices || ['0.5', '0.5'];
    if (typeof outcomePrices === 'string') {
      try { outcomePrices = JSON.parse(outcomePrices); } catch (e) { outcomePrices = ['0.5', '0.5']; }
    }
    const yesPrice = parseFloat(outcomePrices[0]) || 0.5;
    const probability = Math.round(yesPrice * 100);
    
    // 获取并翻译问题
    const originalQuestion = item.question || item.title || 'Unknown';
    // 尝试使用API返回的中文，如果没有则翻译
    const questionZh = item.questionZh || item.questionCn || item.titleCn || translateToChinese(originalQuestion);
    
    // 获取分类标签
    const tag = item.tags?.[0] || item.category || '';
    const tagLabel = typeof tag === 'object' ? tag?.label : tag;
    
    // 分类中文映射
    const categoryMap = {
      'Finance': '金融', 'Crypto': '加密货币', 'Politics': '政治',
      'US Politics': '美国政治', 'World': '国际', 'Sports': '体育',
      'Technology': '科技', 'Science': '科学', 'Entertainment': '娱乐',
      'Business': '商业', 'Economics': '经济', 'Elections': '选举',
      'Bitcoin': '比特币', 'Ethereum': '以太坊', 'Stock Market': '股票',
      'War': '战争', 'Weather': '天气', 'Metals': '金属', 'Energy': '能源',
      'Geopolitics': '地缘政治', 'Climate': '气候', 'Health': '健康',
    };
    const categoryZh = categoryMap[tagLabel] || categoryMap[tagLabel?.toLowerCase()] || '其他';
    
    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      question: originalQuestion,
      questionZh: questionZh,
      outcomes: item.outcomes || ['YES', 'NO'],
      outcomePrices: outcomePrices,
      probability: probability,
      volume: parseFloat(item.volume || '0'),
      liquidity: parseFloat(item.liquidity || '0'),
      tags: Array.isArray(item.tags) ? item.tags : [],
      categoryZh: categoryZh,
      slug: item.slug || '',
      createdAt: item.creationTime || item.createdAt || new Date().toISOString(),
      expiresAt: item.expirationTime || item.expiresAt || '',
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
    }, (err, result) => {
      if (err) {
        console.error('COS上传失败:', err);
        reject(err);
      } else {
        console.log('Upload successful!');
        resolve(result);
      }
    });
  });
}

async function main() {
  try {
    console.log('=== PolyMarket Data Fetcher ===');
    console.log(`抓取时间: ${new Date().toISOString()}`);
    
    let allMarkets = [];
    const seenIds = new Set();
    
    // 1. 获取活跃市场（未关闭）- 只抓活跃的
    console.log('\n--- 获取活跃市场 ---');
    try {
      const activeData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=500');
      if (activeData) {
        const markets = transformData(activeData, 'active');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取活跃市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取活跃市场失败:', e.message);
    }
    
    // 2. 获取热门市场（按交易量排序）
    console.log('\n--- 获取热门市场 ---');
    try {
      const popularData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=300&order=volume&direction=desc');
      if (popularData) {
        const markets = transformData(popularData, 'popular');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取热门市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取热门市场失败:', e.message);
    }
    
    // 3. 获取即将到期市场（更活跃的）
    console.log('\n--- 获取即将到期市场 ---');
    try {
      const endingData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=200&order=expirationTime&direction=asc');
      if (endingData) {
        const markets = transformData(endingData, 'ending');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取即将到期市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取即将到期市场失败:', e.message);
    }
    
    // 去重并按交易量排序
    console.log(`\n=== 总计去重后: ${allMarkets.length}条 ===`);
    
    // 统计最终概率分布
    const finalProbs = allMarkets.map(m => m.probability);
    if (finalProbs.length > 0) {
      console.log(`最终概率分布:`);
      console.log(`  0-10%: ${finalProbs.filter(p => p < 10).length}条`);
      console.log(`  10-25%: ${finalProbs.filter(p => p >= 10 && p < 25).length}条`);
      console.log(`  25-40%: ${finalProbs.filter(p => p >= 25 && p < 40).length}条`);
      console.log(`  40-60%: ${finalProbs.filter(p => p >= 40 && p <= 60).length}条`);
      console.log(`  60-75%: ${finalProbs.filter(p => p > 60 && p <= 75).length}条`);
      console.log(`  75-90%: ${finalProbs.filter(p => p > 75 && p <= 90).length}条`);
      console.log(`  90-100%: ${finalProbs.filter(p => p > 90).length}条`);
    }
    
    // 按交易量排序，只保留前500条最活跃的
    allMarkets.sort((a, b) => b.volume - a.volume);
    const topMarkets = allMarkets.slice(0, 500);
    console.log(`\n筛选后保留前500条最活跃市场`);
    
    // 准备上传数据
    const result = {
      markets: topMarkets,
      total: topMarkets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api'
    };
    
    console.log('\n--- 上传到COS ---');
    await uploadToCOS(result);
    
    console.log('\n=== 抓取完成 ===');
    console.log(`总计: ${topMarkets.length}条活跃市场数据`);
    
  } catch (error) {
    console.error('抓取失败:', error);
    process.exit(1);
  }
}

main();
