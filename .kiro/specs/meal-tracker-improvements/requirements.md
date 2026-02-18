# Requirements Document

## Introduction

이 문서는 식단 관리 앱의 개선 사항에 대한 요구사항을 정의합니다. 주요 개선 사항은 날짜별 데이터 조회, 칼로리 표시 개선, PWA 지원, 그리고 로컬 데이터 영구 저장입니다.

## Glossary

- **Dashboard**: 일일 영양 섭취 요약과 식사 목록을 보여주는 메인 화면
- **MealRecord**: 특정 식사 타입(아침, 점심 등)에 대한 음식 항목들의 기록
- **FoodItem**: 개별 음식의 영양 정보 (이름, 탄수화물, 단백질, 지방, 당류, 나트륨, 콜레스테롤, 칼로리)
- **IndexedDB**: 브라우저에서 제공하는 클라이언트 측 구조화된 데이터 저장소
- **PWA**: Progressive Web App - 웹 기술로 만들어진 네이티브 앱처럼 동작하는 애플리케이션
- **Calendar_Picker**: 날짜를 선택할 수 있는 달력 UI 컴포넌트
- **Storage_Service**: IndexedDB를 사용하여 데이터를 저장하고 불러오는 서비스

## Requirements

### Requirement 1: 날짜별 식사 기록 조회

**User Story:** As a user, I want to view meal records from different dates, so that I can track my nutrition history over time.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE System SHALL display a calendar icon in the top-right corner of the screen
2. WHEN a user clicks the calendar icon, THE System SHALL display a calendar picker modal
3. WHEN the calendar picker is displayed, THE System SHALL show the current month with navigation arrows
4. WHEN a user clicks the left arrow, THE System SHALL navigate to the previous month
5. WHEN a user clicks the right arrow, THE System SHALL navigate to the next month
6. WHEN a user selects a date from the calendar, THE System SHALL load and display meal records for that selected date
7. WHEN the Dashboard displays data for a non-current date, THE System SHALL show a "오늘보기" button next to the calendar icon
8. WHEN a user clicks the "오늘보기" button, THE System SHALL return to displaying today's meal records
9. WHEN displaying meal records for any date, THE System SHALL show the selected date in the header

### Requirement 2: 칼로리 열 추가

**User Story:** As a user, I want to see calorie information for each food item, so that I can better understand the energy content of my meals.

#### Acceptance Criteria

1. WHEN the meal input table is displayed, THE System SHALL include a calorie column between the food name column and the carbohydrate column
2. WHEN a user adds or edits a food item, THE System SHALL provide an input field for calorie value in the calorie column
3. WHEN displaying food items in the table, THE System SHALL show calorie values with the unit "kcal"
4. WHEN calculating totals, THE System SHALL sum all calorie values and display the total in the totals row
5. WHEN the AI analyzes a food image, THE System SHALL include calorie estimates in the returned food items
6. WHEN displaying AI analysis results in the modal, THE System SHALL show calorie information for each detected food item

### Requirement 3: PWA 지원

**User Story:** As a user, I want to install the app on my device and use it offline, so that I can access my meal tracking functionality anytime.

#### Acceptance Criteria

1. WHEN a user visits the app in a supported browser, THE System SHALL provide a web app manifest file
2. WHEN the manifest is loaded, THE System SHALL declare the app name, icons, theme colors, and display mode
3. WHEN a user visits the app, THE System SHALL register a service worker for offline functionality
4. WHEN the service worker is active, THE System SHALL cache essential app resources for offline access
5. WHEN a user is offline, THE System SHALL serve cached resources to enable basic app functionality
6. WHEN a user adds the app to their home screen, THE System SHALL display the app icon and name as defined in the manifest
7. WHEN the app is launched from the home screen, THE System SHALL open in standalone mode without browser UI

### Requirement 4: IndexedDB 기반 영구 저장

**User Story:** As a user, I want my meal records to persist across browser sessions, so that I don't lose my data when I close the browser.

#### Acceptance Criteria

1. WHEN the app initializes, THE Storage_Service SHALL create or open an IndexedDB database named "MealTrackerDB"
2. WHEN the database is created, THE Storage_Service SHALL define an object store for meal records with date as the key
3. WHEN a user saves a meal record, THE Storage_Service SHALL store the record in IndexedDB with the current date as the key
4. WHEN the app loads, THE Storage_Service SHALL retrieve meal records for the selected date from IndexedDB
5. WHEN a user updates a meal record, THE Storage_Service SHALL update the corresponding record in IndexedDB
6. WHEN a user deletes a meal record, THE Storage_Service SHALL remove the corresponding record from IndexedDB
7. WHEN IndexedDB operations fail, THE Storage_Service SHALL handle errors gracefully and notify the user
8. WHEN the app loads for the first time, THE Storage_Service SHALL initialize with empty meal records if no data exists
9. WHEN storing meal records with images, THE Storage_Service SHALL store base64 image data in IndexedDB
10. WHEN retrieving meal records, THE Storage_Service SHALL return data in the MealRecord format expected by the app
