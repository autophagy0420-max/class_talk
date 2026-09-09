-- V2 신규 프로젝트용 전체 SQL
-- 가입코드는 평문이 아니라 pgcrypto crypt() 해시로 저장합니다.
create extension if not exists pgcrypto;
create type public.user_role as enum ('teacher','student');
create type public.room_type as enum ('class','dm','notice');

create table public.class_settings(
 id int primary key default 1 check(id=1),
 class_code_hash text not null
);
-- ★ 아래 CHANGE-ME-CLASS-CODE를 실제 반 가입코드로 바꾸고 실행하세요.
insert into public.class_settings(id,class_code_hash)
values(1,crypt('CHANGE-ME-CLASS-CODE',gen_salt('bf')));

create table public.student_roster(
 student_no text primary key,
 display_name text not null,
 claimed_by uuid unique,
 claimed_at timestamptz
);

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 role public.user_role not null default 'student',
 student_no text unique references public.student_roster(student_no),
 login_id text unique,
 created_at timestamptz not null default now()
);

create table public.messages(
 id bigint generated always as identity primary key,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 room_type public.room_type not null,
 student_id uuid references public.profiles(id) on delete cascade,
 body text not null check(char_length(body) between 1 and 2000),
 created_at timestamptz not null default now(),
 constraint dm_student check((room_type='dm' and student_id is not null) or (room_type<>'dm' and student_id is null))
);
create index messages_room_idx on public.messages(room_type,student_id,created_at);
create schema if not exists private;

create function private.is_teacher() returns boolean language sql security definer set search_path='' stable as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='teacher')
$$;
revoke all on function private.is_teacher() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_teacher() to authenticated;

alter table public.profiles enable row level security;
alter table public.student_roster enable row level security;
alter table public.class_settings enable row level security;
alter table public.messages enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using(id=(select auth.uid()) or role='teacher' or (select private.is_teacher()));
create policy messages_read on public.messages for select to authenticated
using(room_type in('class','notice') or (room_type='dm' and (student_id=(select auth.uid()) or (select private.is_teacher()))));
create policy messages_write on public.messages for insert to authenticated
with check(sender_id=(select auth.uid()) and (
 room_type='class' or
 (room_type='notice' and (select private.is_teacher())) or
 (room_type='dm' and (student_id=(select auth.uid()) or (select private.is_teacher())))
));

-- 회원가입 함수: 명렬표 검증 + 가입코드 검증 + Auth 계정 생성 + 학번 1회 점유를 한 트랜잭션에서 수행.
-- anon이 호출할 수 있지만 입력 조건을 모두 통과해야 계정이 만들어집니다.
create or replace function public.register_student(
 p_student_no text,p_name text,p_login_id text,p_password text,p_class_code text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare r public.student_roster%rowtype; new_id uuid; mail text;
begin
 if length(p_password)<8 then raise exception 'WEAK_PASSWORD'; end if;
 if p_login_id !~ '^[A-Za-z0-9_]{4,20}$' then raise exception 'BAD_LOGIN'; end if;
 if not exists(select 1 from public.class_settings where id=1 and class_code_hash=crypt(p_class_code,class_code_hash)) then raise exception 'BAD_CLASS_CODE'; end if;

 select * into r from public.student_roster where student_no=trim(p_student_no) for update;
 if not found or r.display_name<>trim(p_name) then raise exception 'INVALID_STUDENT'; end if;
 if r.claimed_by is not null then raise exception 'ALREADY_REGISTERED'; end if;
 if exists(select 1 from public.profiles where lower(login_id)=lower(trim(p_login_id))) then raise exception 'LOGIN_TAKEN'; end if;

 new_id=gen_random_uuid(); mail=lower(trim(p_login_id))||'@classroom.local';

 -- Supabase auth.users 내부 스키마에 필요한 최소 필드.
 -- hosted Supabase의 현재 Auth 스키마에 맞춘 패턴이며, 프로젝트 변경 시 테스트 필요.
 insert into auth.users(
   instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
   raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
   confirmation_token,email_change,email_change_token_new,recovery_token
 ) values(
   '00000000-0000-0000-0000-000000000000',new_id,'authenticated','authenticated',mail,
   crypt(p_password,gen_salt('bf')),now(),
   '{"provider":"email","providers":["email"]}'::jsonb,'{}'::jsonb,now(),now(),'','','',''
 );

 insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at)
 values(gen_random_uuid(),new_id,new_id::text,jsonb_build_object('sub',new_id::text,'email',mail),'email',now(),now());

 insert into public.profiles(id,display_name,role,student_no,login_id)
 values(new_id,r.display_name,'student',r.student_no,lower(trim(p_login_id)));

 update public.student_roster set claimed_by=new_id,claimed_at=now() where student_no=r.student_no;
 return new_id;
exception when unique_violation then
 raise exception 'LOGIN_TAKEN';
end $$;

revoke all on function public.register_student(text,text,text,text,text) from public;
grant execute on function public.register_student(text,text,text,text,text) to anon;

alter publication supabase_realtime add table public.messages;

-- ★ 명렬표 입력 예시: 실제 25명으로 교체
-- insert into public.student_roster(student_no,display_name) values
-- ('30301','김민희'),
-- ('30302','권혁준');

-- ★ 교사 계정은 Dashboard > Authentication > Users에서 직접 생성한 뒤,
-- 그 UUID로 아래처럼 profiles에 넣습니다.
-- insert into public.profiles(id,display_name,role,login_id)
-- values('교사 Auth UUID','담임쌤','teacher','teacher');
