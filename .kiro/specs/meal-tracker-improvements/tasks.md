# Implementation Plan: Meal Tracker Improvements

## Overview

이 구현 계획은 식단 관리 앱의 4가지 주요 개선 사항을 단계별로 구현하는 방법을 제공합니다. 각 단계는 독립적으로 테스트 가능하며, 점진적으로 기능을 추가합니다.

## Tasks

### Phase 1: 데이터 모델 및 타입 업데이트

- [x] 1. 타입 정의 업데이트
  - `types.ts`에 `calories` 필드를 `FoodItem` 인터페이스에 추가
  - `DateKey` 인터페이스 추가
  - `DailyMealData` 인터페이스 추가
  - 날짜 변환 유틸리티 함수 추가 (`dateToKey`, `keyToDate`)
  - _Requirements: 2.1, 4.2_

- [x] 1.1 타입 정의 단위 테스트 작성
  - 날짜 변환 함수 테스트 (dateToKey, keyToDate)
  - DateKey 유일성 테스트
  - _Requirements: 4.2_

### Phase 2: IndexedDB Storage Service 구현

- [x] 2. Storage Service 기본 구조 생성
  - `services/storageService.ts` 파일 생성
  - `StorageService` 클래스 정의
  - 데이터베이스 초기화 메서드 구현 (`init`)
  - _Requirements: 4.1, 4.2_

- [x] 2.1 데이터 저장 기능 구현
  - `saveMealRecords` 메서드 구현
  - 날짜를 키로 사용하여 IndexedDB에 저장
  - 이미지 데이터 포함 저장 지원
  - _Requirements: 4.3, 4.9_

- [x] 2.2 데이터 로드 기능 구현
  - `loadMealRecords` 메서드 구현
  - 날짜별 데이터 조회
  - 데이터가 없을 경우 빈 MealRecord 객체 반환
  - _Requirements: 4.4, 4.8_

- [x] 2.3 데이터 삭제 및 조회 기능 구현
  - `deleteMealRecords` 메서드 구현
  - `getAllDatesWithData` 메서드 구현
  - 에러 핸들링 추가
  - _Requirements: 4.6, 4.7_

- [x] 2.4 Storage Service 속성 테스트 작성
  - **Property 9: Storage Round-Trip Consistency**
  - **Validates: Requirements 4.3, 4.4**

- [x] 2.5 Storage Service 단위 테스트 작성
  - 빈 상태 초기화 테스트
  - 에러 핸들링 테스트
  - 이미지 데이터 저장/로드 테스트
  - _Requirements: 4.7, 4.8, 4.9_

### Phase 3: Calendar Component 구현

- [x] 3. Calendar 컴포넌트 생성
  - `components/Calendar.tsx` 파일 생성
  - 기본 컴포넌트 구조 및 props 정의
  - 월별 날짜 그리드 렌더링
  - _Requirements: 1.2, 1.3_

- [x] 3.1 Calendar 네비게이션 구현
  - 이전 달/다음 달 이동 버튼 구현
  - 월 경계 처리
  - 현재 월 표시
  - _Requirements: 1.4, 1.5_

- [x] 3.2 Calendar 날짜 선택 기능 구현
  - 날짜 클릭 이벤트 핸들러
  - 선택된 날짜 하이라이트
  - 데이터가 있는 날짜 표시 (점 또는 색상)
  - _Requirements: 1.6_

- [x] 3.3 Calendar 속성 테스트 작성
  - **Property 2: Calendar Navigation Preserves Month Boundaries**
  - **Validates: Requirements 1.4, 1.5**

- [x] 3.4 Calendar 단위 테스트 작성
  - 날짜 선택 테스트
  - 월 네비게이션 테스트
  - 유효하지 않은 날짜 처리 테스트
  - _Requirements: 1.4, 1.5, 1.6_

### Phase 4: App 컴포넌트 날짜 관리 통합

- [x] 4. App 상태에 날짜 관리 추가
  - `selectedDate` state 추가
  - `showCalendar` state 추가
  - `datesWithData` state 추가
  - Storage Service 초기화
  - _Requirements: 1.1, 1.6_

- [x] 4.1 날짜별 데이터 로드/저장 구현
  - `useEffect`로 날짜 변경 시 데이터 로드
  - `useEffect`로 mealRecords 변경 시 데이터 저장
  - `loadMealRecordsForDate` 함수 구현
  - `saveMealRecordsForDate` 함수 구현
  - _Requirements: 4.4, 4.3_

