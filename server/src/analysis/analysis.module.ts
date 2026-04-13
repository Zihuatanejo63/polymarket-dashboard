import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { AnalysisService } from './analysis.service'
import { AnalysisController } from './analysis.controller'
import { MarketModule } from '../market/market.module'

@Module({
  imports: [HttpModule, ConfigModule, MarketModule],
  controllers: [AnalysisController],
  providers: [AnalysisService],
  exports: [AnalysisService],
})
export class AnalysisModule {}
