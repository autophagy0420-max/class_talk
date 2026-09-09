3반 TALK V4.1

수정사항
- 공지사항 클릭 시 발생하던 JavaScript 오류 수정
- 전송 버튼에 type="submit" 명시
- 공지사항에서 학생은 입력/전송 비활성화, 담임은 작성 가능
- 기존 Supabase/RLS/채팅 기능은 변경하지 않음

GitHub에 올릴 때는 최소 app.js와 index.html 두 파일을 교체하면 됩니다.
Vercel이 GitHub 저장소와 연결되어 있으면 push/commit 후 자동 재배포됩니다.
