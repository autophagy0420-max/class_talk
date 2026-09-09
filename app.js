import {createClient} from "https://esm.sh/@supabase/supabase-js@2";
const C=window.APP_CONFIG,S=createClient(C.SUPABASE_URL,C.SUPABASE_PUBLISHABLE_KEY),$=s=>document.querySelector(s);
const st={user:null,p:null,map:{},view:"dm",student:null,ch:null};
const email=id=>id.trim().toLowerCase()==="teacher" ? "autophagy0420@gmail.com" : `${id.trim().toLowerCase()}@classroom.local`;
const esc=s=>(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const links=s=>esc(s).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g,"<br>");
const teacher=()=>st.p?.role==="teacher";
function tab(signup){$("#loginForm").classList.toggle("hidden",signup);$("#signupForm").classList.toggle("hidden",!signup);$("#loginTab").classList.toggle("active",!signup);$("#signupTab").classList.toggle("active",signup)}
$("#loginTab").onclick=()=>tab(false);$("#signupTab").onclick=()=>tab(true);

$("#signupForm").onsubmit=async e=>{
 e.preventDefault();const out=$("#signupError");out.textContent="";
 const no=$("#studentNo").value.trim(),name=$("#studentName").value.trim(),id=$("#signupId").value.trim().toLowerCase(),pw=$("#signupPw").value;
 if(pw!==$("#signupPw2").value){out.textContent="비밀번호가 서로 다릅니다.";return}
 const {data,error}=await S.functions.invoke("register-student",{
   body:{
     studentNo:no,
     name,
     loginId:id,
     password:pw,
     classCode:$("#classCode").value
   }
 });
 let code=data?.error || "";
 if(error && !code){
   try{
     const responseBody = await error.context?.json();
     code = responseBody?.error || "FUNCTION_ERROR";
   }catch{
     code = "FUNCTION_ERROR";
   }
 }
 if(code){
   const messages={
     INVALID_STUDENT_NO:"학번 형식을 확인하세요.",
     INVALID_NAME:"이름을 입력하세요.",
     INVALID_LOGIN_ID:"아이디는 영문 소문자/숫자/_ 조합 4~20자로 입력하세요.",
     WEAK_PASSWORD:"비밀번호는 8자 이상이어야 합니다.",
     BAD_CLASS_CODE:"가입코드가 올바르지 않습니다.",
     INVALID_STUDENT:"학번과 이름이 명렬표와 일치하지 않습니다.",
     ALREADY_REGISTERED:"이미 가입한 학생입니다.",
     LOGIN_TAKEN:"이미 사용 중인 아이디입니다.",
     AUTH_CREATE_FAILED:"인증 계정을 만들지 못했습니다.",
     PROFILE_CREATE_FAILED:"학생 프로필을 만들지 못했습니다.",
     SERVER_ERROR:"서버 처리 중 오류가 발생했습니다.",
     FUNCTION_ERROR:"회원가입 서버에 연결하지 못했습니다."
   };
   out.textContent=messages[code] || `가입하지 못했습니다. (${code})`;
   console.error("register-student:",error,data);
   return;
 }
 alert("가입 완료! 지금 만든 아이디와 비밀번호로 로그인하세요.");
 $("#loginId").value=id;$("#loginPw").value="";tab(false);
};
$("#loginForm").onsubmit=async e=>{
 e.preventDefault();$("#loginError").textContent="";
 const {data,error}=await S.auth.signInWithPassword({email:email($("#loginId").value),password:$("#loginPw").value});
 if(error){$("#loginError").textContent="아이디 또는 비밀번호를 확인하세요.";return}await boot(data.user)
};
async function boot(u){
 st.user=u;const {data,error}=await S.from("profiles").select("*").eq("id",u.id).single();
 if(error||!data){await S.auth.signOut();alert("프로필을 확인할 수 없습니다.");return}st.p=data;
 $("#me").textContent=data.display_name;$("#role").textContent=teacher()?"담임 선생님":"학생";
 await profiles();$("#authView").classList.add("hidden");$("#appView").classList.remove("hidden");await openRoom()
}
async function profiles(){
 const {data,error}=await S.from("profiles").select("id,display_name,role,student_no").order("student_no");if(error)throw error;
 st.map=Object.fromEntries(data.map(x=>[x.id,x]));
 if(teacher()){const a=data.filter(x=>x.role==="student");$("#studentPanel").classList.remove("hidden");$("#students").innerHTML=a.map(x=>`<button class="student" data-id="${x.id}">${esc(x.student_no)} ${esc(x.display_name)}</button>`).join("");if(a[0])st.student=a[0].id;
 $("#students").onclick=e=>{let b=e.target.closest("[data-id]");if(!b)return;st.student=b.dataset.id;st.view="dm";document.querySelectorAll(".student").forEach(x=>x.classList.toggle("active",x===b));document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view==="dm"));openRoom()}}
}
function filter(){if(st.view==="notice")return{type:"notice"};return{type:"dm",student_id:teacher()?st.student:st.user.id}}
function header(){let t=$("#title"),s=$("#subtitle"),b=$("#badge");if(st.view==="notice"){t.textContent="공지사항";s.textContent="담임 선생님이 작성하는 공지입니다.";b.textContent="전체 공개"}else{t.textContent=(teacher()?(st.map[st.student]?.display_name||"학생"):"담임 선생님")+" · 1:1 상담";s.textContent="해당 학생과 담임 선생님만 볼 수 있습니다.";b.textContent="🔒 비공개"}$("#message").disabled=st.view==="notice"&&!teacher();
 $("#message").placeholder = st.view==="notice"
   ? (teacher() ? "공지사항을 입력하세요" : "공지사항은 담임 선생님만 작성할 수 있습니다")
   : "메시지를 입력하세요";
 const sendBtn = $("#messageForm button");
 if(sendBtn) sendBtn.disabled = st.view==="notice"&&!teacher();
}
async function load(){
 const f=filter();let q=S.from("messages").select("*").eq("room_type",f.type).order("created_at").limit(300);if(f.type==="dm")q=q.eq("student_id",f.student_id);
 const {data,error}=await q;const el=$("#messages");el.innerHTML="";if(error){el.innerHTML='<div class="empty">불러오지 못했습니다.</div>';return}if(!data.length)el.innerHTML='<div class="empty">아직 메시지가 없습니다.</div>';data.forEach(render);el.scrollTop=el.scrollHeight
}
function render(m){let el=$("#messages"),p=st.map[m.sender_id]||{},mine=m.sender_id===st.user.id,d=document.createElement("div");d.className="msg "+(mine?"mine":"");d.innerHTML=`<div class="wrap">${mine?"":`<div class="sender">${esc(p.display_name||"사용자")}</div>`}<div class="bubble">${links(m.body)}</div></div><div class="time">${new Date(m.created_at).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"})}</div>`;el.appendChild(d)}
async function sub(){if(st.ch)await S.removeChannel(st.ch);const f=filter();st.ch=S.channel("room-"+Date.now()).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},x=>{let m=x.new;if(m.room_type===f.type&&(f.type!=="dm"||m.student_id===f.student_id)){if($("#messages .empty"))$("#messages").innerHTML="";render(m);$("#messages").scrollTop=$("#messages").scrollHeight}}).subscribe()}
async function openRoom(){header();await load();await sub()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{st.view=b.dataset.view;document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x===b));openRoom()});
$("#messageForm").onsubmit=async e=>{e.preventDefault();let inp=$("#message"),body=inp.value.trim();if(!body||inp.disabled)return;let f=filter();inp.value="";let {error}=await S.from("messages").insert({sender_id:st.user.id,room_type:f.type,student_id:f.student_id||null,body});if(error){alert("전송 실패");inp.value=body}};
$("#message").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#messageForm").requestSubmit()}};
$("#logout").onclick=async()=>{await S.auth.signOut();location.reload()};
const {data:{user}}=await S.auth.getUser();if(user)await boot(user);