import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Flutter 앱(모바일)에서 호출하므로 CORS 허용
  app.enableCors();
  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`제이(제주 이주민) 서버 실행 중: http://localhost:${port}`);
}
bootstrap();
