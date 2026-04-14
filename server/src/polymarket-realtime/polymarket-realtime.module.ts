import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PolymarketRealtimeService } from './polymarket-realtime.service'
import { PolymarketRealtimeController } from './polymarket-realtime.controller'

@Module({
  imports: [HttpModule],
  controllers: [PolymarketRealtimeController],
  providers: [PolymarketRealtimeService],
  exports: [PolymarketRealtimeService]
})
export class PolymarketRealtimeModule {}
