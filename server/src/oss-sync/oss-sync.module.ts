import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule } from '@nestjs/config'
import { OssSyncService } from './oss-sync.service'
import { OssSyncController } from './oss-sync.controller'

@Module({
  imports: [
    HttpModule,
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true
    })
  ],
  controllers: [OssSyncController],
  providers: [OssSyncService],
  exports: [OssSyncService]
})
export class OssSyncModule {}
