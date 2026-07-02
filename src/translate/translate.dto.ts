/** 번역 요청: 여러 문자열을 한 번에 대상 언어로 번역 */
export class TranslateDto {
  /** 번역할 문자열 배열 (예: [제목, 본문, AI답변]) */
  texts!: string[];
  /** 대상 언어 코드 (ko/en/vi/id/ne) */
  target!: string;
  /** 원문 언어 코드 (선택, 미지정 시 자동 감지) */
  source?: string;
}

/** 번역 응답: 입력과 같은 순서·길이의 번역 배열 */
export interface TranslateResponse {
  translations: string[];
  /** LLM 키 없음/실패로 원문을 그대로 돌려준 경우 true */
  fallback: boolean;
}
