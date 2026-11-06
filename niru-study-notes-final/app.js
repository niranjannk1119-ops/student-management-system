import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail, updatePassword
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, query, getDocs,
  addDoc, serverTimestamp, orderBy, limit, deleteDoc
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
const ADMIN_UID = "qeHYqJolAaO38gunIgBk8bv2lB93";
const ADMIN_PHONE = "7483819617";
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
const $ = id => document.getElementById(id);
let profile = null, selectedStudentStatus = "pending", studentSemester = "All", adminSemester = "All";

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
function showView(which){["authView","studentView","adminView"].forEach(id=>$(id).classList.toggle("hidden",id!==which));}
function validPhone(p){return /^[6-9]\d{9}$/.test(p);}
function err(e){
 const m={"auth/email-already-in-use":"This email is already registered.","auth/invalid-credential":"Incorrect email or password.","auth/weak-password":"Use at least 8 characters for your password.","auth/too-many-requests":"Too many attempts. Please wait and try again.","auth/network-request-failed":"Network error. Check your internet connection.","permission-denied":"Firestore denied the action. Check that the supplied rules are published."};
 return m[e.code]||e.message||"Something went wrong.";
}
async function getProfile(uid){const s=await getDoc(doc(db,"users",uid));return s.exists()?{uid,...s.data()}:null;}
function isAdmin(u){return u?.uid===ADMIN_UID;}
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
 profile=profileData; $("studentWelcome").textContent=profileData.name||"Student account";$("studentEmail").textContent=profileData.email||"";
 const approved=profileData.status==="approved";$("studentStatus").textContent=approved?"Approved":`Account ${profileData.status||"pending"}`;$("studentStatus").className="status "+(approved?"approved":"");
 const materials=approved?await readMaterials():[];
 const draw=()=>{semesterButtons("studentSemesterTabs",studentSemester,v=>{studentSemester=v;draw();});renderMaterialCards("studentMaterials",materials,studentSemester);};
 draw();showView("studentView");
}
async function renderAdmin(){
 $("adminEmail").textContent=auth.currentUser?.email||"";
 const users=await getDocs(query(collection(db,"users"),limit(500)));
 const students=users.docs.map(d=>({uid:d.id,...d.data()})).filter(u=>u.role==="student");
 const pending=students.filter(s=>s.status==="pending"),approved=students.filter(s=>s.status==="approved"),rejected=students.filter(s=>s.status==="rejected");
 $("studentCounts").textContent=`Pending: ${pending.length}  ·  Approved: ${approved.length}  ·  Rejected: ${rejected.length}`;
 const shown=students.filter(s=>s.status===selectedStudentStatus);
 $("studentList").innerHTML=shown.length?shown.map(s=>`<div class="list-item"><div><strong>${safe(s.name)}</strong><p>${safe(s.phone)} · ${safe(s.email)}</p><p>UID: ${safe(s.uid)}</p></div><div class="actions">${s.status==="pending"?`<button class="approve" data-review="${safe(s.uid)}" data-status="approved">Approve</button><button class="danger" data-review="${safe(s.uid)}" data-status="rejected">Reject</button>`:""}</div></div>`).join(""):'<div class="list-item">No students in this category.</div>';
 const materials=await readMaterials();
 const draw=()=>{semesterButtons("adminSemesterTabs",adminSemester,v=>{adminSemester=v;draw();});renderMaterialCards("adminMaterialCards",materials,adminSemester,true);};
 draw();
 $("adminMaterials").innerHTML=materials.length?materials.map(m=>`<div class="list-item"><div><strong>${safe(m.title)}</strong><p>Semester ${safe(m.semester)}</p></div><div class="actions"><a href="${safe(m.url)}" target="_blank" rel="noopener">Open PDF</a><button class="danger" data-delete-material="${safe(m.id)}">Delete</button></div></div>`).join(""):'<div class="list-item">No materials added yet.</div>';
 showView("adminView");
}
async function recordLogin(user){
 await addDoc(collection(db,"loginHistory"),{uid:user.uid,email:user.email||"",at:serverTimestamp()});
}
$("showRegister").onclick=()=>showForm("registerForm");$("showLogin").onclick=()=>showForm("loginForm");$("forgotLink").onclick=()=>showForm("forgotForm");$("forgotBack").onclick=()=>showForm("loginForm");
$("showPassword").onchange=e=>$("loginPassword").type=e.target.checked?"text":"password";

