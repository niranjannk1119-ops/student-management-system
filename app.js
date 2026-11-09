import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, onAuthStateChanged, updatePassword
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, query, getDocs,
  addDoc, serverTimestamp, orderBy, limit, deleteDoc, where
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC0v2RWJvF03HHnK2Upv134Ik8eScYE1AU",
  authDomain: "niru-study-notes.firebaseapp.com",
  projectId: "niru-study-notes",
  storageBucket: "niru-study-notes.firebasestorage.app",
  messagingSenderId: "497405407178",
  appId: "1:497405407178:web:f3a7398d172e5381112933",
  measurementId: "G-5KCS77Y8QC"
};
const ADMIN_UID = "Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3";
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
let profile = null, selectedStudentStatus = "pending", studentSemester = "All", adminSemester = "All";
let presenceTimer = null, presenceRefreshTimer = null, cachedStudents = [];
const ONLINE_WINDOW_MS = 90 * 1000;

function notice(message, error=false) {
  const n=$("notice"); n.textContent=message; n.className="notice show"+(error?" error":"");
  window.scrollTo({top:0,behavior:"smooth"});
}
function safe(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showForm(which){
  ["loginForm","registerForm","forgotForm"].forEach(id=>$(id).classList.toggle("hidden",id!==which));
  $("authTitle").textContent=which==="loginForm"?"Student Login":which==="registerForm"?"Create an account":"Forgot password";
  $("authDescription").textContent=which==="loginForm"?"Sign in using your registered email address and password.":"";
  $("notice").className="notice";
}
function showView(which){["authView","studentView","adminView"].forEach(id=>$(id).classList.toggle("hidden",id!==which));document.body.classList.toggle("auth-mode",which==="authView");}
function validPhone(p){return /^[6-9]\d{9}$/.test(p);}
function err(e){
 const m={"auth/email-already-in-use":"This email is already registered.","auth/invalid-credential":"Incorrect email or password.","auth/weak-password":"Use at least 8 characters for your password.","auth/too-many-requests":"Too many attempts. Please wait and try again.","auth/network-request-failed":"Network error. Check your internet connection.","permission-denied":"Firestore denied the action. Check that the supplied rules are published."};
 return m[e.code]||e.message||"Something went wrong.";
}
async function getProfile(uid){const s=await getDoc(doc(db,"users",uid));return s.exists()?{uid,...s.data()}:null;}
function isAdmin(u){return !!u && u.uid === ADMIN_UID;}
function semesterButtons(target, selected, callback){
 $(target).innerHTML=["All",1,2,3,4,5,6].map(v=>`<button class="tab ${String(v)===String(selected)?"active":""}" data-sem="${v}">${v==="All"?"All":"Semester "+v}</button>`).join("");
 $(target).querySelectorAll("button").forEach(b=>b.onclick=()=>callback(b.dataset.sem));
}
async function readMaterials(){
 const snap=await getDocs(query(collection(db,"materials"),orderBy("createdAt","desc"),limit(200)));
 return snap.docs.map(d=>({id:d.id,...d.data()}));
}
function renderMaterialCards(target,items,semester,admin=false){
 const filtered=items.filter(m=>semester==="All"||String(m.semester)===String(semester));
 $(target).innerHTML=filtered.length?filtered.map(m=>`<article class="material-card"><h3>${safe(m.title)}</h3><p class="muted">Semester ${safe(m.semester)}</p><a href="${safe(m.url)}" target="_blank" rel="noopener">Open PDF ↗</a>${admin?` <button class="danger" data-delete-material="${safe(m.id)}">Delete</button>`:""}</article>`).join(""):'<div class="list-item">No study materials published for this semester yet.</div>';
}
async function renderStudent(profileData){
 profile=profileData;
 $("studentWelcome").textContent=profileData.name||"Student account";
 $("studentEmail").textContent=profileData.email||"";
 const approved=profileData.status==="approved";
 $("studentStatus").textContent=approved?"Approved":`Account ${profileData.status||"pending"}`;
 $("studentStatus").className="status "+(approved?"approved":"");
 // Show the dashboard immediately; load study materials after the first screen appears.
 showView("studentView");
 $("studentMaterials").innerHTML='<div class="list-item">Loading study materials…</div>';
 semesterButtons("studentSemesterTabs",studentSemester,v=>{
   studentSemester=v;
   if(window.__studentMaterials) renderMaterialCards("studentMaterials",window.__studentMaterials,studentSemester);
 });
 if(!approved){$("studentMaterials").innerHTML='<div class="list-item">Your account is awaiting approval.</div>';return;}
 try{
   const materials=await readMaterials();
   window.__studentMaterials=materials;
   renderMaterialCards("studentMaterials",materials,studentSemester);
 }catch(ex){$("studentMaterials").innerHTML=`<div class="list-item">${safe(err(ex))}</div>`;}
}
async function renderAdmin(){
 showView("adminView");
 $("adminEmail").textContent=auth.currentUser?.email||"";
 const users=await getDocs(query(collection(db,"users"),limit(500)));
 const students=users.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.role==="student");
 cachedStudents=students;
 const pending=students.filter(s=>s.status==="pending"),approved=students.filter(s=>s.status==="approved"),rejected=students.filter(s=>s.status==="rejected");
 $("studentCounts").textContent=`Pending: ${pending.length}  ·  Approved: ${approved.length}  ·  Rejected: ${rejected.length}`;
 const shown=students.filter(s=>s.status===selectedStudentStatus);
 $("studentList").innerHTML=shown.length?shown.map(s=>`<div class="list-item"><div><strong>${safe(s.name)}</strong><p>${safe(s.email)}</p><p>UID: ${safe(s.uid)}</p></div><div class="actions">${s.status==="pending"?`<button class="approve" data-review="${safe(s.uid)}" data-status="approved">Approve</button><button class="danger" data-review="${safe(s.uid)}" data-status="rejected">Reject</button>`:""}<details class="student-menu"><summary aria-label="Student options">⋮</summary><div class="student-menu-items"><button type="button" data-student-info="${safe(s.uid)}">Information</button><button type="button" data-student-edit="${safe(s.uid)}">Edit details</button>${s.status!=="pending"?`<button type="button" data-review="${safe(s.uid)}" data-status="pending">Move to Pending</button>`:""}<button type="button" class="menu-delete" data-student-delete="${safe(s.uid)}">Delete profile</button></div></details></div></div>`).join(""):'<div class="list-item">No students in this category.</div>';
 const presenceSnap=await getDocs(query(collection(db,"presence"),limit(500)));
 const presenceMap=new Map(presenceSnap.docs.map(d=>[d.id,d.data()]));
 const onlineNow=approved.filter(s=>isOnline(presenceMap.get(s.uid))).length;
 $("presenceTotal").textContent=String(approved.length);
 $("presenceOnline").textContent=String(onlineNow);
 $("presenceOffline").textContent=String(Math.max(0,approved.length-onlineNow));
 const materials=await readMaterials();
 const draw=()=>{semesterButtons("adminSemesterTabs",adminSemester,v=>{adminSemester=v;draw();});renderMaterialCards("adminMaterialCards",materials,adminSemester,true);};
 draw();
 $("adminMaterials").innerHTML=materials.length?materials.map(m=>`<div class="list-item"><div><strong>${safe(m.title)}</strong><p>Semester ${safe(m.semester)}</p></div><div class="actions"><a href="${safe(m.url)}" target="_blank" rel="noopener">Open PDF</a><button class="danger" data-delete-material="${safe(m.id)}">Delete</button></div></div>`).join(""):'<div class="list-item">No materials added yet.</div>';
 showView("adminView");
}
async function recordLogin(user){
 await addDoc(collection(db,"loginHistory"),{uid:user.uid,email:user.email||"",at:serverTimestamp()});
}

