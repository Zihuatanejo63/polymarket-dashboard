/**
 * 翻译工具模块
 * 提供中英文翻译功能
 */

// 常用分类标签翻译
const categoryTranslations: Record<string, string> = {
  'Finance': '金融',
  'Crypto': '加密货币',
  'Politics': '政治',
  'Sports': '体育',
  'Technology': '科技',
  'Science': '科学',
  'Entertainment': '娱乐',
  'Business': '商业',
  'Economics': '经济',
  'World': '世界',
  'US Politics': '美国政治',
  'Elections': '选举',
  'Bitcoin': '比特币',
  'Ethereum': '以太坊',
  'NBA': 'NBA',
  'NFL': 'NFL',
  'Stock Market': '股票市场',
  'Tech': '科技',
  'Geopolitics': '地缘政治',
  'Climate': '气候',
  'Health': '健康',
  'War': '战争',
  'Weather': '天气',
  'Metals': '金属',
  'Energy': '能源',
}

// 常见问题关键词翻译（使用原始大小写）
const keywordTranslations: Record<string, string> = {
  // 人物
  'Trump': '特朗普',
  'trump': '特朗普',
  'Biden': '拜登',
  'biden': '拜登',
  'Obama': '奥巴马',
  'obama': '奥巴马',
  'Harris': '哈里斯',
  'harris': '哈里斯',
  'Kamala': '卡玛拉',
  'kamala': '卡玛拉',
  'Pelosi': '佩洛西',
  'pelosi': '佩洛西',
  'Clinton': '克林顿',
  'clinton': '克林顿',
  'Hillary': '希拉里',
  'hillary': '希拉里',
  'LeBron': '勒布朗',
  'lebron': '勒布朗',
  'James': '詹姆斯',
  'Yang': '杨',
  'yang': '杨',
  'Andrew Yang': '杨安泽',
  'Sanders': '桑德斯',
  'sanders': '桑德斯',
  'Bernie': '伯尼',
  'bernie': '伯尼',
  'Elon': '埃隆',
  'elon': '埃隆',
  'Musk': '马斯克',
  'musk': '马斯克',
  'Oprah': '奥普拉',
  'oprah': '奥普拉',
  'Winfrey': '温弗瑞',
  'Putin': '普京',
  'putin': '普京',
  'Zelensky': '泽连斯基',
  'zelensky': '泽连斯基',
  'Netanyahu': '内塔尼亚胡',
  'netanyahu': '内塔尼亚胡',
  'Tim Walz': '蒂姆·沃尔兹',
  'Walz': '沃尔兹',
  'Clooney': '克鲁尼',
  'George Clooney': '乔治·克鲁尼',
  'Kennedy': '肯尼迪',
  'Robert': '罗伯特',
  'Taylor Swift': '泰勒·斯威夫特',
  'President': '总统',
  'president': '总统',
  'CEO': '首席执行官',
  'Supreme Court': '最高法院',
  'Supreme court': '最高法院',
  'the ': '',
  'The ': '',
  'US': '美国',
  'us': '美国',
  // 地点
  'United States': '美国',
  'U.S.': '美国',
  'U.S': '美国',
  'USA': '美国',
  'America': '美国',
  'america': '美国',
  'Republican': '共和党',
  'republican': '共和党',
  'Democratic': '民主党',
  'democratic': '民主党',
  'Democrat': '民主党',
  'democrat': '民主党',
  'Nomination': '提名',
  'nomination': '提名',
  'nominee': '候选人',
  'Republican Presidential Nomination': '共和党总统候选人提名',
  'Democratic Presidential Nomination': '民主党总统候选人提名',
  'Presidential Election': '总统大选',
  'Presidential': '总统',
  'presidential': '总统',
  'Presidency': '总统职位',
  // 加密货币
  'Bitcoin': '比特币',
  'bitcoin': '比特币',
  'BTC': '比特币',
  'btc': '比特币',
  'Ethereum': '以太坊',
  'ethereum': '以太坊',
  'ETH': '以太坊',
  'eth': '以太坊',
  'Coinbase': 'Coinbase交易所',
  'crypto': '加密',
  'Crypto': '加密货币',
  // 金融
  'stock': '股票',
  'Stock': '股票',
  'market': '市场',
  'Market': '市场',
  'inflation': '通胀',
  'Inflation': '通胀',
  'GDP': 'GDP',
  'gdp': 'GDP',
  'Fed': '美联储',
  'fed': '美联储',
  'recession': '衰退',
  'Recession': '衰退',
  'unemployment': '失业',
  // 体育
  'NBA': 'NBA',
  'nba': 'NBA',
  'NFL': 'NFL',
  'nfl': 'NFL',
  'MLB': 'MLB',
  'NHL': 'NHL',
  'Super Bowl': '超级碗',
  'football': '橄榄球',
  'Football': '橄榄球',
  'basketball': '篮球',
  'Basketball': '篮球',
  'soccer': '足球',
  'tennis': '网球',
  'golf': '高尔夫',
  'MMA': 'MMA',
  'UFC': 'UFC',
  'boxing': '拳击',
  'Olympics': '奥运会',
  'olympics': '奥运会',
  'World Cup': '世界杯',
  'World cup': '世界杯',
  'championship': '冠军',
  'Championship': '冠军',
  'finals': '决赛',
  'Finals': '决赛',
  'playoffs': '季后赛',
  'Playoffs': '季后赛',
  'MVP': 'MVP',
  'mvp': 'MVP',
  'season': '赛季',
  'Season': '赛季',
  'win the': '赢得',
  'Win the': '赢得',
  'won the': '赢得',
  'win': '赢得',
  'won': '赢得',
  'wins': '赢得',
  'lose': '输掉',
  'Hornets': '黄蜂队',
  'Hornet': '黄蜂队',
  'Lakers': '湖人队',
  'Laker': '湖人队',
  'Warriors': '勇士队',
  'Warrior': '勇士队',
  'Celtics': '凯尔特人队',
  'Heat': '热火队',
  'Nuggets': '掘金队',
  'Suns': '太阳队',
  'Clippers': '快船队',
  'Mavericks': '独行侠队',
  'Bucks': '雄鹿队',
  '76ers': '76人队',
  'Knicks': '尼克斯队',
  'Raptors': '猛龙队',
  // 科技
  'AI': 'AI',
  'GPT': 'GPT',
  'Tesla': '特斯拉',
  'Apple': '苹果',
  'Google': '谷歌',
  'Microsoft': '微软',
  'Amazon': '亚马逊',
  'Meta': 'Meta',
  'product': '产品',
  'IPO': '上市',
  'ipo': '上市',
  'stock price': '股价',
  'share price': '股价',
  'valuation': '估值',
  'acquisition': '收购',
  'merger': '合并',
  'partnership': '合作',
  'announcement': '宣布',
  'approval': '批准',
  'regulation': '监管',
  'ban': '封禁',
  'launch': '发布',
  'release': '发布',
  'update': '更新',
  'upgrade': '升级',
  'debut': '首次亮相',
  'Launch': '发布',
  'approve': '批准',
  'Approve': '批准',
  'Release': '发布',
  // 音乐/娱乐
  'album': '专辑',
  'Album': '专辑',
  'concert': '演唱会',
  'Concert': '演唱会',
  'Rihanna': '蕾哈娜',
  'Celsius': '摄氏温度',
  'GTA': 'GTA',
  // 地缘政治
  'Russia': '俄罗斯',
  'russia': '俄罗斯',
  'Ukraine': '乌克兰',
  'ukraine': '乌克兰',
  'China': '中国',
  'china': '中国',
  'Iran': '伊朗',
  'iran': '伊朗',
  'Israel': '以色列',
  'israel': '以色列',
  'war': '战争',
  'War': '战争',
  'treaty': '条约',
  'Treaty': '条约',
  'agreement': '协议',
  'Agreement': '协议',
  'deal': '协议',
  'Deal': '协议',
  'sanctions': '制裁',
  'Ceasefire': '停火',
  'ceasefire': '停火',
  // 其他
  'price': '价格',
  'Price': '价格',
  'prices': '价格',
  'Prices': '价格',
  'higher': '更高',
  'Higher': '更高',
  'lower': '更低',
  'Lower': '更低',
  'above': '超过',
  'Below': '低于',
  'below': '低于',
  'million': '百万',
  'Million': '百万',
  'billion': '十亿',
  'Billion': '十亿',
  'before': '之前',
  'Before': '之前',
  'after': '之后',
  'After': '之后',
  'return': '回归',
  'Return': '回归',
  'out': '下台',
  'Out': '下台',
  'election': '选举',
  'Election': '选举',
  'vote': '投票',
  'Vote': '投票',
  'court': '法院',
  'Court': '法院',
  'supreme': '最高',
  'Supreme': '最高',
  'congress': '国会',
  'Congress': '国会',
  'senate': '参议院',
  'Senate': '参议院',
  'will': '会',
  'Will': '会',
  'ago': '前',
  'from now': '后',
  'January': '1月',
  'February': '2月',
  'March': '3月',
  'April': '4月',
  'May': '5月',
  'June': '6月',
  'July': '7月',
  'August': '8月',
  'September': '9月',
  'October': '10月',
  'November': '11月',
  'December': '12月',
  // 年份
  '2025': '2025年',
  '2026': '2026年',
  '2027': '2027年',
  '2028': '2028年',
  '2029': '2029年',
  '2030': '2030年',
}

