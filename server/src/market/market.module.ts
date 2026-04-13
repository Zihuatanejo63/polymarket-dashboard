import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { MarketService } from './market.service'
import { MarketController } from './market.controller'
import { PolymarketModule } from '../polymarket/polymarket.module'

@Module({
  imports: [HttpModule, ConfigModule, PolymarketModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}
