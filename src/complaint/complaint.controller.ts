import { Body, Controller, Get, Post } from '@nestjs/common';
import { ComplaintService } from './complaint.service';
import { ComplaintResponse, GenerateComplaintDto } from './complaint.dto';

@Controller('api')
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  /** 헬스체크 */
  @Get('health')
  health(): { ok: boolean } {
    return { ok: true };
  }

  /** 진정서 생성 — 쌓인 기록 + 약속 임금/기간 → 한국어 진정서 + 모국어 요약 */
  @Post('complaint')
  generate(@Body() body: GenerateComplaintDto): Promise<ComplaintResponse> {
    return this.complaintService.generate(body);
  }
}
