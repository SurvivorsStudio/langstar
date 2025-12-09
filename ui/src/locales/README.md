# 다국어 (i18n) 시스템

LangStar의 다국어 지원 시스템입니다.

## 구조

```
locales/
├── index.ts          # 언어 설정 및 export
├── ko.json           # 한국어 번역
├── en.json           # 영어 번역
└── README.md         # 이 파일
```

## 사용법

### 1. 컴포넌트에서 번역 사용하기

```typescript
import { useTranslation } from '../hooks/useTranslation';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.save')}</h1>
      <p>{t('alert.workflowSaved')}</p>
    </div>
  );
};
```

### 2. 파라미터가 있는 번역

```typescript
// JSON: "workflowRenameFailed": "워크플로우 이름 변경에 실패했습니다: {error}"

const { t } = useTranslation();
alert(t('alert.workflowRenameFailed', { error: 'Network error' }));
// 결과: "워크플로우 이름 변경에 실패했습니다: Network error"
```

### 3. 현재 언어 확인

```typescript
const { t, language } = useTranslation();
console.log(language); // 'ko' 또는 'en'
```

### 4. 언어 변경

```typescript
import { useLanguageStore } from '../store/languageStore';

const { setLanguage } = useLanguageStore();
setLanguage('en'); // 영어로 변경
setLanguage('ko'); // 한국어로 변경
```

## 새로운 번역 추가하기

### 1. 번역 키 추가

`ko.json`과 `en.json` 파일에 동일한 키로 번역을 추가합니다.

**ko.json:**
```json
{
  "mySection": {
    "myKey": "내 번역"
  }
}
```

**en.json:**
```json
{
  "mySection": {
    "myKey": "My translation"
  }
}
```

### 2. 컴포넌트에서 사용

```typescript
const { t } = useTranslation();
const text = t('mySection.myKey');
```

## 새로운 언어 추가하기

### 1. 번역 파일 생성

`locales/ja.json` (일본어 예시):
```json
{
  "common": {
    "save": "保存",
    "cancel": "キャンセル"
  }
}
```

### 2. index.ts 업데이트

```typescript
import ja from './ja.json';

export type Language = 'ko' | 'en' | 'ja';

export const translations = {
  ko,
  en,
  ja
};

export const languages = [
  { code: 'ko' as Language, name: '한국어', flag: '🇰🇷' },
  { code: 'en' as Language, name: 'English', flag: '🇺🇸' },
  { code: 'ja' as Language, name: '日本語', flag: '🇯🇵' }
];
```

### 3. languageStore.ts 업데이트

```typescript
const getBrowserLanguage = (): Language => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('ja')) return 'ja';
  return 'en';
};
```

## 번역 키 네이밍 규칙

- **common**: 공통적으로 사용되는 텍스트 (저장, 취소, 삭제 등)
- **header**: 헤더 컴포넌트 관련
- **footer**: 푸터 컴포넌트 관련
- **sidebar**: 사이드바 관련
- **workspace**: 워크스페이스 페이지 관련
- **workflow**: 워크플로우 관련
- **deployment**: 배포 관련
- **node**: 노드 관련
- **alert**: 알림 메시지
- **aiConnection**: AI 연결 관련
- **schedule**: 스케줄 관련
- **importExport**: 가져오기/내보내기 관련

## 주의사항

1. **모든 언어 파일에 동일한 키 구조 유지**: 한 언어에만 키가 있으면 다른 언어에서 오류 발생
2. **파라미터 이름 일치**: `{error}`, `{name}` 등의 파라미터 이름은 모든 언어에서 동일해야 함
3. **특수문자 이스케이프**: JSON에서 따옴표나 백슬래시는 이스케이프 필요
4. **번역 누락 확인**: 콘솔에서 "Translation key not found" 경고 확인

## 언어 선택 UI

언어 선택은 Footer 컴포넌트에 구현되어 있습니다:
- 위치: 화면 하단 우측
- 드롭다운 메뉴로 언어 선택
- 선택한 언어는 localStorage에 저장되어 유지됨
- 브라우저 언어 자동 감지 (첫 방문 시)

## 테스트

1. Footer에서 언어 전환
2. 모든 텍스트가 올바르게 변경되는지 확인
3. 페이지 새로고침 후에도 선택한 언어 유지 확인
4. 브라우저 콘솔에서 번역 누락 경고 확인