- [x] 4.2 Calendar 통합 및 UI 업데이트
  - Dashboard에 달력 아이콘 버튼 추가 (우측 상단)
  - "오늘보기" 버튼 추가 (달력 아이콘 우측)
  - Calendar 모달 표시/숨김 처리
  - 날짜 선택 시 데이터 로드
  - _Requirements: 1.1, 1.7, 1.8_

- [x] 4.3 Dashboard 헤더에 선택된 날짜 표시
  - 현재 날짜가 아닐 경우 날짜 표시
  - 오늘 날짜일 경우 "오늘" 표시
  - _Requirements: 1.9_

- [x] 4.4 날짜 관리 속성 테스트 작성
  - **Property 1: Date Selection Updates Display**
  - **Property 3: Today Button Returns to Current Date**
  - **Validates: Requirements 1.6, 1.8**

### Phase 5: 칼로리 필드 추가

- [x] 5. MealInput 테이블에 칼로리 열 추가
  - 테이블 헤더에 "칼(kcal)" 열 추가 (음식명과 탄수화물 사이)
  - 칼로리 입력 필드 추가
  - 칼로리 총계 계산 및 표시
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5.1 Dashboard 칼로리 계산 업데이트
  - `dailySummary` 계산 시 FoodItem의 calories 필드 사용
  - 기존 계산식 제거 (carbs*4 + protein*4 + fat*9)
  - _Requirements: 2.4_

- [x] 5.2 AI 분석 결과에 칼로리 추가
  - `geminiService.ts`의 responseSchema에 calories 필드 추가
  - AI 분석 모달에 칼로리 정보 표시
  - _Requirements: 2.5, 2.6_

- [x] 5.3 칼로리 속성 테스트 작성
  - **Property 4: Calorie Column Presence**
  - **Property 5: Calorie Total Calculation**
  - **Property 6: AI Analysis Includes Calories**
  - **Validates: Requirements 2.1, 2.4, 2.5**

### Phase 6: PWA 설정

- [ ] 6. PWA Manifest 파일 생성
  - `public/manifest.json` 파일 생성
  - 앱 이름, 아이콘, 테마 색상 설정
  - start_url, display 모드 설정
  - _Requirements: 3.1, 3.2_

- [ ] 6.1 앱 아이콘 생성
  - 192x192 아이콘 생성 (`public/icon-192.png`)
  - 512x512 아이콘 생성 (`public/icon-512.png`)
  - _Requirements: 3.2, 3.6_

- [ ] 6.2 Service Worker 구현
  - `public/service-worker.js` 파일 생성
  - 캐시 전략 구현 (install, fetch 이벤트)
  - 정적 자산 캐싱
  - _Requirements: 3.3, 3.4_

- [ ] 6.3 Service Worker 등록
  - `index.html`에 manifest 링크 추가
  - `index.tsx`에 service worker 등록 코드 추가
  - 브라우저 지원 확인
  - _Requirements: 3.3, 3.7_

- [ ] 6.4 PWA 속성 테스트 작성
  - **Property 7: Manifest File Availability**
  - **Property 8: Service Worker Registration**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 6.5 PWA 통합 테스트
  - 오프라인 기능 테스트
  - 홈 화면 추가 테스트
  - Standalone 모드 테스트
  - _Requirements: 3.5, 3.6, 3.7_

### Phase 7: 최종 통합 및 테스트

- [ ] 7. 전체 기능 통합 테스트
  - 날짜 변경 후 데이터 저장/로드 확인
  - 칼로리 계산 정확성 확인
  - PWA 설치 및 오프라인 동작 확인
  - _Requirements: 1.6, 2.4, 3.5, 4.3, 4.4_

- [ ] 7.1 에러 핸들링 개선
  - IndexedDB 에러 처리 강화
  - 사용자 친화적 에러 메시지 추가
  - 폴백 메커니즘 구현
  - _Requirements: 4.7_

- [ ] 7.2 성능 최적화
  - 불필요한 리렌더링 방지
  - IndexedDB 트랜잭션 최적화
  - 이미지 압축 고려
  - _Requirements: 4.9_

- [ ] 7.3 속성 기반 통합 테스트
  - **Property 10: Date Key Uniqueness**
  - **Property 11: Empty State Initialization**
  - **Property 12: Image Data Persistence**
  - **Validates: Requirements 4.2, 4.8, 4.9**

- [ ] 8. Checkpoint - 최종 검토
  - 모든 테스트 통과 확인
  - 브라우저 호환성 확인 (Chrome, Safari, Firefox)
  - 모바일 반응형 확인
  - 사용자에게 질문이 있으면 확인

## Notes

- Each task references specific requirements for traceability
- Phases are designed to be implemented incrementally
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests ensure all components work together correctly
