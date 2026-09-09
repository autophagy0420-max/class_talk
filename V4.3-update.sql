-- 3반 TALK V4.3 업데이트 SQL
-- 기존 학생/공지/1:1 메시지는 삭제하지 않습니다.
-- Supabase > SQL Editor에서 이 파일 전체를 한 번 실행하세요.

-- 1) 담임의 학생별 마지막 확인 시각
create table if not exists public.dm_reads(
  student_id uuid primary key references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now()
);

alter table public.dm_reads enable row level security;

drop policy if exists dm_reads_teacher_select on public.dm_reads;
drop policy if exists dm_reads_teacher_insert on public.dm_reads;
drop policy if exists dm_reads_teacher_update on public.dm_reads;
drop policy if exists dm_reads_teacher_delete on public.dm_reads;

create policy dm_reads_teacher_select on public.dm_reads
for select to authenticated
using((select private.is_teacher()));

create policy dm_reads_teacher_insert on public.dm_reads
for insert to authenticated
with check((select private.is_teacher()));

create policy dm_reads_teacher_update on public.dm_reads
for update to authenticated
using((select private.is_teacher()))
with check((select private.is_teacher()));

create policy dm_reads_teacher_delete on public.dm_reads
for delete to authenticated
using((select private.is_teacher()));

-- 2) 메시지/공지 삭제는 담임만 가능
drop policy if exists messages_teacher_delete on public.messages;
create policy messages_teacher_delete on public.messages
for delete to authenticated
using((select private.is_teacher()));

-- 3) 삭제 이벤트에서 메시지 id를 안정적으로 받을 수 있도록 설정
alter table public.messages replica identity full;
