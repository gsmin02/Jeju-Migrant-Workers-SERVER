import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ComplaintModule } from './complaint/complaint.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env 로드
    ComplaintModule,
  ],
})
export class AppModule {}
