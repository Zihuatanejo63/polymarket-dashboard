import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PolymarketProxyService } from './polymarket-proxy.service'
import { PolymarketProxyController } from './polymarket-proxy.controller'
import { PolymarketModule } from '../polymarket/polymarket.module'

@Module({
  imports: [HttpModule, PolymarketModule],
  controllers: [PolymarketProxyController],
  providers: [PolymarketProxyService],
  exports: [PolymarketProxyService]
})
export class PolymarketProxyModule {}
