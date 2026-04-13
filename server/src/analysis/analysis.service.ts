import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { lastValueFrom } from 'rxjs'
import { MarketService } from '../market/market.service'

@Injectable()
export class AnalysisService {
  constructor(
    private httpService: HttpService,
    private marketService: MarketService,
    private configService: ConfigService,
  ) {}

  /**
   * 分析事件的概率意义
   */
  async analyzeEvent(eventId: string): Promise<{
    summary: string
    implications: string[]
    riskFactors: string[]
    confidence: '高' | '中' | '低'
  }> {
    try {
      // 获取事件详情
      const eventDetail = await this.marketService.getEventDetail(eventId)

      // 构建 AI 分析提示词
      const prompt = `
请分析以下预测市场事件的概率意义：

事件问题：${eventDetail.question}
当前概率：${eventDetail.probability}%
24h 波动：${eventDetail.change24h}%
分类：${eventDetail.category}

请从以下角度进行分析：
1. 这个概率对现实世界的意义
2. 潜在的市场影响
3. 相关的风险因素
4. 你的分析置信度（基于当前数据）

请以 JSON 格式返回，格式如下：
{
  "summary": "简洁的分析总结（1-2句话）",
  "implications": ["影响1", "影响2", "影响3"],
  "riskFactors": ["风险1", "风险2"],
  "confidence": "高/中/低"
}
`

      // 调用 LLM API（这里使用模拟返回，实际应该调用真实的 LLM API）
      const analysisResult = await this.callLLM(prompt)

      return analysisResult
    } catch (error) {
      console.error('分析失败:', error)
      throw new Error('分析失败，请稍后重试')
    }
  }

  /**
   * 调用 LLM API（模拟）
   * TODO: 实际项目中应该调用真实的 LLM API
   */
  private async callLLM(prompt: string): Promise<{
    summary: string
    implications: string[]
    riskFactors: string[]
    confidence: '高' | '中' | '低'
  }> {
    // 模拟 AI 分析结果
    // 实际项目中，这里应该调用 LLM API，如 OpenAI、Claude 等
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          summary: '基于当前市场数据，该事件的概率反映了市场的整体预期和参与者情绪。',
          implications: [
            '该概率表明市场对该事件的发生持谨慎乐观态度',
            '较高的流动性表明市场参与者对该事件的关注度较高',
            '24h 波动反映了市场情绪的短期变化'
          ],
          riskFactors: [
            '市场情绪可能受突发事件影响而快速变化',
            '外部经济环境变化可能影响概率走向'
          ],
          confidence: '中'
        })
      }, 1500)
    })
  }

  /**
   * 批量分析收藏事件
   */
  async analyzeFavorites(eventIds: string[]): Promise<Record<string, any>> {
    const results: Record<string, any> = {}

    for (const eventId of eventIds) {
      try {
        results[eventId] = await this.analyzeEvent(eventId)
      } catch (error) {
        results[eventId] = { error: '分析失败' }
      }
    }

    return results
  }
}
