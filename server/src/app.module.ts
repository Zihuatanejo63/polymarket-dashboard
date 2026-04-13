import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { MarketModule } from './market/market.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [MarketModule, FavoritesModule, NotificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
