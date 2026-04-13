import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { MarketService } from '../market/market.service'
import { LLMClient, Config } from 'coze-coding-dev-sdk'

@Injectable()
export class AnalysisService {
  private llmClient: LLMClient

  constructor(
    private httpService: HttpService,
    private marketService: MarketService,
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
      // 获取事件详情
      const eventDetail = await this.marketService.getEventDetail(eventId)

      // 构建 AI 分析提示词
      const systemPrompt = `你是一位专业的预测市场分析师，擅长分析预测事件与现实世界的联系。
你的任务是深入分析预测市场事件的概率、波动和背景，挖掘其对现实世界的影响和意义。
请用中文回答，保持专业、客观、有洞察力。`

      const userPrompt = `
请分析以下预测市场事件：

事件问题：${eventDetail.question}
当前概率：${eventDetail.probability}%
24h 波动：${eventDetail.change24h}%
分类：${eventDetail.category}
当前价格：$${eventDetail.price}
24小时交易量：$${(eventDetail.volume24h / 1000000).toFixed(1)}M

请从以下角度进行深度分析：

1. 现实意义（realityConnection）：深入分析这个事件对现实世界的影响，包括对经济、社会、政治或特定行业的影响
2. 影响场景（impactScenarios）：列举 2-3 个具体的现实场景，描述如果该事件发生或不发生，会对现实世界产生什么具体影响
3. 潜在影响（implications）：分析该事件对相关行业、市场、政策等方面的影响
4. 风险因素（riskFactors）：分析可能导致概率发生重大变化的风险因素
5. 置信度（confidence）：基于当前市场数据、波动性和流动性，评估你的分析置信度

请以 JSON 格式返回，格式如下：
{
  "summary": "简洁的分析总结（1-2句话，概括核心观点）",
  "realityConnection": "详细分析该事件对现实世界的深层影响（100-150字）",
  "impactScenarios": ["场景1：具体描述现实影响1", "场景2：具体描述现实影响2", "场景3：具体描述现实影响3"],
  "implications": ["影响1", "影响2", "影响3"],
  "riskFactors": ["风险1", "风险2"],
  "confidence": "高/中/低"
}

注意：
- realityConnection 要深入分析，不能泛泛而谈
- impactScenarios 要具体、可感知
- confidence 要基于市场数据的可靠性（流动性、交易量、波动性等）来评估
`

      // 调用 LLM API
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]

      const llmResponse = await this.llmClient.invoke(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7
      })

      // 解析 JSON 响应
      const analysisResult = this.parseJSONResponse(llmResponse.content)

      return analysisResult
    } catch (error) {
      console.error('分析失败:', error)
      throw new Error('分析失败，请稍后重试')
    }
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
}
