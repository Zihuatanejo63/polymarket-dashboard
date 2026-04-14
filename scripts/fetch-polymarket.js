#!/usr/bin/env node

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';

const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

// 豆包API配置
const DOUBAO_API_KEY = process.env.COZE_API_KEY;
const DOUBAO_API_URL = 'https://api.coze.cn/v3/chat';

/**
 * 调用豆包API批量翻译
 * @param {string[]} texts 要翻译的英文文本数组
 * @returns {Promise<string[]>} 中文翻译数组
 */
async function translateWithDoubao(texts) {
  if (!DOUBAO_API_KEY) {
    console.warn('⚠️ 未配置COZE_API_KEY，使用简单翻译');
    return texts.map(simpleTranslate);
  }

  console.log(`🔄 调用豆包API翻译 ${texts.length} 条文本...`);

  // 构建批量翻译prompt
  const prompt = `请将以下PolyMarket预测市场标题全部翻译成中文。

要求：
1. 全文翻译，包括所有的英文单词（如 "Will"、"the"、"in"、"before"、"on"、"win"、"election" 等）
2. 人名可音译或保留（如 "LeBron James" → "勒布朗·詹姆斯"）
3. 地名、组织名可音译或保留
4. 输出必须是完整通顺的中文句子
5. 格式：每行一个翻译，与输入顺序一致

翻译示例：
- 输入: "Will LeBron James win the 2028 US Presidential election?"
- 输出: "勒布朗·詹姆斯会赢得2028年美国总统选举吗？"
- 输入: "Will Jesus Christ return before GTA VI?"
- 输出: "耶稣基督会在GTA6发售前降临吗？"
- 输入: "Will Chelsea Clinton win the 2028 Democratic presidential nomination?"
- 输出: "切尔西·克林顿会赢得2028年民主党总统提名吗？"

待翻译内容（共${texts.length}条）：
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

请只返回翻译结果，每行一条，不要编号和额外说明：`;

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      bot_id: '7398091034558922764', // 使用通用翻译bot
      user_id: 'github-actions',
      additional_messages: [
        { role: 'user', content: prompt, content_type: 'text' }
      ],
      stream: false
    });

    const req = https.request(DOUBAO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': '*/*'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.code !== 0) {
            console.error('豆包API错误:', result.msg);
            // 降级使用简单翻译
            resolve(texts.map(simpleTranslate));
            return;
          }

          // 解析翻译结果
          const content = result.data?.messages?.[0]?.content || '';
          const translations = content.split('\n').filter(line => line.trim());

          // 确保返回数量与输入一致
          if (translations.length >= texts.length) {
            console.log('✅ 豆包API翻译成功');
            resolve(translations.slice(0, texts.length));
          } else {
            console.warn('⚠️ 翻译结果数量不匹配，使用混合策略');
            const result = [];
            for (let i = 0; i < texts.length; i++) {
              result.push(translations[i] || simpleTranslate(texts[i]));
            }
            resolve(result);
          }
        } catch (e) {
          console.error('解析豆包API响应失败:', e.message);
          resolve(texts.map(simpleTranslate));
        }
      });
    });

    req.on('error', (err) => {
      console.error('豆包API请求失败:', err.message);
      resolve(texts.map(simpleTranslate));
    });

    req.setTimeout(60000, () => {
      console.error('豆包API超时');
      req.destroy();
      resolve(texts.map(simpleTranslate));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 简单关键词替换翻译（降级方案）
 */
const TRANSLATIONS = {
  'Will': '是否', 'Trump': '特朗普', 'Biden': '拜登', 'win': '赢得',
  'election': '选举', 'president': '总统', 'Bitcoin': '比特币',
  'Ethereum': '以太坊', 'price': '价格', 'hit': '达到', 'by': '在...之前',
  'before': '之前', 'after': '之后', 'released': '发布',
  'GTA': 'GTA', 'Ukraine': '乌克兰', 'Russia': '俄罗斯', 'war': '战争',
  'ceasefire': '停火', 'deal': '协议', 'agreement': '协议',
  'NBA': 'NBA', 'NFL': 'NFL', 'championship': '冠军', 'finals': '决赛',
  'AI': 'AI', 'Tesla': '特斯拉', 'Apple': '苹果', 'Google': '谷歌',
  'CEO': 'CEO', 'CEO ': '首席执行官 ', 'stock': '股票', 'market': '市场'
};

function simpleTranslate(text) {
  if (!text) return '';
  let translated = text;
  // 按长度降序替换
  const sorted = Object.keys(TRANSLATIONS).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    translated = translated.replace(regex, TRANSLATIONS[key]);
  }
  return translated;
}