async function updatePresence(user, studentProfile=profile){
 await setDoc(doc(db,"presence",user.uid),{uid:user.uid,name:studentProfile?.name||"Student",email:user.email||"",lastSeen:serverTimestamp()},{merge:true});
}
function onPresenceVisible(){if(document.visibilityState==="visible"&&auth.currentUser&&!isAdmin(auth.currentUser))updatePresence(auth.currentUser,profile).catch(console.warn);}
function startPresence(user, studentProfile){
 stopPresence(); profile=studentProfile; updatePresence(user,studentProfile).catch(console.warn);
 presenceTimer=setInterval(()=>updatePresence(user,studentProfile).catch(console.warn),30000);
 document.addEventListener("visibilitychange",onPresenceVisible);
}
function stopPresence(){
 if(presenceTimer){clearInterval(presenceTimer);presenceTimer=null;}
 document.removeEventListener("visibilitychange",onPresenceVisible);
}
function isOnline(p){const t=p?.lastSeen?.toDate?.()?.getTime?.();return !!t&&(Date.now()-t)<ONLINE_WINDOW_MS;}
async function showPresenceList(which){
 $("presenceDetail").classList.remove("hidden");$("studentHistoryPanel").classList.add("hidden");
 const list=$("presenceDetailList");list.innerHTML='<div class="list-item">Loading students…</div>';
 try{
  const [us,ps]=await Promise.all([getDocs(query(collection(db,"users"),limit(500))),getDocs(query(collection(db,"presence"),limit(500)))]);
  cachedStudents=us.docs.map(d=>({uid:d.id,...d.data()})).filter(s=>s.role==="student"&&s.status==="approved");
  const pm=new Map(ps.docs.map(d=>[d.id,d.data()]));
  const arr=which==="all"?cachedStudents:cachedStudents.filter(s=>isOnline(pm.get(s.uid))===(which==="online"));
  $("presenceDetailTitle").textContent=`${which==="all"?"All approved":which==="online"?"Online":"Offline"} students (${arr.length})`;
  list.innerHTML=arr.length?arr.map(s=>`<button class="student-presence-row" data-student-history="${safe(s.uid)}"><span><strong>${safe(s.name||"Student")}</strong><small>${safe(s.phone||s.email||"")}</small></span><span class="presence-dot ${isOnline(pm.get(s.uid))?"online":"offline"}">${isOnline(pm.get(s.uid))?"Online":"Offline"} · View history →</span></button>`).join(""):'<div class="list-item">No students in this category.</div>';
 }catch(e){list.innerHTML=`<div class="list-item">${safe(err(e))}</div>`;}
}
async function showStudentHistory(uid){
 $("presenceDetail").classList.add("hidden");$("studentHistoryPanel").classList.remove("hidden");
 const s=cachedStudents.find(x=>x.uid===uid);$("studentHistoryTitle").textContent=`Login history: ${s?.name||"Student"}`;
 const list=$("studentHistoryList");list.innerHTML='<div class="list-item">Loading the latest 20 records…</div>';
 try{
  const snap=await getDocs(query(collection(db,"loginHistory"),where("uid","==",uid)));
  const records=snap.docs.map(d=>d.data()).sort((a,b)=>(b.at?.toMillis?.()||0)-(a.at?.toMillis?.()||0)).slice(0,20);
  list.innerHTML=records.map((x,i)=>{const dt=x.at?.toDate?.().toLocaleString()||"Time unavailable";return `<div class="history-row"><span class="history-number">${i+1}</span><div><strong>${safe(dt)}</strong><small>${safe(x.email||s?.email||"")}</small></div></div>`;}).join("")||'<div class="list-item">No login history recorded for this student yet.</div>';
 }catch(e){list.innerHTML=`<div class="list-item">${safe(err(e))}</div>`;}
}
$("showRegister").onclick=()=>showForm("registerForm");$("showLogin").onclick=()=>showForm("loginForm");$("forgotLink").onclick=()=>showForm("forgotForm");$("forgotBack").onclick=()=>showForm("loginForm");
$("showPassword").onchange=e=>$("loginPassword").type=e.target.checked?"text":"password";

