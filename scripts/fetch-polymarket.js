#!/usr/bin/env node

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';

const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

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
  
  // 统计概率分布
  const probs = markets.map(m => {
    const prices = m.outcomePrices || ['0.5', '0.5'];
    const price = parseFloat(prices[0]) || 0.5;
    return Math.round(price * 100);
  });
  
  console.log(`概率范围: ${Math.min(...probs)}% - ${Math.max(...probs)}%`);
  console.log(`概率分布: <10%: ${probs.filter(p => p < 10).length}, >90%: ${probs.filter(p => p > 90).length}, 40-60%: ${probs.filter(p => p >= 40 && p <= 60).length}`);
  
  return markets.map(item => {
    // PolyMarket: YES价格=outcomePrices[0], NO价格=outcomePrices[1]
    // outcomePrices可能是JSON字符串，需要解析
    let outcomePrices = item.outcomePrices || ['0.5', '0.5'];
    if (typeof outcomePrices === 'string') {
      try {
        outcomePrices = JSON.parse(outcomePrices);
      } catch (e) {
        outcomePrices = ['0.5', '0.5'];
      }
    }
    const yesPrice = parseFloat(outcomePrices[0]) || 0.5;
    const probability = Math.round(yesPrice * 100);
    
    // 尝试获取中文问题
    const originalQuestion = item.question || item.title || 'Unknown';
    const questionZh = item.questionZh || item.questionCn || item.titleCn || originalQuestion;
    
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
    
    // 1. 获取活跃市场（未关闭）
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
    
    // 2. 获取已关闭市场（往往有更极端的概率）
    console.log('\n--- 获取已关闭市场 ---');
    try {
      const closedData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=true&limit=500');
      if (closedData) {
        const markets = transformData(closedData, 'closed');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取已关闭市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取已关闭市场失败:', e.message);
    }
    
    // 3. 获取热门市场
    console.log('\n--- 获取热门市场 ---');
    try {
      const popularData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=300&orderBy=volume');
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
    
    // 4. 按概率排序获取极端概率市场
    console.log('\n--- 获取极端概率市场 ---');
    try {
      // 高概率市场
      const highProbData = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=200&orderBy=probability&minPrice=0.8');
      if (highProbData) {
        const markets = transformData(highProbData, 'high-prob');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取高概率市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取高概率市场失败:', e.message);
    }
    
    // 5. 尝试获取CLOB市场的数据
    console.log('\n--- 获取CLOB市场 ---');
    try {
      const clobData = await fetchUrl('https://clob.polymarket.com/markets?limit=200');
      if (clobData && Array.isArray(clobData)) {
        const markets = transformData(clobData, 'clob');
        markets.forEach(m => {
          if (!seenIds.has(m.id)) {
            seenIds.add(m.id);
            allMarkets.push(m);
          }
        });
        console.log(`已获取CLOB市场: ${markets.length}条`);
      }
    } catch (e) {
      console.error('获取CLOB市场失败:', e.message);
    }
    
    // 去重并按交易量排序
    console.log(`\n=== 总计去重后: ${allMarkets.length}条 ===`);
    
    // 统计最终概率分布
    const finalProbs = allMarkets.map(m => m.probability);
    console.log(`最终概率分布:`);
    console.log(`  0-10%: ${finalProbs.filter(p => p < 10).length}条`);
    console.log(`  10-25%: ${finalProbs.filter(p => p >= 10 && p < 25).length}条`);
    console.log(`  25-40%: ${finalProbs.filter(p => p >= 25 && p < 40).length}条`);
    console.log(`  40-60%: ${finalProbs.filter(p => p >= 40 && p <= 60).length}条`);
    console.log(`  60-75%: ${finalProbs.filter(p => p > 60 && p <= 75).length}条`);
    console.log(`  75-90%: ${finalProbs.filter(p => p > 75 && p <= 90).length}条`);
    console.log(`  90-100%: ${finalProbs.filter(p => p > 90).length}条`);
    
    // 准备上传数据
    const result = {
      markets: allMarkets,
      total: allMarkets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api'
    };
    
    console.log('\n--- 上传到COS ---');
    await uploadToCOS(result);
    
    console.log('\n=== 抓取完成 ===');
    console.log(`总计: ${allMarkets.length}条市场数据`);
    
  } catch (error) {
    console.error('抓取失败:', error);
    process.exit(1);
  }
}

main();
