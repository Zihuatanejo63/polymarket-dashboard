#!/usr/bin/env node

import COS from 'cos-nodejs-sdk-v5';
import https from 'https';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

const COS_CONFIG = {
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION
};

// 初始化LLM客户端
const llmConfig = new Config();
const llmClient = new LLMClient(llmConfig);

// 翻译系统提示词
const TRANSLATION_SYSTEM_PROMPT = `你是一个专业的预测市场标题翻译专家。

请将以下英文预测市场问题翻译成中文，要求：
1. 翻译准确、流畅，符合中文表达习惯
2. 保持原意，不要添加或删除信息
3. 对于专有名词（人名、地名、事件名），使用常用中文翻译
4. 政治敏感词汇请适当处理
5. 只需要输出翻译结果，不要解释

常见翻译示例：
- "Will X win Y?" → "X是否能赢得Y？"
- "Will the price of Bitcoin exceed $100,000 by 2025?" → "比特币价格能在2025年前超过10万美元吗？"
- "Who will win the 2024 US Presidential Election?" → "谁能赢得2024年美国总统选举？"
- "Will there be a ceasefire in Gaza by March 2024?" → "加沙能在2024年3月前停火吗？"
`;

/**
 * 使用Coze LLM API进行翻译
 */
async function translateWithDoubao(texts) {
  console.log(`🔄 使用Coze LLM API翻译 ${texts.length} 条文本...`);
  
  // 分批翻译，每批20条
  const batchSize = 20;
  const results = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(texts.length / batchSize);
    
    console.log(`  翻译批次 ${batchNum}/${totalBatches}...`);
    
    try {
      // 构建批量翻译的prompt
      const textList = batch.map((t, idx) => `${idx + 1}. ${t}`).join('\n');
      const prompt = `请翻译以下${batch.length}个预测市场问题为中文（每行一个，只输出翻译结果）：\n\n${textList}`;
      
      const messages = [
        { role: "system", content: TRANSLATION_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ];
      
      // 调用LLM API
      const response = await llmClient.invoke(messages, {
        model: 'doubao-seed-2-0-mini-260215',
        temperature: 0.3
      });
      
      // 解析响应
      const translatedText = response.content.trim();
      const lines = translatedText.split('\n').filter(line => line.trim());
      
      // 提取翻译结果
      batch.forEach((original, idx) => {
        const translated = lines[idx]?.replace(/^\d+\.\s*/, '').trim() || original;
        results.push(translated);
      });
      
      // 添加延迟避免API限流
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    } catch (error) {
      console.error(`  ⚠️ 批次 ${batchNum} 翻译失败: ${error.message}`);
      // 降级使用本地翻译
      batch.forEach(text => {
        results.push(enhancedTranslate(text));
      });
    }
  }
  
  console.log(`✅ 翻译完成 ${results.length} 条`);
  return results;
}

/**
 * 增强本地翻译字典（无需API）
 */