/**
 * 翻译文本为中文
 */
export function translateToChinese(text: string): string {
  if (!text) return ''

  let translated = text
  
  // 修复重复的"年"（如"2028年年" -> "2028年"）
  translated = translated.replace(/(\d+)年年/g, '$1年');
  // 修复重复的"月"（如"5月月" -> "5月"）
  translated = translated.replace(/(\d+)月月/g, '$1月');
  // 修复重复的"日"（如"15日日" -> "15日"）
  translated = translated.replace(/(\d+)日日/g, '$1日');

  // 按关键词长度降序替换（避免短词替换后影响长词匹配）
  const sortedKeywords = Object.keys(keywordTranslations).sort((a, b) => b.length - a.length)

  for (const eng of sortedKeywords) {
    const chn = keywordTranslations[eng]
    // 使用正则表达式，匹配完整单词（不区分大小写）
    const regex = new RegExp(`\\b${eng}\\b`, 'gi')
    translated = translated.replace(regex, chn)
  }

  return translated
}

/**
 * 翻译分类标签
 */
export function translateCategory(category: string): string {
  if (!category) return '其他'

  const normalized = String(category).trim()

  // 直接匹配
  if (categoryTranslations[normalized]) {
    return categoryTranslations[normalized]
  }

  // 不区分大小写匹配
  for (const [key, value] of Object.entries(categoryTranslations)) {
    if (key.toLowerCase() === normalized.toLowerCase()) {
      return value
    }
  }

  // 部分匹配
  const lower = normalized.toLowerCase()
  for (const [key, value] of Object.entries(categoryTranslations)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return value
    }
  }

  return normalized
}

/**
 * 获取分类的中文名称
 */
export function getCategoryZh(category: string | undefined): string {
  if (!category) return '其他'
  return translateCategory(category)
}

/**
 * 格式化概率显示
 */
export function formatProbability(prob: number | string): string {
  const num = typeof prob === 'string' ? parseFloat(prob) : prob
  if (isNaN(num)) return 'N/A'
  return `${num.toFixed(1)}%`
}

/**
 * 格式化交易量
 */
export function formatVolume(volume: number | string): string {
  const num = typeof volume === 'string' ? parseFloat(volume) : volume
  if (isNaN(num)) return '$0'

  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`
  }
  return `$${num.toFixed(0)}`
}