/**
 * 批量翻译市场标题
 * @param {Array} markets 市场数据数组
 * @returns {Promise<Array>} 翻译后的市场数组
 */
async function batchTranslateMarkets(markets) {
  // 分批翻译，每批50条（避免token超限）
  const batchSize = 50;
  const translatedMarkets = [];

  for (let i = 0; i < markets.length; i += batchSize) {
    const batch = markets.slice(i, i + batchSize);
    const textsToTranslate = batch.map(m => m.question);

    console.log(`\n📦 翻译批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(markets.length / batchSize)} (${batch.length}条)`);

    const translations = await translateWithDoubao(textsToTranslate);

    batch.forEach((market, idx) => {
      translatedMarkets.push({
        ...market,
        questionZh: translations[idx] || simpleTranslate(market.question)
      });
    });

    // 添加延迟避免API限流
    if (i + batchSize < markets.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return translatedMarkets;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const isCosUrl = url.includes('myqcloud.com');
    if (!isCosUrl) {
      console.log(`Fetching: ${url}`);
    }
    https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON解析失败`)); }
      });
    }).on('error', (err) => {
      if (!isCosUrl) {
        reject(err);
      } else {
        reject(new Error('文件不存在'));
      }
    }).setTimeout(30000, () => reject(new Error('超时')));
  });
}

function transformData(rawData) {
  let markets = Array.isArray(rawData) ? rawData : (rawData.events || rawData.markets || []);

  // 只保留活跃市场
  const now = new Date();
  const activeMarkets = markets.filter(m => {
    if (m.closed === true || m.isClosed === true) return false;
    if (m.expirationTime || m.expiresAt) {
      const expireDate = new Date(m.expirationTime || m.expiresAt);
      if (expireDate < now) return false;
    }
    return true;
  });

  return activeMarkets.map(item => {
    let outcomePrices = item.outcomePrices || ['0.5', '0.5'];
    if (typeof outcomePrices === 'string') {
      try { outcomePrices = JSON.parse(outcomePrices); }
      catch (e) { outcomePrices = ['0.5', '0.5']; }
    }
    const yesPrice = parseFloat(outcomePrices[0]) || 0.5;
    const probability = Math.round(yesPrice * 100);

    const tag = item.tags?.[0] || item.category || '';
    const tagLabel = typeof tag === 'object' ? tag?.label : tag;

    const categoryMap = {
      'Finance': '金融', 'Crypto': '加密货币', 'Politics': '政治',
      'US Politics': '美国政治', 'World': '国际', 'Sports': '体育',
      'Technology': '科技', 'Science': '科学', 'Entertainment': '娱乐',
      'Business': '商业', 'Economics': '经济', 'Elections': '选举',
      'Bitcoin': '比特币', 'Ethereum': '以太坊', 'Stock Market': '股票',
      'War': '战争', 'Geopolitics': '地缘政治'
    };

    return {
      id: item.id || item.conditionId || String(Date.now() + Math.random()),
      question: item.question || item.title || 'Unknown',
      outcomes: item.outcomes || ['YES', 'NO'],
      outcomePrices: outcomePrices,
      probability: probability,
      volume: parseFloat(item.volume || '0'),
      liquidity: parseFloat(item.liquidity || '0'),
      categoryZh: categoryMap[tagLabel] || '其他',
      slug: item.slug || '',
      expiresAt: item.expirationTime || item.expiresAt || '',
      updatedAt: new Date().toISOString()
    };
  });
}

async function uploadToCOS(data) {
  const cos = new COS({ SecretId: COS_CONFIG.secretId, SecretKey: COS_CONFIG.secretKey });
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: COS_CONFIG.bucket,
      Region: COS_CONFIG.region,
      Key: 'polymarket-data.json',
      Body: Buffer.from(JSON.stringify(data)),
      ContentType: 'application/json',
      ACL: 'public-read'
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function uploadHistoryToCOS(data) {
  const cos = new COS({ SecretId: COS_CONFIG.secretId, SecretKey: COS_CONFIG.secretKey });
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: COS_CONFIG.bucket,
      Region: COS_CONFIG.region,
      Key: 'polymarket-history.json',
      Body: Buffer.from(JSON.stringify(data)),
      ContentType: 'application/json',
      ACL: 'public-read'
    }, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function main() {
  try {
    console.log('=== PolyMarket Data Fetcher with Doubao Translation ===');
    console.log(`开始时间: ${new Date().toISOString()}`);

    let allMarkets = [];
    const seenIds = new Set();

    // 1. 获取活跃市场（大样本）
    console.log('\n--- 获取活跃市场 ---');
    try {
      const data = await fetchUrl('https://gamma-api.polymarket.com/markets?closed=false&limit=1000');
      const markets = transformData(data);
      markets.forEach(m => {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          allMarkets.push(m);
        }
      });
      console.log(`✅ 获取 ${markets.length} 条活跃市场`);
    } catch (e) {
      console.error('❌ 获取活跃市场失败:', e.message);
    }

    // 2. 按概率分层抽样，确保分布均衡
    console.log('\n--- 按概率分层抽样 ---');
    const highProb = allMarkets.filter(m => m.probability >= 70);  // 高概率 ≥70%
    const midProb = allMarkets.filter(m => m.probability >= 40 && m.probability < 70);  // 中概率 40-70%
    const lowProb = allMarkets.filter(m => m.probability < 40);  // 低概率 <40%
    
    console.log(`  原始分布 - 高概率(≥70%): ${highProb.length}条, 中概率(40-70%): ${midProb.length}条, 低概率(<40%): ${lowProb.length}条`);
    
    // 分层抽样：确保各层都有足够样本
    const sampleHigh = highProb.slice(0, 150);  // 取前150条高概率
    const sampleMid = midProb.slice(0, 150);    // 取前150条中概率  
    const sampleLow = lowProb.slice(0, 200);    // 取前200条低概率
    
    // 合并并按交易量排序
    let selectedMarkets = [...sampleHigh, ...sampleMid, ...sampleLow];
    selectedMarkets.sort((a, b) => b.volume - a.volume);
    
    console.log(`✅ 分层抽样后: ${selectedMarkets.length}条 (高${sampleHigh.length}/中${sampleMid.length}/低${sampleLow.length})`);

    // 3. 批量翻译
    console.log('\n--- 开始豆包API翻译 ---');
    const translatedMarkets = await batchTranslateMarkets(selectedMarkets);

    // 4. 更新历史数据（用于图表）
    console.log('\n--- 更新历史数据 ---');
    let historyData = [];
    try {
      const historyUrl = `https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-history.json`;
      const historyRes = await fetchUrl(historyUrl);
      if (Array.isArray(historyRes)) {
        historyData = historyRes;
        // 只保留最近30天数据
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        historyData = historyData.filter(h => new Date(h.timestamp) > thirtyDaysAgo);
      }
    } catch (e) {
      console.log('  历史数据不存在或获取失败，创建新历史');
    }
    
    // 添加当前时间点数据（Top 100市场的概率历史）
    const currentSnapshot = {
      timestamp: new Date().toISOString(),
      markets: translatedMarkets.slice(0, 100).map(m => ({
        id: m.id,
        question: m.question,
        questionZh: m.questionZh,
        probability: m.probability,
        volume: m.volume
      }))
    };
    historyData.push(currentSnapshot);
    
    // 5. 上传数据和历史
    const result = {
      markets: translatedMarkets,
      total: translatedMarkets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api-doubao-translation'
    };

    console.log('\n--- 上传到COS ---');
    await uploadToCOS(result);
    await uploadHistoryToCOS(historyData);
    console.log(`  已更新历史数据: ${historyData.length} 个时间点`);

    console.log('\n=== 完成 ===');
    console.log(`总计: ${translatedMarkets.length} 条已翻译市场数据`);
    console.log(`结束时间: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('抓取失败:', error);
    process.exit(1);
  }
}

main();
