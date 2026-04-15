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
  'Hillary Clinton': '希拉里·克林顿',
  'hillary': '希拉里',
  'Chelsea': '切尔西',
  'Chelsea Clinton': '切尔西·克林顿',
  'chelsea': '切尔西',
  'LeBron': '勒布朗',
  'lebron': '勒布朗',
  'LeBron James': '勒布朗·詹姆斯',
  'James': '詹姆斯',
  'Yang': '杨',
  'yang': '杨',
  'Andrew Yang': '杨安泽',
  'Bernie Sanders': '伯尼·桑德斯',
  'Sanders': '桑德斯',
  'sanders': '桑德斯',
  'Bernie': '伯尼',
  'bernie': '伯尼',
  'Elon': '埃隆',
  'elon': '埃隆',
  'Musk': '马斯克',
  'musk': '马斯克',
  'Oprah': '奥普拉',
  'Oprah Winfrey': '奥普拉·温弗瑞',
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
  'Mike Pence': '迈克·彭斯',
  'Mike': '迈克',
  'Pence': '彭斯',
  'Kennedy': '肯尼迪',
  'Robert': '罗伯特',
  'Taylor Swift': '泰勒·斯威夫特',
  'Hunter Biden': '亨特·拜登',
  'Hunter': '亨特',
  'Kim Kardashian': '金·卡戴珊',
  'Kim': '金',
  'Kardashian': '卡戴珊',
  'Jesus Christ': '耶稣·基督',
  'Jesus': '耶稣',
  'Christ': '基督',
  'Charlotte': '夏洛特',
  'Charlotte Hornets': '夏洛特黄蜂队',
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
  'President': '总统',
  'president': '总统',
  'CEO': '首席执行官',
  'Supreme Court': '最高法院',
  'Supreme court': '最高法院',
  'the ': '',
  'The ': '',
  'US': '美国',
  'us': '美国',
  'Paloma Valencia': '帕洛玛·巴伦西亚',
  'Phil Murphy': '菲尔·墨菲',
  'MrBeast': 'MrBeast',
  'Beto ORourke': '贝托·奥罗克',
  "Beto O'Rourke": '贝托·奥罗克',
  'Beto': '贝托',
  'Rourke': '奥罗克',
  'Byron Donalds': '拜伦·唐纳兹',
  'Liz Cheney': '利兹·切尼',
  'Zohran Mamdani': '佐赫兰·曼达尼',
  'Greg Abbott': '格雷格·阿博特',
  'Vivek Ramaswamy': '维韦克·拉马斯瓦米',
  'John Thune': '约翰·图恩',
  'Kristi Noem': '克里斯蒂·诺姆',
  'Stephen Smith': '斯蒂芬·史密斯',
  'Gina Raimondo': '吉娜·雷蒙多',
  'Tom Brady': '汤姆·布雷迪',
  'Sarah Huckabee Sanders': '萨拉·赫卡比·桑德斯',
  'Sarah Huckabee': '萨拉·赫卡比·桑德斯',
  'Tulsi Gabbard': '图尔西·加巴德',
  'Barack Obama': '巴拉克·奥巴马',
  'Barack': '巴拉克',
  'Michelle Obama': '米歇尔·奥巴马',
  'Michelle': '米歇尔',
  'Jasmine Crockett': '贾斯敏·克罗基特',
  'Villarreal': '比利亚雷亚尔',
  'La Liga': '西甲联赛',
  'Raphael Warnock': '拉斐尔·沃诺克',
  'Roy Cooper': '罗伊·库珀',
  'Katie Britt': '凯蒂·布里特',
  'Viktor Orban': '维克多·欧尔班',
  'Viktor': '维克多',
  'Orban': '欧尔班',
  'Gavin Newsom': '加文·纽森',
  'Elise Stefanik': '伊利斯·斯特凡尼克',
  'Nikki Haley': '尼基·黑利',
  'Cory Booker': '科里·布克',
  'Jared Polis': '贾里德·波利斯',
  'Uzbekistan': '乌兹别克斯坦',
  'Curaçao': '库拉索',
  'South Africa': '南非',
  'New Zealand': '新西兰',
  'Hungary': '匈牙利',
  'Prime Minister': '总理',
  // 移除中国相关内容 - 避免敏感词
  'Colombian presidential': '哥伦比亚总统',
  // 国家和地区
  'Saudi Arabia': '沙特阿拉伯',
  'Jordan': '约旦',
  'South Korea': '韩国',
  'Qatar': '卡塔尔',
  'Haiti': '海地',
  'Scotland': '苏格兰',
  // 助动词和介词
  'not': '不',
  'Not': '不',
  'by': '截至',
  'By': '截至',
  // 足球/联赛
  'English Premier League': '英格兰超级联赛',
  'Premier League': '超级联赛',
  'Arsenal': '阿森纳',
  'arsenal': '阿森纳',
  'Aston Villa': '阿斯顿维拉',
  'Villa': '维拉',
  'Manchester United': '曼联',
  'United': '联队',
  'Liverpool': '利物浦',
  'liverpool': '利物浦',
  'Manchester City': '曼城',
  'Manchester': '曼彻斯特',
  'manchester': '曼彻斯特',
  'Tottenham': '热刺',
  'tottenham': '热刺',
  'Newcastle': '纽卡斯尔',
  'newcastle': '纽卡斯尔',
  'Portland Trail Blazers': '波特兰开拓者队',
  'Blazers': '开拓者队',
  'Club Brugge': '布鲁日俱乐部',
  'Champions League': '欧冠联赛',
  'Atletico Madrid': '马德里竞技',
  'San Antonio Spurs': '圣安东尼奥马刺队',
  'Spurs': '马刺队',
  'Atlanta Hawks': '亚特兰大老鹰队',
  'Hawks': '老鹰队',
  'Cape Verde': '佛得角',
  // 政治人物
  'Glenn Youngkin': '格伦·扬金',
  'Mark Cuban': '马克·库班',
  'Stephen A. Smith': '斯蒂芬·A·史密斯',
  'John Fetterman': '约翰·费特曼',
  'Andy Beshear': '安迪·贝希尔',
  'Josh Hawley': '乔希·霍利',
  'Rand Paul': '兰德·保罗',
  'Jon Stewart': '乔恩·斯图尔特',
  'Steve Bannon': '史蒂夫·班农',
  'Matt Gaetz': '马特·盖茨',
  'Eastern Conference Finals': '东部决赛',
  'Western Conference Finals': '西部决赛',
  'Eastern Conference': '东部决赛',
  'Western Conference': '西部决赛',
  'Conference Finals': '分区决赛',
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
  'vote': '投票',
  'Vote': '投票',
  'court': '法院',
  'Court': '法院',
  'supreme': '最高',
  'Supreme': '最高',
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
 * 如果翻译结果包含敏感词，则返回原始英文以避免触发检测
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
    // 使用正则表达式
    // 对于以空格结尾的关键词（如 'the '），不使用 \b 边界
    // 对于其他关键词，使用 \b 边界匹配完整单词（不区分大小写）
    const regex = eng.endsWith(' ')
      ? new RegExp(eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')  // 转义特殊字符，不加边界
      : new RegExp(`\\b${eng}\\b`, 'gi')
    translated = translated.replace(regex, chn)
  }

  // 如果翻译结果包含敏感词，返回原始英文
  if (containsSensitiveWords(translated)) {
    return text
  }

  return translated
}

