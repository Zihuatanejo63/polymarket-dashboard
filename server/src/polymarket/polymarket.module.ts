import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { PolymarketService } from './polymarket.service'
import { PolymarketController } from './polymarket.controller'

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [PolymarketController],
  providers: [PolymarketService],
  exports: [PolymarketService],
})
export class PolymarketModule {}
