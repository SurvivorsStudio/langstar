# Contributing to LangStar / LangStar 기여 가이드

[English](#english) | [한국어](#korean)

---

<a name="english"></a>
## English Version

Thank you for your interest in contributing to LangStar! We welcome contributions from everyone.

### Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Guidelines](#coding-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)

---

### Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

### Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/YOUR_USERNAME/langstar.git
   cd langstar
   ```
3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/langstar.git
   ```

---

### Development Setup

> **Note**: For detailed installation instructions including OS-specific guides, please see our [README.md](README.md#-설치-및-실행).

#### Prerequisites
- Node.js (v16 or higher)
- Python 3.11 or higher
- npm or yarn

#### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```
   This will automatically:
   - Install frontend dependencies (React)
   - Create Python virtual environment (`server/venv/`)
   - Install Python dependencies

2. **Run development server**
   ```bash
   npm run dev
   ```
   This starts:
   - Frontend server (React): `http://localhost:5173`
   - Backend server (FastAPI): `http://localhost:8000`

3. **Stop development server**
   ```bash
   # In the terminal where dev server is running
   Ctrl + C
   
   # Or use the stop command
   npm run stop-dev
   ```

#### Troubleshooting

If you encounter issues:
```bash
# Clean ports
npm run clean-ports

# Check Python version
npm run check-python

# Reinstall Python environment
rm -rf server/venv
npm run setup-python:darwin  # macOS/Linux
npm run setup-python:win32   # Windows
```

---

### How to Contribute

#### Reporting Bugs

Before creating bug reports, please check existing issues. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, Node version, Python version)

#### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Clear title and description**
- **Use case** and motivation
- **Possible implementation** (if you have ideas)

#### Contributing Code

1. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run frontend
   npm run dev --prefix ui
   
   # Run backend
   npm run server-dev
   
   # Run tests (if available)
   npm test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Create a Pull Request**

---

### Coding Guidelines

#### Frontend (React + TypeScript)

- Use **TypeScript** for type safety
- Follow **React Hooks** patterns
- Use **functional components**
- Keep components small and focused
- Use **Zustand** for state management
- Follow existing code style

**Example:**
```typescript
// Good
interface NodeProps {
  id: string;
  data: NodeData;
}

export const CustomNode: React.FC<NodeProps> = ({ id, data }) => {
  // Component logic
};

// Avoid
export function CustomNode(props) {
  // Untyped component
}
```

#### Backend (Python + FastAPI)

- Follow **PEP 8** style guide
- Use **type hints**
- Write **docstrings** for functions
- Keep functions focused and small
- Use **async/await** for I/O operations

**Example:**
```python
# Good
async def execute_workflow(workflow_id: str, input_data: dict) -> dict:
    """
    Execute a workflow with given input data.
    
    Args:
        workflow_id: Unique identifier for the workflow
        input_data: Input parameters for workflow execution
        
    Returns:
        Execution result as dictionary
    """
    # Function logic
    pass

# Avoid
def execute_workflow(workflow_id, input_data):
    # No types, no docstring
    pass
```

#### General Guidelines

- **DRY** (Don't Repeat Yourself)
- **KISS** (Keep It Simple, Stupid)
- **Write self-documenting code**
- **Add comments for complex logic**
- **Keep files under 300 lines** when possible

---

### Commit Message Guidelines

We follow the **Conventional Commits** specification.

#### Format
```
<type>: <subject>
<blank line>
<body>
<blank line>
<footer>
```

#### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

#### Examples
```bash
# Good
feat(workflow): add conditional branch node
fix(api): resolve deployment endpoint error
docs(readme): update installation instructions
refactor(store): simplify state management logic

# Avoid
update stuff
fix bug
changes
```

#### Detailed Commit
```bash
feat(deployment): add AWS Lambda deployment support

- Add Lambda deployment templates
- Implement automatic code generation for Lambda
- Add deployment configuration validation

Closes #123
```

---

### Pull Request Process

1. **Update documentation** if needed
2. **Follow the PR template** provided
3. **Ensure all tests pass**
4. **Request review** from maintainers
5. **Address review comments**
6. **Wait for approval** before merging

#### PR Title Format
Follow commit message format:
```
feat: add new feature
fix: resolve critical bug
docs: update contributing guide
```

#### PR Description Template

Please use our [Pull Request Template](.github/pull_request_template.md):

```markdown
## Motivation
- Why do we need to change this ?

## Type of Change
- [ ] Writing or updating documentation
- [ ] Bug fix
- [ ] New feature
- [ ] Modification of the existing feature
- [ ] Refactoring
- [ ] Breaking change

## Change List
- What are the high level changes contained in this PR ?

## Related issue
- Please specify the related Github issue
- Closes: < Github issue number >

## Intended Effects
- What was true about the code base before, that has changed ?

## Code Quality
- [ ] I have performed a self-review of my own code
- [ ] I have tested on my local environment
- [ ] I have commented my code, particularly in hard-to-understand parts
- [ ] I have added unit tests in order to verify the changes
- [ ] I split up into logical, small, tactical commits

## How has this been tested ?
- How did you test this change ? Did you test manually ? Did you test via automated unit test ?
- Test approach 1
- Test approach 2
- Attach the screenshot if this PR contains UI changes.

## Checklist for reviewers
- [ ] I have tested on my local environment
- [ ] This PR follows the style guidelines
- [ ] I have reviewed this PR against [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [ ] I have confirmed that all unit tests are passed
```

---

### Questions?

If you have questions, feel free to:
- Open an issue for discussion
- Contact us at superlangstar@gmail.com
- Check existing documentation

Thank you for contributing to LangStar! 🌟

---

<a name="korean"></a>
## 한국어 버전

LangStar에 기여해주셔서 감사합니다! 모든 분의 기여를 환영합니다.

### 목차
- [행동 강령](#행동-강령)
- [시작하기](#시작하기)
- [개발 환경 설정](#개발-환경-설정)
- [기여 방법](#기여-방법)
- [코딩 가이드라인](#코딩-가이드라인)
- [커밋 메시지 가이드라인](#커밋-메시지-가이드라인)
- [Pull Request 프로세스](#pull-request-프로세스)

---

### 행동 강령

이 프로젝트와 참여하는 모든 사람은 우리의 [행동 강령](CODE_OF_CONDUCT.md)을 따라야 합니다. 참여함으로써 이 규칙을 준수할 것으로 기대됩니다.

---

### 시작하기

1. **GitHub에서 저장소 포크하기**
2. **로컬에 클론하기**
   ```bash
   git clone https://github.com/YOUR_USERNAME/langstar.git
   cd langstar
   ```
3. **upstream 원격 저장소 추가**
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/langstar.git
   ```

---

### 개발 환경 설정

> **참고**: OS별 상세 설치 가이드를 포함한 자세한 내용은 [README.md](README.md#-설치-및-실행)를 참조하세요.

#### 필수 요구사항
- Node.js (v16 이상)
- Python 3.11 이상
- npm 또는 yarn

#### 설치

1. **의존성 설치**
   ```bash
   npm install
   ```
   자동으로 다음을 수행합니다:
   - 프론트엔드 의존성 설치 (React)
   - Python 가상환경 생성 (`server/venv/`)
   - Python 의존성 설치

2. **개발 서버 실행**
   ```bash
   npm run dev
   ```
   다음 서버들이 실행됩니다:
   - 프론트엔드 서버 (React): `http://localhost:5173`
   - 백엔드 서버 (FastAPI): `http://localhost:8000`

3. **개발 서버 중지**
   ```bash
   # 개발 서버가 실행 중인 터미널에서
   Ctrl + C
   
   # 또는 중지 명령어 사용
   npm run stop-dev
   ```

#### 문제 해결

문제가 발생하면:
```bash
# 포트 정리
npm run clean-ports

# Python 버전 확인
npm run check-python

# Python 환경 재설치
rm -rf server/venv
npm run setup-python:darwin  # macOS/Linux
npm run setup-python:win32   # Windows
```

---

### 기여 방법

#### 버그 보고

버그 리포트를 작성하기 전에 기존 이슈를 확인해주세요. 버그 리포트 작성 시 다음을 포함해주세요:

- **명확한 제목과 설명**
- **재현 단계** 상세히 기술
- **예상되는 동작**
- **스크린샷** (해당되는 경우)
- **환경 정보** (OS, Node 버전, Python 버전)

#### 기능 제안

기능 제안은 GitHub 이슈로 추적됩니다. 기능 제안 작성 시 다음을 포함해주세요:

- **명확한 제목과 설명**
- **사용 사례** 및 동기
- **가능한 구현 방법** (아이디어가 있다면)

#### 코드 기여

1. **기능 브랜치 생성**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **변경 사항 작성**
   - 깔끔하고 읽기 쉬운 코드 작성
   - 가능하면 테스트 추가
   - 필요시 문서 업데이트

3. **변경 사항 테스트**
   ```bash
   # 프론트엔드 실행
   npm run dev --prefix ui
   
   # 백엔드 실행
   npm run server-dev
   
   # 테스트 실행 (가능한 경우)
   npm test
   ```

4. **변경 사항 커밋**
   ```bash
   git add .
   git commit -m "feat: 멋진 기능 추가"
   ```

5. **포크한 저장소에 푸시**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Pull Request 생성**

---

### 코딩 가이드라인

#### 프론트엔드 (React + TypeScript)

- **TypeScript** 사용하여 타입 안정성 확보
- **React Hooks** 패턴 따르기
- **함수형 컴포넌트** 사용
- 컴포넌트는 작고 집중적으로 유지
- 상태 관리는 **Zustand** 사용
- 기존 코드 스타일 따르기

**예시:**
```typescript
// 좋음
interface NodeProps {
  id: string;
  data: NodeData;
}

export const CustomNode: React.FC<NodeProps> = ({ id, data }) => {
  // 컴포넌트 로직
};

// 피할 것
export function CustomNode(props) {
  // 타입이 없는 컴포넌트
}
```

#### 백엔드 (Python + FastAPI)

- **PEP 8** 스타일 가이드 따르기
- **타입 힌트** 사용
- 함수에 **docstring** 작성
- 함수는 집중적이고 작게 유지
- I/O 작업에는 **async/await** 사용

**예시:**
```python
# 좋음
async def execute_workflow(workflow_id: str, input_data: dict) -> dict:
    """
    주어진 입력 데이터로 워크플로우를 실행합니다.
    
    Args:
        workflow_id: 워크플로우 고유 식별자
        input_data: 워크플로우 실행을 위한 입력 파라미터
        
    Returns:
        딕셔너리 형태의 실행 결과
    """
    # 함수 로직
    pass

# 피할 것
def execute_workflow(workflow_id, input_data):
    # 타입 없음, docstring 없음
    pass
```

#### 일반 가이드라인

- **DRY** (Don't Repeat Yourself - 중복 배제)
- **KISS** (Keep It Simple, Stupid - 단순하게 유지)
- **자체 문서화 코드** 작성
- **복잡한 로직에는 주석** 추가
- **파일은 가능하면 300줄 이하**로 유지

---

### 커밋 메시지 가이드라인

**Conventional Commits** 규칙을 따릅니다.

#### 형식
```
<타입>: <제목>
<빈줄>
<본문>
<빈줄>
<꼬리말>
```

#### 타입
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 스타일 변경 (포매팅, 로직 변경 없음)
- `refactor`: 코드 리팩터링
- `test`: 테스트 추가 또는 수정
- `chore`: 유지보수 작업

#### 예시
```bash
# 좋음
feat(workflow): 조건부 분기 노드 추가
fix(api): 배포 엔드포인트 오류 해결
docs(readme): 설치 가이드 업데이트
refactor(store): 상태 관리 로직 단순화

# 피할 것
업데이트
버그 수정
변경사항
```

#### 상세한 커밋
```bash
feat(deployment): AWS Lambda 배포 지원 추가

- Lambda 배포 템플릿 추가
- Lambda용 자동 코드 생성 구현
- 배포 설정 검증 추가

Closes #123
```

---

### Pull Request 프로세스

1. **필요시 문서 업데이트**
2. **제공된 PR 템플릿 따르기**
3. **모든 테스트 통과 확인**
4. **메인테이너에게 리뷰 요청**
5. **리뷰 코멘트 반영**
6. **승인 후 병합**

#### PR 제목 형식
커밋 메시지 형식을 따릅니다:
```
feat: 새로운 기능 추가
fix: 중요한 버그 수정
docs: 기여 가이드 업데이트
```

#### PR 설명 템플릿

우리의 [Pull Request 템플릿](.github/pull_request_template.md)을 사용해주세요:

```markdown
## 변경의 이유
- 이 변경 사항이 필요한 이유를 작성한다.  

## 변경의 종류
- [ ] 문서 작성
- [ ] 버그 수정
- [ ] 새 기능
- [ ] 기능 변경
- [ ] 리팩터링
- [ ] 브레이킹 체인지

## 변경 내용
- 변경한 내용을 요약한다.

## 관련 이슈
- 이 PR과 관련된 이슈 번호를 입력한다.
- Closes: < Github issue number >

## 기대 효과
- 수정된 내용이 어떻게 동작해야 하는지 요약한다.  

## 코드 품질
- [ ] 변경 사항을 자체적으로 리뷰했다.  
- [ ] 변경 사항을 로컬에서 테스트했다.  
- [ ] 코드의 이해를 돕기 위해 적절한 곳에 주석을 작성했다.  
- [ ] 코드를 검증하기 위한 단위 테스트를 추가했다.  
- [ ] 커밋은 이해하기 쉬운 순서와 적절한 크기로 분리했다.  

## 테스트 과정
- 이 변경 사항을 검증하기 위해 수행했던 테스트를 기록한다.  
- 테스트 방법 1
- 테스트 방법 2
- UI 변경 시 변경 부분에 대한 스크린샷을 업로드한다.  

## 리뷰어 체크리스트
- [ ] 이 PR 변경 사항을 로컬에서 테스트했다.  
- [ ] 변경 사항이 코딩 스타일 가이드를 준수하고 있다.  
- [ ] [OWASP Top 10](https://owasp.org/www-project-top-ten/)을 고려해 보안 사항을 리뷰했다.  
- [ ] 전체 단위 테스트를 성공적으로 실행했다.  
```

---

### 질문이 있으신가요?

질문이 있으시면:
- 토론을 위한 이슈 열기
- superlangstar@gmail.com으로 연락
- 기존 문서 확인

LangStar에 기여해주셔서 감사합니다! 🌟

