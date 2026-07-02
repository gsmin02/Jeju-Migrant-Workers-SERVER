/** 진정서 생성 요청 바디 */
export interface WorkLogDto {
  date?: string;
  in?: string;
  out?: string;
  workplace?: string;
  src?: string;
}

export interface WorkplaceDto {
  name?: string;
  type?: string;
  region?: string;
}

export class GenerateComplaintDto {
  name?: string;
  nationality?: string;
  lang?: string; // ko/en/vi/id/ne
  workplace?: WorkplaceDto;
  promisedWage?: string;
  unpaidPeriod?: string;
  logs?: WorkLogDto[];
}

/** 진정서 생성 응답 */
export interface ComplaintResponse {
  complaint_ko: string;
  summary_native: string;
  fallback: boolean;
}
