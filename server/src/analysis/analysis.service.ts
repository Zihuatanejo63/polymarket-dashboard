import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { OssSyncService } from '../oss-sync/oss-sync.service'
import { LLMClient, Config } from 'coze-coding-dev-sdk'

@Injectable()
export class AnalysisService {
  private llmClient: LLMClient
  private analysisResults: Map<string, any> = new Map()

  constructor(
    private httpService: HttpService,
    private ossSyncService: OssSyncService,
    private configService: ConfigService,
  ) {
    // 初始化 LLM 客户端
    const config = new Config()
    this.llmClient = new LLMClient(config)
  }

  /**
   * 分析事件的概率意义
   */
  async analyzeEvent(eventId: string): Promise<{
    summary: string
    implications: string[]
    riskFactors: string[]
    confidence: '高' | '中' | '低'
    realityConnection: string
    impactScenarios: string[]
  }> {
    try {
      console.log(`[AI分析] 开始分析事件: ${eventId}`)

      // 从OSS获取事件详情
      const events = this.ossSyncService.getMarkets()
      const eventDetail = events.find((e: any) => e.id === eventId)

      if (!eventDetail) {
        throw new Error(`事件 ${eventId} 不存在`)
      }

      console.log(`[AI分析] 事件详情:`, {
        question: eventDetail.question,
        probability: eventDetail.probability,
        category: eventDetail.tags?.[0] || '其他'
      })

      // 获取标签
      const tag = eventDetail.tags?.[0]
      const tagLabel = typeof tag === 'object' ? tag?.label : tag

      // 构建 AI 分析提示词（避免敏感词）
      const systemPrompt = `你是专业的预测市场数据分析师，专注金融、科技、体育等领域。
只进行市场数据分析，不涉及敏感话题。用中文回答，保持专业、客观、数据驱动。`

      const userPrompt = `分析以下预测市场数据：
问题：${eventDetail.questionZh || eventDetail.question}
概率：${eventDetail.probabilityRaw || eventDetail.probability}%
分类：${eventDetail.categoryZh || tagLabel || '其他'}
交易量：$${((eventDetail.volume || 0) / 1000000).toFixed(1)}M
流动性：$${((eventDetail.liquidity || 0) / 1000000).toFixed(1)}M

JSON格式返回：
{"summary":"市场总结","realityConnection":"市场影响分析","impactScenarios":["场景1","场景2"],"implications":["影响1","影响2"],"riskFactors":["风险1"],"confidence":"高/中/低"}`

      // 调用 LLM API
      console.log(`[AI分析] 开始调用LLM...`)
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const llmResponse = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7
      })

      console.log(`[AI分析] LLM响应:`, llmResponse.content)

      // 解析 JSON 响应
      const analysisResult = this.parseJSONResponse(llmResponse.content)
      console.log(`[AI分析] 解析结果:`, analysisResult)

      // 验证结果结构
      if (!analysisResult.summary || !analysisResult.realityConnection || !analysisResult.impactScenarios) {
        throw new Error('AI响应结构不完整')
      }

      // 保存分析结果
      this.analysisResults.set(eventId, analysisResult)

