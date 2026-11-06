// DEMO ONLY: this file previews the screens and request workflow.
// It does not connect to Firebase and must not be used as production authentication.
const $ = (id) => document.getElementById(id);
const state = { students: [], passwordRequests: [], currentStudent: null };
const views = ["authView","studentView","adminView"];
function showView(id){ views.forEach(v => $(v).classList.toggle("hidden",v!==id)); hideNotice(); }
function notice(message,type="success"){const n=$("notice");n.textContent=message;n.className=`notice show ${type}`;window.scrollTo({top:0,behavior:"smooth"});}
function hideNotice(){$("notice").className="notice";$("notice").textContent="";}
function form(which){["loginForm","registerForm","forgotForm"].forEach(id=>$(id).classList.toggle("hidden",id!==which));hideNotice();}
function validPhone(v){return /^[6-9]\d{9}$/.test(v);}
function safeText(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function renderAdmin(){
  $("pendingCount").textContent=state.students.filter(s=>s.status==="Pending").length;
  $("approvedCount").textContent=state.students.filter(s=>s.status==="Approved").length;
  $("passwordCount").textContent=state.passwordRequests.filter(r=>r.status==="Pending").length;
  $("registrationRequests").innerHTML=state.students.length?state.students.map((s,i)=>`<div class="request-item"><div><strong>${safeText(s.name)}</strong><p>${safeText(s.phone)} · <b>${s.status}</b></p></div><div class="request-actions">${s.status==="Pending"?`<button data-student="${i}" data-action="approve">Approve</button><button class="danger-button" data-student="${i}" data-action="reject">Reject</button>`:""}</div></div>`).join(""):'<div class="empty-state">No student registration requests yet.</div>';
  $("passwordRequests").innerHTML=state.passwordRequests.length?state.passwordRequests.map((r,i)=>`<div class="request-item"><div><strong>${safeText(r.phone)}</strong><p>${safeText(r.kind)} · ${r.status} · ${safeText(r.date)}</p><p>Proposed password: <b>not collected or displayed</b></p></div><div class="request-actions">${r.status==="Pending"?`<button data-password="${i}" data-action="approve-password">Approve</button><button class="danger-button" data-password="${i}" data-action="reject-password">Reject</button>`:""}</div></div>`).join(""):'<div class="empty-state">No password requests yet.</div>';
}
function renderStudent(){
  if(!state.currentStudent)return;
  $("studentWelcome").textContent=`Welcome, ${state.currentStudent.name}`;
  $("studentStatus").textContent=state.currentStudent.status==="Approved"?"Approved":"Pending approval";
  $("studentStatus").className=`status-pill ${state.currentStudent.status==="Approved"?"approved":"pending"}`;
  $("materialsArea").textContent=state.currentStudent.status==="Approved"?"Your approved study library will be connected here.":"Study materials are available after your account is approved.";
  const reqs=state.passwordRequests.filter(r=>r.phone===state.currentStudent.phone);
  $("studentRequests").innerHTML=reqs.length?`<h4>Your password requests</h4>`+reqs.map(r=>`<div class="request-item"><div><strong>${safeText(r.kind)}</strong><p>${safeText(r.date)} · ${r.status}</p></div></div>`).join(""):"";
}
$("showRegister").onclick=()=>form("registerForm");$("showLogin").onclick=()=>form("loginForm");$("forgotLink").onclick=()=>form("forgotForm");$("forgotBack").onclick=()=>form("loginForm");
$("loginForm").addEventListener("submit",e=>{e.preventDefault();const phone=$("loginPhone").value.trim();if(!validPhone(phone)){notice("Enter a valid 10-digit Indian mobile number.","error");return;}const student=state.students.find(s=>s.phone===phone);if(!student){notice("Demo: no student found. Register first or use Admin demo to review requests.","error");return;}state.currentStudent=student;renderStudent();showView("studentView");});
$("registerForm").addEventListener("submit",e=>{e.preventDefault();const name=$("regName").value.trim(),phone=$("regPhone").value.trim(),pw=$("regPassword").value,confirm=$("regConfirm").value;if(!validPhone(phone)){notice("Enter a valid 10-digit Indian mobile number.","error");return;}if(pw.length<8){notice("Password must contain at least 8 characters.","error");return;}if(pw!==confirm){notice("Passwords do not match.","error");return;}if(state.students.some(s=>s.phone===phone)){notice("This phone number is already registered in the demo.","error");return;}state.students.push({name,phone,status:"Pending"});e.target.reset();notice("Registration request submitted. Admin approval is pending.");renderAdmin();form("loginForm");});
$("forgotForm").addEventListener("submit",e=>{e.preventDefault();const phone=$("forgotPhone").value.trim();if(!validPhone(phone)){notice("Enter a valid 10-digit mobile number.","error");return;}state.passwordRequests.push({phone,kind:"Forgot password",status:"Pending",date:new Date().toLocaleString()});e.target.reset();renderAdmin();notice("Password-reset request sent to the admin in this demo.");form("loginForm");});
$("changePasswordForm").addEventListener("submit",e=>{e.preventDefault();const a=$("newPassword").value,b=$("confirmNewPassword").value;if(a.length<8){notice("New password must contain at least 8 characters.","error");return;}if(a!==b){notice("New passwords do not match.","error");return;}state.passwordRequests.push({phone:state.currentStudent.phone,kind:"Change password",status:"Pending",date:new Date().toLocaleString()});e.target.reset();renderAdmin();renderStudent();notice("Your request was submitted. The password itself was not sent to the admin. After approval, set it again through the secure password update flow.");});
$("studentLogout").onclick=()=>{state.currentStudent=null;showView("authView");form("loginForm");};
$("adminShortcut").onclick=()=>{renderAdmin();showView("adminView");};
$("backToLogin").onclick=()=>{showView("authView");form("loginForm");};
$("adminLogout").onclick=()=>{showView("authView");form("loginForm");};
$("registrationRequests").addEventListener("click",e=>{const b=e.target.closest("button[data-student]");if(!b)return;const s=state.students[Number(b.dataset.student)];s.status=b.dataset.action==="approve"?"Approved":"Rejected";renderAdmin();if(state.currentStudent?.phone===s.phone)renderStudent();});
$("passwordRequests").addEventListener("click",e=>{const b=e.target.closest("button[data-password]");if(!b)return;const r=state.passwordRequests[Number(b.dataset.password)];r.status=b.dataset.action==="approve-password"?"Approved — student must set password":"Rejected";renderAdmin();renderStudent();});
$("adminResetForm").addEventListener("submit",e=>{e.preventDefault();const phone=$("adminResetPhone").value.trim();if(!validPhone(phone)){notice("Enter a valid 10-digit mobile number.","error");return;}state.passwordRequests.push({phone,kind:"Admin-initiated reset",status:"Pending",date:new Date().toLocaleString()});$("adminResetPhone").value="";$("adminResetResult").textContent="Reset instruction created in this demo. The student must complete a secure password update.";renderAdmin();});
showView("authView");form("loginForm");
