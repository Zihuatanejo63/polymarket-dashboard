/**
 * 翻译工具模块
 * 提供简单的中英文翻译功能
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

// 常见问题关键词翻译
const keywordTranslations: Record<string, string> = {
  'bitcoin': '比特币',
  'btc': '比特币',
  'ethereum': '以太坊',
  'eth': '以太坊',
  'trump': '特朗普',
  'biden': '拜登',
  'fed': '美联储',
  'rate': '利率',
  'price': '价格',
  'will': '会',
  'by': '到',
  'before': '之前',
  'after': '之后',
  'higher': '更高',
  'lower': '更低',
  'above': '超过',
  'below': '低于',
  'target': '目标',
  'million': '百万',
  'billion': '十亿',
  'percent': '百分之',
  'day': '天',
  'week': '周',
  'month': '月',
  'year': '年',
  'election': '选举',
  'president': '总统',
  'court': '法院',
  'supreme': '最高',
  'republican': '共和党',
  'democrat': '民主党',
  'congress': '国会',
  'senate': '参议院',
  'house': '众议院',
  'nba': 'NBA',
  'football': '橄榄球',
  'soccer': '足球',
  'baseball': '棒球',
  'trade war': '贸易战',
  'inflation': '通胀',
  'recession': '衰退',
  'gdp': 'GDP',
  'unemployment': '失业',
  'stock': '股票',
  'market': '市场',
  'tesla': '特斯拉',
  'apple': '苹果',
  'amazon': '亚马逊',
  'google': '谷歌',
  'microsoft': '微软',
  'meta': 'Meta',
  'facebook': 'Facebook',
  'openai': 'OpenAI',
  'ai': 'AI',
  'china': '中国',
  'russia': '俄罗斯',
  'ukraine': '乌克兰',
  'israel': '以色列',
  'iran': '伊朗',
  'north korea': '朝鲜',
  'taiwan': '台湾',
  'sanctions': '制裁',
  'war': '战争',
  'peace': '和平',
  'deal': '协议',
  'agreement': '协议',
  'summit': '峰会',
  'meeting': '会议',
  'announcement': '公告',
  'report': '报告',
  'earnings': '财报',
  'revenue': '营收',
  'profit': '利润',
  'launch': '发布',
  'launched': '已发布',
  'approve': '批准',
  'approved': '已批准',
  'reject': '拒绝',
  'rejected': '已拒绝',
  'ban': '禁令',
  'banned': '已禁止',
  'legal': '合法',
  'illegal': '非法',
  'governor': '州长',
  'mayor': '市长',
  'senator': '参议员',
  'representative': '众议员',
  'judge': '法官',
  'ceo': 'CEO',
  'millionaire': '百万富翁',
  'billionaire': '亿万富翁',
  'celebrity': '名人',
  'movie': '电影',
  'oscar': '奥斯卡',
  'grammy': '格莱美',
  'award': '奖项',
  'series': '系列',
  'season': '赛季',
  'championship': '冠军',
  'finals': '决赛',
  'playoffs': '季后赛',
  'mvp': 'MVP',
  'gold': '金牌',
  'silver': '银牌',
  'bronze': '铜牌',
  'olympics': '奥运会',
  'world cup': '世界杯',
  'temperature': '温度',
  'hurricane': '飓风',
  'earthquake': '地震',
  'flood': '洪水',
  'fire': '火灾',
  'storm': '风暴',
}

/**
 * 翻译分类标签
 */
export function translateCategory(category: string): string {
  if (!category) return '其他'

  const normalized = category.trim()

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
  const lowerCategory = normalized.toLowerCase()
  for (const [key, value] of Object.entries(categoryTranslations)) {
    if (lowerCategory.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerCategory)) {
      return value
    }
  }

  return normalized
}

/**
 * 翻译问题文本（基础版，仅翻译关键词）
 */
export function translateQuestion(question: string): string {
  if (!question) return ''

  let translated = question

  // 替换常见关键词
  for (const [key, value] of Object.entries(keywordTranslations)) {
    const regex = new RegExp(`\\b${key}\\b`, 'gi')
    translated = translated.replace(regex, value)
  }

  return translated
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