      console.log(`[AI分析] 分析成功完成: ${eventId}`)
      return analysisResult
    } catch (error) {
      console.error(`[AI分析] 分析失败: ${eventId}`, error)

      // 使用降级方案：生成模板化分析
      console.log(`[AI分析] 使用降级方案生成模板化分析`)
      return this.getFallbackAnalysis(eventId)
    }
  }

  /**
   * 批量分析事件
   */
  async batchAnalyzeEvents(eventIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {}

    for (const eventId of eventIds) {
      try {
        const result = await this.analyzeEvent(eventId)
        results[eventId] = result

        // 添加延迟，避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        results[eventId] = { error: '分析失败' }
      }
    }

    return results
  }

  /**
   * 获取所有分析结果
   */
  async getAllAnalysisResults(): Promise<Record<string, any>> {
    return Object.fromEntries(this.analysisResults)
  }

  /**
   * 解析 JSON 响应
   */
  private parseJSONResponse(content: string): any {
    try {
      // 尝试直接解析
      return JSON.parse(content)
    } catch (error) {
      // 如果失败，尝试提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('无法解析 AI 响应')
    }
  }

  /**
   * 降级方案：生成模板化分析
   * 当LLM调用失败时使用
   */
  private async getFallbackAnalysis(eventId: string): Promise<{
    summary: string
    implications: string[]
    riskFactors: string[]
    confidence: '高' | '中' | '低'
    realityConnection: string
    impactScenarios: string[]
  }> {
    try {
      // 从OSS获取事件详情
      const markets = this.ossSyncService.getMarkets()
      const eventDetail = markets.find((e: any) => e.id === eventId)

      if (!eventDetail) {
        throw new Error(`事件 ${eventId} 不存在`)
      }

      // 根据概率和分类生成模板化分析
      const probability = eventDetail.probabilityRaw || eventDetail.probability || 50
      const category = eventDetail.categoryZh || '其他'
      const question = eventDetail.question

      // 判断概率区间
      let probabilityLevel = '中等概率'
      if (probability >= 70) probabilityLevel = '高概率'
      else if (probability < 30) probabilityLevel = '低概率'

      // 生成分类相关的市场影响
      const categoryImpacts: Record<string, { connection: string, scenarios: string[], implications: string[] }> = {
        '金融': {
          connection: `该事件对${question.includes('美元') || question.includes('汇率') ? '国际货币体系' : question.includes('股票') || question.includes('股指') ? '资本市场' : question.includes('黄金') || question.includes('石油') ? '大宗商品市场' : '金融市场'}有显著影响。当前概率为${probability}%，${probabilityLevel}表明市场预期较为${probability >= 50 ? '乐观' : '谨慎'}。`,
          scenarios: [
            `如果该事件发生，可能引发${probability >= 50 ? '市场波动和资金流向变化' : '市场情绪提振和短期反弹'}，影响投资者决策`,
            `相关板块可能出现${probability >= 50 ? '结构性调整' : '短期交易机会'}，需要关注风险敞口`,
            `该事件可能影响相关行业的投资方向和资金配置`
          ],
          implications: [
            `影响${category}相关资产价格波动`,
            `可能导致市场预期重新定价`,
            `对相关企业和行业产生连锁反应`
          ]
        },
        '体育': {
          connection: `该体育事件不仅影响比赛结果，还会对体育产业、赞助商和球迷情绪产生深远影响。当前${probability}%的概率表明市场${probability >= 50 ? '较为看好该结果' : '认为该结果可能性较小'}。`,
          scenarios: [
            `如果该结果发生，将带动相关品牌曝光度和商业价值提升`,
            `可能影响后续赛事的参赛阵容和战术安排`,
            `对体育博彩市场和粉丝社区产生情绪影响`
          ],
          implications: [
            `提升相关运动员或球队的商业价值`,
            `影响赛事转播权和广告收入`,
            `可能引发体育用品和周边消费热潮`
          ]
        },
        '科技': {
          connection: `该科技事件代表了技术发展的重要里程碑，对${question.includes('AI') || question.includes('GPT') ? '人工智能领域' : question.includes('自动驾驶') || question.includes('FSD') ? '智能交通' : question.includes('量子') ? '量子计算' : '科技创新'}有深远意义。${probability}%的概率表明技术突破的${probability >= 50 ? '可行性较高' : '挑战较大'}。`,
          scenarios: [
            `如果实现成功，可能引发${category}相关领域的竞争格局变化`,
            `推动产业链上下游的技术升级和投资增加`,
            `可能催生新的商业模式和应用场景`
          ],
          implications: [
            `加速相关技术在产业中的落地应用`,
            `可能重塑行业竞争格局`,
            `影响市场对相关技术的投资预期`
          ]
        },
        '其他': {
          connection: `该事件反映了市场关注的热点，具有广泛的现实意义。${probability}%的市场概率显示了市场${probability >= 50 ? '对结果持相对乐观态度' : '对结果存在较大不确定性'}。`,
          scenarios: [
            `该结果可能影响相关市场的投资情绪和资金流向`,
            `可能引发市场对相关议题的讨论和关注`,
            `对相关行业和企业产生长期影响`
          ],
          implications: [
            `影响市场资源配置和投资方向`,
            `可能改变市场对相关议题的预期`,
            `对相关产业的长期发展产生影响`
          ]
        }
      }

      // 获取分类对应的模板
      const categoryTemplate = categoryImpacts[category] || categoryImpacts['其他']

      // 生成风险因素
      const riskFactors = [
        `市场数据可能受到情绪因素影响，存在过度反应的风险`,
        `外部环境变化可能导致事件结果发生意外转折`,
        `当前波动率为${eventDetail.change24h}%，短期不确定性较高`
      ]

      // 根据流动性和交易量评估置信度
      const confidence: '高' | '中' | '低' =
        eventDetail.liquidity > 10000000 ? '高' :
        eventDetail.liquidity > 1000000 ? '中' : '低'

      const analysisResult = {
        summary: `当前市场概率为${probability}%（${probabilityLevel}），24小时波动${eventDetail.change24h}%，显示市场${eventDetail.change24h > 0 ? '信心增强' : '信心减弱'}。该事件具有较大的现实影响力，值得关注。`,
        realityConnection: categoryTemplate.connection,
        impactScenarios: categoryTemplate.scenarios,
        implications: categoryTemplate.implications,
        riskFactors,
        confidence
      }

      // 保存分析结果
      this.analysisResults.set(eventId, analysisResult)

      return analysisResult
    } catch (error) {
      console.error('[AI分析] 降级方案也失败了:', error)

      // 最终兜底：返回最基本的分析
      return {
        summary: '该事件具有重要的现实意义，当前市场预期反映了公众对其可能性的判断。',
        realityConnection: '该事件对相关领域有显著影响，需要持续关注市场动态和外部环境变化。',
        impactScenarios: [
          '该结果可能影响相关行业和市场的运行',
          '可能引发政策制定者的关注和应对',
          '对公众认知和预期产生持续影响'
        ],
        implications: ['影响相关资产价格', '改变市场预期', '产生连锁反应'],
        riskFactors: ['外部环境变化', '市场情绪波动', '政策调整风险'],
        confidence: '中'
      }
    }
  }
}
