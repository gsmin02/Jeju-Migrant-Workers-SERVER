import { Body, Controller, Post } from '@nestjs/common';
import { TranslateService } from './translate.service';
import { TranslateDto, TranslateResponse } from './translate.dto';

@Controller('api')
export class TranslateController {
  constructor(private readonly translateService: TranslateService) {}

  /** 커뮤니티 글 번역 — 여러 문자열을 대상 언어로 한 번에 번역 */
  @Post('translate')
  translate(@Body() body: TranslateDto): Promise<TranslateResponse> {
    return this.translateService.translate(body);
  }
}