$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("regName").value.trim(),email=$("regEmail").value.trim().toLowerCase(),password=$("regPassword").value;
 if(password!==$("regConfirm").value)return notice("Passwords do not match.",true);
 try{
  const c=await createUserWithEmailAndPassword(auth,email,password);
  await setDoc(doc(db,"users",c.user.uid),{name,email,role:"student",status:"pending",createdAt:serverTimestamp()});
  await signOut(auth);e.target.reset();showForm("loginForm");notice("Registration submitted. Please wait for administrator approval.");
 }catch(ex){notice(err(ex),true);}
});
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const submitButton=e.submitter||$("loginForm").querySelector('button[type="submit"]');
 if(submitButton?.disabled) return;
 if(submitButton){submitButton.disabled=true;submitButton.textContent="Signing in…";}
 try{
  const email=$("loginEmail").value.trim().toLowerCase();
  const c=await signInWithEmailAndPassword(auth,email,$("loginPassword").value);
  // Login history is useful, but must not delay authentication or dashboard display.
  recordLogin(c.user).catch(ex=>console.warn("Login history could not be saved:",ex));
  // onAuthStateChanged performs the single profile/approval check and renders the view.
 }catch(ex){notice(err(ex),true);}
 finally{if(submitButton){submitButton.disabled=false;submitButton.textContent="Sign In";}}
});
$("forgotForm").addEventListener("submit",async e=>{
 e.preventDefault();try{
  const email=$("forgotEmail").value.trim().toLowerCase();
  await sendPasswordResetEmail(auth,email);
  e.target.reset();showForm("loginForm");notice("Password-reset link sent. Check your inbox and spam folder.");
 }catch(ex){notice(err(ex),true);}
});
$("studentLogout").onclick=async()=>{await signOut(auth);profile=null;showView("authView");showForm("loginForm");};
$("adminLogout").onclick=$("studentLogout").onclick;
$("refreshAdmin").onclick=async()=>{try{await renderAdmin();notice("Student list refreshed.");}catch(e){notice(err(e),true);}};
document.querySelectorAll(".status-tabs .tab").forEach(b=>b.onclick=async()=>{selectedStudentStatus=b.dataset.status;document.querySelectorAll(".status-tabs .tab").forEach(x=>x.classList.toggle("active",x===b));await renderAdmin();});
$("studentList").addEventListener("click",async e=>{
 const b=e.target.closest("[data-review]");if(!b||!isAdmin(auth.currentUser))return;
 try{await setDoc(doc(db,"users",b.dataset.review),{status:b.dataset.status,reviewedAt:serverTimestamp()},{merge:true});await renderAdmin();notice(`Student ${b.dataset.status}.`);}catch(ex){notice(err(ex),true);}
});

