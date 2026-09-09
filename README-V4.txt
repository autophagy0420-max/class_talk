3반 TALK V4 실제 배포판

완료 기능
- 학생 명렬표 기반 회원가입
- 가입코드 검증
- 학생/담임 로그인
- 전체 채팅
- 학생↔담임 1:1 상담
- 공지사항: 담임만 작성, 학생 전체 열람
- URL 자동 링크
- Supabase RLS 기반 1:1 접근 제한
- Realtime 새 메시지 반영

배포 전 권장
1. 테스트학생 39998/39999 데이터 및 Auth 계정 정리
2. 실제 25명 student_roster 확인
3. Supabase Realtime에서 public.messages가 활성화되어 있는지 확인
4. HTTPS 정적 호스팅(GitHub Pages/Cloudflare Pages 등)에 배포
5. secret/service_role 키를 프론트엔드에 절대 넣지 않기
