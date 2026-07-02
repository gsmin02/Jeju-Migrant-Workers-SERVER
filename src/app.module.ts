import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplaintModule } from './complaint/complaint.module';
import { TranslateModule } from './translate/translate.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env 로드
    ComplaintModule,
    TranslateModule,
  ],
})
export class AppModule {}