let editingStudent = null;
function closeStudentDialog(){ $("studentManageDialog").close(); editingStudent=null; }
$("closeManageDialog").onclick=closeStudentDialog;

$("studentList").addEventListener("click", async e=>{
  const info=e.target.closest("[data-student-info]");
  const edit=e.target.closest("[data-student-edit]");
  if(!isAdmin(auth.currentUser)) return;
  const uid=info?.dataset.studentInfo||edit?.dataset.studentEdit;
  if(!uid) return;
  const student=cachedStudents.find(x=>x.uid===uid);
  if(!student) return notice("Student record not found. Refresh and try again.",true);

  if(info){
    $("manageDialogTitle").textContent="Student information";
    $("manageStudentName").value=student.name||"";
    $("manageStudentEmail").value=student.email||"";
    $("manageStudentStatus").value=student.status||"pending";
    $("manageStudentUid").textContent="UID: "+student.uid;
    $("studentManageForm").querySelectorAll("input,select").forEach(x=>x.disabled=true);
    $("saveStudentDetails").classList.add("hidden");
    $("studentManageDialog").showModal();
  } else if(edit){
    editingStudent=student;
    $("manageDialogTitle").textContent="Edit student details";
    $("manageStudentName").value=student.name||"";
    $("manageStudentEmail").value=student.email||"";
    $("manageStudentStatus").value=student.status||"pending";
    $("manageStudentUid").textContent="UID: "+student.uid;
    $("studentManageForm").querySelectorAll("input,select").forEach(x=>x.disabled=false);
    $("saveStudentDetails").classList.remove("hidden");
    $("studentManageDialog").showModal();
  }
});

$("studentList").addEventListener("click", async e=>{
  const del=e.target.closest("[data-student-delete]");
  if(!del||!isAdmin(auth.currentUser)) return;
  const uid=del.dataset.studentDelete;
  const student=cachedStudents.find(x=>x.uid===uid);
  if(!student) return notice("Student record not found. Refresh and try again.",true);
  const confirmed=confirm(`Delete the Firestore profile for ${student.name||student.email}? This also removes their presence and login-history records. Their Firebase Authentication sign-in account will remain; deleting another user's Auth account requires a paid-plan backend.`);
  if(!confirmed) return;
  try{
    const [presenceSnap,historySnap]=await Promise.all([
      getDocs(query(collection(db,"presence"),where("uid","==",uid))),
      getDocs(query(collection(db,"loginHistory"),where("uid","==",uid)))
    ]);
    const cleanup=[...presenceSnap.docs,...historySnap.docs];
    for(const item of cleanup) await deleteDoc(item.ref);
    await deleteDoc(doc(db,"users",uid));
    await renderAdmin();
    notice("Student profile and associated activity records deleted. Authentication account remains.");
  }catch(ex){notice(err(ex),true);}
});