$("registerForm").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("regName").value.trim(),phone=$("regPhone").value.trim(),email=$("regEmail").value.trim().toLowerCase(),password=$("regPassword").value;
 if(!validPhone(phone))return notice("Enter a valid 10-digit Indian mobile number.",true);
 if(password!==$("regConfirm").value)return notice("Passwords do not match.",true);
 try{
  const c=await createUserWithEmailAndPassword(auth,email,password);
  await setDoc(doc(db,"users",c.user.uid),{name,phone,email,role:"student",status:"pending",createdAt:serverTimestamp()});
  await signOut(auth);e.target.reset();showForm("loginForm");notice("Registration submitted. Please wait for administrator approval.");
 }catch(ex){notice(err(ex),true);}
});
$("loginForm").addEventListener("submit",async e=>{
 e.preventDefault();try{
  const c=await signInWithEmailAndPassword(auth,$("loginEmail").value.trim().toLowerCase(),$("loginPassword").value);
  await recordLogin(c.user);
  if(isAdmin(c.user)){await renderAdmin();return;}
  const p=await getProfile(c.user.uid);
  if(!p||p.role!=="student"){await signOut(auth);return notice("Account profile not found. Contact the administrator.",true);}
  if(p.status!=="approved"){await signOut(auth);return notice("Your registration is awaiting administrator approval.",true);}
  await renderStudent(p);
 }catch(ex){notice(err(ex),true);}
});
$("forgotForm").addEventListener("submit",async e=>{
 e.preventDefault();try{await sendPasswordResetEmail(auth,$("forgotEmail").value.trim().toLowerCase());e.target.reset();showForm("loginForm");notice("Password recovery email sent. Check your inbox and spam folder.");}catch(ex){notice(err(ex),true);}
});
$("studentLogout").onclick=async()=>{await signOut(auth);profile=null;showView("authView");showForm("loginForm");};
$("adminLogout").onclick=$("studentLogout").onclick;
$("refreshAdmin").onclick=async()=>{try{await renderAdmin();notice("Student list refreshed.");}catch(e){notice(err(e),true);}};
document.querySelectorAll(".status-tabs .tab").forEach(b=>b.onclick=async()=>{selectedStudentStatus=b.dataset.status;document.querySelectorAll(".status-tabs .tab").forEach(x=>x.classList.toggle("active",x===b));await renderAdmin();});
$("studentList").addEventListener("click",async e=>{
 const b=e.target.closest("[data-review]");if(!b||!isAdmin(auth.currentUser))return;
 try{await setDoc(doc(db,"users",b.dataset.review),{status:b.dataset.status,reviewedAt:serverTimestamp()},{merge:true});await renderAdmin();notice(`Student ${b.dataset.status}.`);}catch(ex){notice(err(ex),true);}
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
$("loadHistory").onclick=async()=>{
 try{
  const snap=await getDocs(query(collection(db,"loginHistory"),orderBy("at","desc"),limit(250)));
  $("loginHistory").innerHTML=snap.docs.map(d=>{const x=d.data(),dt=x.at?.toDate?.().toLocaleString()||"Time unavailable";return `<div class="list-item"><div><strong>${safe(x.email)}</strong><p>UID: ${safe(x.uid)} · ${safe(dt)}</p></div></div>`;}).join("")||'<div class="list-item">No login records yet.</div>';
 }catch(ex){notice(err(ex),true);}
};
$("musicPlay").onclick=async()=>{const a=$("studyAudio");if(a.paused){try{await a.play();$("musicStatus").textContent="Playing";$("musicPlay").textContent="Ⅱ Pause music";}catch(e){notice("Audio could not play. Check the supplied audio file.",true);}}else{a.pause();$("musicStatus").textContent="Paused";$("musicPlay").textContent="▶ Play music";}};
$("musicStop").onclick=()=>{$("studyAudio").pause();$("studyAudio").currentTime=0;$("musicStatus").textContent="Stopped";$("musicPlay").textContent="▶ Play music";};
$("studyAudio").addEventListener("ended",()=>{$("musicStatus").textContent="Finished";$("musicPlay").textContent="▶ Play music";});
onAuthStateChanged(auth,async user=>{
 if(!user){showView("authView");showForm("loginForm");return;}
 try{if(isAdmin(user)){await renderAdmin();return;}const p=await getProfile(user.uid);if(!p||p.role!=="student"||p.status!=="approved"){await signOut(auth);showView("authView");showForm("loginForm");notice(p?.status==="pending"?"Your registration is awaiting administrator approval.":"Account profile not found. Contact the administrator.",true);return;}await renderStudent(p);}catch(ex){await signOut(auth);showView("authView");showForm("loginForm");notice(err(ex),true);}
});