/**
 * 检测文本是否包含敏感词
 */
function containsSensitiveWords(text: string): boolean {
  const lowerText = text.toLowerCase()
  const sensitivePatterns = [
    'taiwan',
    'china',      // 中国国家名
    'tibet',
    'xinjiang',
    'hong kong',
    'hk',
    'invade',
    'invasion',
    'annex',
    'ccc',
    'falun',
    'tiananmen',
  ]
  return sensitivePatterns.some(pattern => lowerText.includes(pattern))
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

/**
 * 白名单：允许处理的类别
 * 只处理体育、科技、娱乐、国际市场（非政治）内容
 */
const ALLOWED_CATEGORIES = [
  'sports',
  'sport',
  'nba',
  'nfl',
  'mlb',
  'nhl',
  'soccer',
  'football',
  'basketball',
  'baseball',
  'hockey',
  'tennis',
  'golf',
  'mma',
  'ufc',
  'boxing',
  'olympics',
  'world cup',
  'premier league',
  'champions league',
  'la liga',
  'serie a',
  'bundesliga',
  'technology',
  'tech',
  'ai',
  'crypto',
  'bitcoin',
  'ethereum',
  'blockchain',
  'software',
  'hardware',
  'semiconductor',
  'entertainment',
  'music',
  'movie',
  'film',
  'tv',
  'television',
  'celebrity',
  'finance',
  'financial',
  'stock',
  'market',
  'economics',
  'business',
  'crypto',
  'weather',
  'climate',
  'science',
  'space',
]

/**
 * 黑名单：敏感政治话题关键词
 */
const SENSITIVE_KEYWORDS: string[] = [
  // 政治人物 - 跳过政治敏感内容
]

/**
 * 检查内容是否应该被处理
 * 基于白名单机制：只处理体育、科技、娱乐、金融等非政治内容
 * @param text 市场问题文本
 * @param tags 标签数组
 * @returns { shouldProcess: boolean, reason?: string }
 */
export function shouldProcessContent(text: string, tags: string[] = []): { shouldProcess: boolean; reason?: string } {
  const lowerText = (text || '').toLowerCase()
  const tagString = tags.map(t => typeof t === 'string' ? t.toLowerCase() : '').join(' ')

  // 1. 检查是否在白名单中
  const isAllowedCategory = ALLOWED_CATEGORIES.some(cat => 
    lowerText.includes(cat) || tagString.includes(cat)
  )

  if (!isAllowedCategory) {
    return { shouldProcess: false, reason: 'NOT_IN_WHITELIST' }
  }

  // 2. 检查敏感关键词
  const hasSensitiveKeyword = SENSITIVE_KEYWORDS.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  )

  if (hasSensitiveKeyword) {
    return { shouldProcess: false, reason: 'SENSITIVE_KEYWORD' }
  }

  return { shouldProcess: true }
}