$("studentManageForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!editingStudent||!isAdmin(auth.currentUser)) return;
  const payload={
    uid:editingStudent.uid,
    name:$("manageStudentName").value.trim(),
    email:$("manageStudentEmail").value.trim().toLowerCase(),
    status:$("manageStudentStatus").value
  };
  if(!payload.name) return notice("Enter a valid student name.",true);
  try{
    await setDoc(doc(db,"users",editingStudent.uid),{name:payload.name,status:payload.status},{merge:true});
    closeStudentDialog();
    await renderAdmin();
    notice("Student details updated.");
  }catch(ex){notice(err(ex),true);}
});

$("addMaterialForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!isAdmin(auth.currentUser))return;
 try{await addDoc(collection(db,"materials"),{title:$("materialTitle").value.trim(),semester:Number($("materialSemester").value),url:$("materialUrl").value.trim(),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});e.target.reset();await renderAdmin();notice("PDF added to the study library.");}catch(ex){notice(err(ex),true);}
});
document.addEventListener("click",async e=>{
 const b=e.target.closest("[data-delete-material]");if(!b||!isAdmin(auth.currentUser))return;
 if(!confirm("Delete this study material?"))return;
 try{await deleteDoc(doc(db,"materials",b.dataset.deleteMaterial));await renderAdmin();notice("Material deleted.");}catch(ex){notice(err(ex),true);}
});
$("changePasswordForm").addEventListener("submit",async e=>{
 e.preventDefault();const p=$("newPassword").value;if(p!==$("confirmNewPassword").value)return notice("Passwords do not match.",true);
 try{await updatePassword(auth.currentUser,p);e.target.reset();notice("Password updated successfully.");}catch(ex){notice(ex.code==="auth/requires-recent-login"?"Please sign out and sign in again before changing your password.":err(ex),true);}
});
$("presenceTotalCard").onclick=()=>showPresenceList("all");
$("presenceOnlineCard").onclick=()=>showPresenceList("online");
$("presenceOfflineCard").onclick=()=>showPresenceList("offline");
$("presenceDetailList").addEventListener("click",e=>{const b=e.target.closest("[data-student-history]");if(b)showStudentHistory(b.dataset.studentHistory);});
$("backToPresence").onclick=()=>{$("studentHistoryPanel").classList.add("hidden");$("presenceDetail").classList.remove("hidden");};
$("backToPresenceDashboard").onclick=()=>{$("presenceDetail").classList.add("hidden");$("studentHistoryPanel").classList.add("hidden");};
$("musicPlay").onclick=async()=>{const a=$("studyAudio");if(a.paused){try{await a.play();$("musicStatus").textContent="Playing";$("musicPlay").textContent="Ⅱ Pause music";}catch(e){notice("Audio could not play. Check the supplied audio file.",true);}}else{a.pause();$("musicStatus").textContent="Paused";$("musicPlay").textContent="▶ Play music";}};
$("musicStop").onclick=()=>{$("studyAudio").pause();$("studyAudio").currentTime=0;$("musicStatus").textContent="Stopped";$("musicPlay").textContent="▶ Play music";};
$("studyAudio").addEventListener("ended",()=>{$("musicStatus").textContent="Finished";$("musicPlay").textContent="▶ Play music";});
onAuthStateChanged(auth,async user=>{
 if(!user){stopPresence();if(presenceRefreshTimer){clearInterval(presenceRefreshTimer);presenceRefreshTimer=null;}showView("authView");showForm("loginForm");return;}
 try{if(isAdmin(user)){stopPresence();await renderAdmin();if(presenceRefreshTimer)clearInterval(presenceRefreshTimer);presenceRefreshTimer=setInterval(()=>renderAdmin().catch(console.warn),60000);return;}if(presenceRefreshTimer){clearInterval(presenceRefreshTimer);presenceRefreshTimer=null;}const p=await getProfile(user.uid);if(!p||p.role!=="student"||p.status!=="approved"){await signOut(auth);showView("authView");showForm("loginForm");notice(p?.status==="pending"?"Your registration is awaiting administrator approval.":"Account profile not found. Contact the administrator.",true);return;}startPresence(user,p);await renderStudent(p);}catch(ex){await signOut(auth);showView("authView");showForm("loginForm");notice(err(ex),true);}
});
