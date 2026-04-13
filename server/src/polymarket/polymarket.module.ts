import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { PolymarketService } from './polymarket.service'
import { PolymarketController } from './polymarket.controller'
import { MarketModule } from '../market/market.module'

@Module({
  imports: [HttpModule, ConfigModule, MarketModule],
  controllers: [PolymarketController],
  providers: [PolymarketService],
  exports: [PolymarketService],
})
export class PolymarketModule {}
