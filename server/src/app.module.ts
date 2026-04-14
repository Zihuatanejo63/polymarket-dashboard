import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { MarketModule } from './market/market.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationModule } from './notification/notification.module';
import { AnalysisModule } from './analysis/analysis.module';
import { PolymarketModule } from './polymarket/polymarket.module';
import { AuthModule } from './auth/auth.module';
import { ScheduleModule } from './schedule/schedule.module';
import { PolymarketGoldskyModule } from './polymarket-goldsky/polymarket-goldsky.module';
import { PolymarketDuneModule } from './polymarket-dune/polymarket-dune.module';
import { PolymarketProxyModule } from './polymarket-proxy/polymarket-proxy.module';
import { PolymarketRealtimeModule } from './polymarket-realtime/polymarket-realtime.module';
import { OssSyncModule } from './oss-sync/oss-sync.module';

@Module({
  imports: [MarketModule, FavoritesModule, NotificationModule, AnalysisModule, PolymarketModule, AuthModule, ScheduleModule, PolymarketGoldskyModule, PolymarketDuneModule, PolymarketProxyModule, PolymarketRealtimeModule, OssSyncModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
