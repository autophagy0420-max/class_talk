# 3반 TALK V2

## 바뀐 점
학생이 직접 `학번 + 이름 + 원하는 아이디 + 원하는 비밀번호 + 반 가입코드`로 가입합니다.

가입 성공 조건:
1. 학번/이름이 선생님이 넣어둔 명렬표와 정확히 일치
2. 해당 학번이 아직 가입하지 않음
3. 반 가입코드 일치
4. 아이디 중복 없음
5. 비밀번호 8자 이상

따라서 선생님은 학생 25명의 비밀번호를 알거나 관리할 필요가 없습니다.

## 설치 순서
1. Supabase 새 프로젝트 생성
2. `supabase.sql`의 `CHANGE-ME-CLASS-CODE`를 원하는 가입코드로 수정
3. SQL Editor에서 전체 실행
4. `student_roster`에 실제 반 명렬표 25명 입력
5. Dashboard > Authentication > Users에서 교사 계정 1개 생성
   - email 예: teacher@classroom.local
   - 비밀번호: 교사용 강한 비밀번호
6. 생성된 교사 UUID를 이용해 SQL 마지막 예시처럼 teacher profile 등록
7. `config.js`에 Project URL + publishable key 입력
8. 정적 호스팅에 배포

## 중요한 보안 메모
- 가입코드는 DB에 평문 저장하지 않고 bcrypt 방식으로 해시합니다.
- 다른 학생의 1:1 메시지는 RLS에서 차단합니다.
- 학생 명렬표 자체는 익명/미로그인 사용자에게 SELECT 권한이 없습니다.
- 학생은 다른 학생 프로필도 직접 조회할 수 없습니다.
- 공용 PC에서는 반드시 로그아웃하도록 지도하세요.
- 이 V2의 자체 회원가입 RPC는 Auth 내부 테이블을 생성하므로, 실제 학교 배포 전 테스트 프로젝트에서 가입/로그인 테스트를 먼저 하세요.
- 더 엄격한 운영을 원하면 회원가입을 Supabase Edge Function(서버측 service role)으로 옮기는 V3 구조가 권장됩니다.