const TRANSLATIONS = {
  // 基础词汇
  'Will': '是否', 'will': '将', 'the': '', 'a': '', 'an': '',
  'to': '至', 'of': '的', 'in': '在', 'on': '在', 'at': '在',
  'for': '为了', 'with': '与', 'and': '和', 'or': '或',
  'by': '在...之前', 'before': '之前', 'after': '之后',
  'during': '期间', 'within': '在...内', 'until': '直到',
  
  // 动作
  'win': '赢得', 'wins': '赢得', 'winning': '赢得',
  'lose': '输掉', 'loses': '输掉',
  'become': '成为', 'becomes': '成为',
  'announce': '宣布', 'announces': '宣布', 'announced': '宣布',
  'release': '发布', 'releases': '发布', 'released': '发布',
  'launch': '推出', 'launches': '推出', 'launched': '推出',
  'hit': '达到', 'hits': '达到', 'reaches': '达到',
  'happen': '发生', 'happens': '发生',
  'sign': '签署', 'signs': '签署',
  'pass': '通过', 'passes': '通过',
  'end': '结束', 'ends': '结束',
  'start': '开始', 'starts': '开始', 'begin': '开始', 'begins': '开始',
  'join': '加入', 'joins': '加入',
  'leave': '离开', 'leaves': '离开',
  'buy': '收购', 'buys': '收购',
  'sell': '出售', 'sells': '出售',
  
  // 选举政治
  'election': '选举', 'elections': '选举',
  'president': '总统', 'presidential': '总统的',
  'nomination': '提名', 'nominee': '被提名人',
  'candidate': '候选人', 'candidates': '候选人',
  'primary': '初选', 'primaries': '初选',
  'vote': '投票', 'votes': '投票', 'voting': '投票',
  'poll': '民调', 'polls': '民调',
  'campaign': '竞选', 'campaigns': '竞选',
  'debate': '辩论', 'debates': '辩论',
  'concede': '承认败选', 'concedes': '承认败选',
  'Democratic': '民主党', 'Republican': '共和党',
  'Senate': '参议院', 'House': '众议院', 'Congress': '国会',
  'governor': '州长', 'mayor': '市长',
  
  // 人物
  'Trump': '特朗普', 'Donald Trump': '唐纳德·特朗普',
  'Biden': '拜登', 'Joe Biden': '乔·拜登',
  'Harris': '哈里斯', 'Kamala Harris': '卡玛拉·哈里斯',
  'Obama': '奥巴马',
  'Musk': '马斯克', 'Elon Musk': '埃隆·马斯克',
  'Zelensky': '泽连斯基',
  'Putin': '普京',
  'Netanyahu': '内塔尼亚胡',
  'LeBron James': '勒布朗·詹姆斯',
  'Chelsea Clinton': '切尔西·克林顿',
  'Oprah Winfrey': '奥普拉·温弗瑞',
  'Jesus Christ': '耶稣基督',
  
  // 国家地区
  'US': '美国', 'USA': '美国', 'United States': '美国',
  'China': '中国', 'Russia': '俄罗斯', 'Ukraine': '乌克兰',
  'Israel': '以色列', 'Iran': '伊朗', 'Gaza': '加沙',
  'Taiwan': '台湾',
  'NATO': '北约', 'EU': '欧盟',
  
  // 加密货币
  'Bitcoin': '比特币', 'BTC': '比特币',
  'Ethereum': '以太坊', 'ETH': '以太坊',
  'crypto': '加密货币', 'cryptocurrency': '加密货币',
  'blockchain': '区块链',
  
  // 金融
  'stock': '股票', 'stocks': '股票',
  'market': '市场', 'markets': '市场',
  'price': '价格', 'prices': '价格',
  'trade': '交易', 'trading': '交易',
  'rate': '利率', 'rates': '利率',
  'inflation': '通胀', 'recession': '衰退',
  'IPO': 'IPO', 'merger': '合并',
  'S&P 500': '标普500', 'Nasdaq': '纳斯达克',
  
  // 科技
  'AI': 'AI', 'artificial intelligence': '人工智能',
  'Tesla': '特斯拉', 'SpaceX': 'SpaceX',
  'Apple': '苹果', 'iPhone': 'iPhone',
  'Google': '谷歌', 'Alphabet': 'Alphabet',
  'Microsoft': '微软', 'Amazon': '亚马逊',
  'Meta': 'Meta', 'Facebook': 'Facebook',
  'OpenAI': 'OpenAI', 'ChatGPT': 'ChatGPT',
  
  // 游戏
  'GTA': 'GTA', 'GTA VI': 'GTA6', 'Grand Theft Auto': '侠盗猎车手',
  'release': '发布', 'released': '发布',
  
  // 体育
  'NBA': 'NBA', 'NFL': 'NFL', 'MLB': 'MLB', 'NHL': 'NHL',
  'Super Bowl': '超级碗', 'World Cup': '世界杯',
  'championship': '冠军', 'champion': '冠军',
  'finals': '决赛', 'final': '决赛',
  'playoffs': '季后赛',
  'MVP': 'MVP',
  
  // 娱乐
  'Oscar': '奥斯卡', 'Oscars': '奥斯卡',
  'Grammy': '格莱美', 'Grammys': '格莱美',
  'Emmy': '艾美', 'Emmys': '艾美',
  'Academy Awards': '奥斯卡奖',
  
  // 时间
  'January': '1月', 'February': '2月', 'March': '3月', 'April': '4月',
  'May': '5月', 'June': '6月', 'July': '7月', 'August': '8月',
  'September': '9月', 'October': '10月', 'November': '11月', 'December': '12月',
  '2024': '2024年', '2025': '2025年', '2026': '2026年', '2027': '2027年', '2028': '2028年',
  'year': '年', 'years': '年',
  'month': '月', 'months': '月',
  'week': '周', 'weeks': '周',
  'day': '日', 'days': '天',
  
  // 事件
  'war': '战争', 'ceasefire': '停火', 'truce': '停战',
  'invasion': '入侵', 'attack': '攻击',
  'deal': '协议', 'agreement': '协议', 'treaty': '条约',
  'sanctions': '制裁',
  
  // 其他
  'dead': '死亡', 'died': '死亡', 'dies': '死亡',
  'resign': '辞职', 'resigns': '辞职', 'resigned': '辞职',
  'impeach': '弹劾', 'impeached': '弹劾',
  'indict': '起诉', 'indicted': '起诉',
  'arrest': '逮捕', 'arrested': '逮捕',
  'declare': '宣布', 'declares': '宣布',
  'recognize': '承认', 'recognizes': '承认',
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
 * 增强本地翻译 - 更智能的处理
 */
function enhancedTranslate(text) {
  if (!text) return '';
  
  let translated = text;
  
  // 第1步：处理特殊词组（优先替换长的词组）
  const phrases = [
    ['Will', '是否'],
    ['win the', '赢得'],
    ['win a', '赢得'],
    ['US Presidential election', '美国总统选举'],
    ['presidential election', '总统选举'],
    ['presidential nomination', '总统提名'],
    ['Democratic nomination', '民主党提名'],
    ['Republican nomination', '共和党提名'],
    ['2028 election', '2028年选举'],
    ['2024 election', '2024年选举'],
    ['2025', '2025年'],
    ['2026', '2026年'],
    ['2027', '2027年'],
    ['2028', '2028年'],
    ['by 2025', '在2025年前'],
    ['by 2026', '在2026年前'],
    ['by the end of', '在...结束前'],
    ['GTA VI', 'GTA6'],
    ['Jesus Christ', '耶稣基督'],
    ['LeBron James', '勒布朗·詹姆斯'],
    ['Chelsea Clinton', '切尔西·克林顿'],
    ['Oprah Winfrey', '奥普拉·温弗瑞'],
    ['Donald Trump', '唐纳德·特朗普'],
    ['Joe Biden', '乔·拜登'],
    ['Kamala Harris', '卡玛拉·哈里斯'],
    ['Elon Musk', '埃隆·马斯克'],
    ['United States', '美国'],
    ['White House', '白宫'],
    ['Supreme Court', '最高法院'],
    ['Federal Reserve', '美联储'],
    ['interest rates', '利率'],
    ['stock market', '股票市场'],
    ['S&P 500', '标普500'],
    ['all time high', '历史新高'],
    ['all-time high', '历史新高'],
    ['before the end of', '在...结束前'],
    ['before the', '在...之前'],
    ['before 2025', '在2025年前'],
    ['before 2026', '在2026年前'],
    ['before January', '在1月前'],
    ['before February', '在2月前'],
    ['before March', '在3月前'],
    ['before April', '在4月前'],
    ['before May', '在5月前'],
    ['before June', '在6月前'],
    ['before July', '在7月前'],
    ['before August', '在8月前'],
    ['before September', '在9月前'],
    ['before October', '在10月前'],
    ['before November', '在11月前'],
    ['before December', '在12月前'],
  ];
  
  // 按长度降序排序词组
  phrases.sort((a, b) => b[0].length - a[0].length);
  
  for (const [from, to] of phrases) {
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    translated = translated.replace(regex, to);
  }
  
  // 第2步：处理剩余动词
  const verbReplacements = [
    ['return', '回归'],
    ['released', '发布'],
    ['announced', '宣布'],
    ['become', '成为'],
    ['sign', '签署'],
    ['reach', '达到'],
    ['hit', '达到'],
  ];
  
  for (const [from, to] of verbReplacements) {
    const regex = new RegExp(`\\b${from}\\b`, 'gi');
    translated = translated.replace(regex, to);
  }
  
  // 第3步：使用TRANSLATIONS字典替换单个词
  const sorted = Object.keys(TRANSLATIONS).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    translated = translated.replace(regex, TRANSLATIONS[key]);
  }
  
  // 第4步：清理多余的空格
  translated = translated.replace(/\s+/g, ' ').trim();
  
  // 第5步：处理问号结尾
  if (text.endsWith('?') && !translated.endsWith('?')) {
    translated += '?';
  }
  
  // 第6步：敏感词过滤
  translated = filterSensitiveWords(translated);
  
  return translated;
}

/**
 * 敏感词过滤 - 替换政治敏感词汇
 */
function filterSensitiveWords(text) {
  if (!text) return '';
  
  let filtered = text;
  
  // 敏感词映射表
  const sensitiveReplacements = [
    // 中国相关
    ['中国', '某国'],
    ['中共', '某党'],
    ['共产党', '某党派'],
    ['CCP', '某党派'],
    ['PRC', '某国'],
    ['中华人民共和国', '某国'],
    
    // 政治人物称谓
    ['主席', '领导人'],
    ['总书记', '领导人'],
    ['总理', '首相'],
    ['总统', '领导人'],
    ['元首', '领导人'],
    
    // 政府机构
    ['人大', '议会'],
    ['政协', '协商机构'],
    ['国务院', '内阁'],
    ['外交部', '外务部门'],
    ['国防部', '防卫部门'],
    
    // 政治术语
    ['政权', '当局'],
    ['执政党', '执政党'],
    ['在野党', '反对党'],
    ['政治体制', '体制'],
    ['意识形态', '理念'],
    ['统一战线', '联盟'],
    ['群众路线', '民众路线'],
    ['阶级斗争', '阶层矛盾'],
    ['文化大革命', '某时期'],
  ];
  
  for (const [from, to] of sensitiveReplacements) {
    const regex = new RegExp(from, 'gi');
    filtered = filtered.replace(regex, to);
  }
  
  return filtered;
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

    // 2. 按交易量排序，取前500条最热门的
    console.log('\n--- 按交易量排序 ---');
    allMarkets.sort((a, b) => b.volume - a.volume);
    
    // 取前500条最热门的
    const selectedMarkets = allMarkets.slice(0, 500);
    
    // 统计概率分布
    const highProb = selectedMarkets.filter(m => m.probability >= 70).length;
    const midProb = selectedMarkets.filter(m => m.probability >= 40 && m.probability < 70).length;
    const lowProb = selectedMarkets.filter(m => m.probability < 40).length;
    
    console.log(`✅ 选取前500条最热门市场`);
    console.log(`  概率分布 - 高概率(≥70%): ${highProb}条, 中概率(40-70%): ${midProb}条, 低概率(<40%): ${lowProb}条`);

    // 3. 批量翻译
    console.log('\n--- 开始豆包API翻译 ---');
    const translatedMarkets = await batchTranslateMarkets(selectedMarkets);

    // 4. 更新历史数据（用于图表）- 改为按市场存储历史序列
    console.log('\n--- 更新历史数据 ---');
    let marketHistoryMap = {};
    try {
      const historyUrl = `https://${COS_CONFIG.bucket}.cos.${COS_CONFIG.region}.myqcloud.com/polymarket-history.json`;
      const historyRes = await fetchUrl(historyUrl);
      if (historyRes && typeof historyRes === 'object' && !Array.isArray(historyRes)) {
        marketHistoryMap = historyRes;
      }
    } catch (e) {
      console.log('  历史数据不存在或获取失败，创建新历史');
    }
    
    // 为每个市场添加当前概率数据点（只保留Top 200市场，避免数据过大）
    const now = new Date().toISOString();
    const topMarkets = translatedMarkets.slice(0, 200);
    
    topMarkets.forEach(m => {
      if (!marketHistoryMap[m.id]) {
        marketHistoryMap[m.id] = {
          id: m.id,
          question: m.question,
          questionZh: m.questionZh,
          history: []
        };
      }
      
      // 添加当前数据点
      marketHistoryMap[m.id].history.push({
        timestamp: now,
        probability: m.probability,
        volume: m.volume
      });
      
      // 只保留最近30天的数据点（假设每小时抓取一次，30天=720个点）
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      marketHistoryMap[m.id].history = marketHistoryMap[m.id].history.filter(
        h => new Date(h.timestamp) > thirtyDaysAgo
      );
      
      // 更新市场信息
      marketHistoryMap[m.id].question = m.question;
      marketHistoryMap[m.id].questionZh = m.questionZh;
    });
    
    // 清理已不存在的市场数据（如果超过7天没有更新）
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    Object.keys(marketHistoryMap).forEach(key => {
      const lastUpdate = marketHistoryMap[key].history[marketHistoryMap[key].history.length - 1];
      if (lastUpdate && new Date(lastUpdate.timestamp) < sevenDaysAgo) {
        delete marketHistoryMap[key];
      }
    });
    
    // 统计历史数据
    const totalHistoryPoints = Object.values(marketHistoryMap).reduce(
      (sum, m) => sum + (m.history?.length || 0), 0
    );
    
    // 5. 上传数据和历史
    const result = {
      markets: translatedMarkets,
      total: translatedMarkets.length,
      fetchedAt: new Date().toISOString(),
      source: 'polymarket-gamma-api-doubao-translation'
    };

    console.log('\n--- 上传到COS ---');
    await uploadToCOS(result);
    await uploadHistoryToCOS(marketHistoryMap);
    console.log(`  已更新历史数据: ${Object.keys(marketHistoryMap).length} 个市场, ${totalHistoryPoints} 个数据点`);

    console.log('\n=== 完成 ===');
    console.log(`总计: ${translatedMarkets.length} 条已翻译市场数据`);
    console.log(`结束时间: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('抓取失败:', error);
    process.exit(1);
  }
}

main();
