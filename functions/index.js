const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();
const auth = getAuth();
const ADMIN_UID = "Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3";
const ADMIN_PHONE = "7483819617";

function requireAdmin(request) {
  if (!request.auth || request.auth.uid !== ADMIN_UID) {
    throw new HttpsError("permission-denied", "Administrator access required.");
  }
}
function validateStudent(uid) {
  if (typeof uid !== "string" || !uid || uid === ADMIN_UID) {
    throw new HttpsError("invalid-argument", "Invalid student account.");
  }
}
function validPhone(phone) {
  return typeof phone === "string" && /^[6-9]\d{9}$/.test(phone);
}
function apiKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{20,}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Firebase API key is missing.");
  }
  return value;
}
async function identityToolkit(endpoint, key, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = data?.error?.message || "AUTHENTICATION_FAILED";
    throw new Error(code);
  }
  return data;
}

exports.reserveStudentPhone = onCall({ region: "asia-south1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in to complete registration.");
  const phone = request.data?.phone;
  if (!validPhone(phone)) throw new HttpsError("invalid-argument", "Enter a valid 10-digit phone number.");
  if (request.auth.uid === ADMIN_UID) throw new HttpsError("permission-denied", "Administrator phone is reserved.");
  const user = await auth.getUser(request.auth.uid);
  if (!user.email || user.email.toLowerCase() !== String(request.auth.token.email || "").toLowerCase()) {
    throw new HttpsError("permission-denied", "Account verification failed.");
  }
  const ref = db.doc(`phoneIndex/${phone}`);
  await db.runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists && existing.data().uid !== request.auth.uid) {
      throw new HttpsError("already-exists", "This phone number is already registered.");
    }
    tx.set(ref, { uid: request.auth.uid, createdAt: FieldValue.serverTimestamp() });
  });
  return { ok: true };
});

exports.phonePasswordLogin = onCall({ region: "asia-south1" }, async (request) => {
  const phone = request.data?.phone;
  const password = request.data?.password;
  const key = apiKey(request.data?.apiKey);
  if (!validPhone(phone) || typeof password !== "string" || !password) {
    throw new HttpsError("invalid-argument", "Enter your phone number and password.");
  }
  try {
    let uid = null;
    let email = null;
    if (phone === ADMIN_PHONE) {
      uid = ADMIN_UID;
      const adminUser = await auth.getUser(uid);
      email = adminUser.email;
    } else {
      const index = await db.doc(`phoneIndex/${phone}`).get();
      if (!index.exists) throw new Error("INVALID_LOGIN_CREDENTIALS");
      uid = index.data().uid;
      const userSnap = await db.doc(`users/${uid}`).get();
      if (!userSnap.exists || userSnap.data().role !== "student" || !userSnap.data().email) {
        throw new Error("INVALID_LOGIN_CREDENTIALS");
      }
      email = userSnap.data().email;
    }
    const signedIn = await identityToolkit("accounts:signInWithPassword", key, {
      email, password, returnSecureToken: true
    });
    if (signedIn.localId !== uid) throw new Error("INVALID_LOGIN_CREDENTIALS");
    const customToken = await auth.createCustomToken(uid);
    return { customToken };
  } catch (e) {
    console.warn("Phone login rejected:", e.message);
    throw new HttpsError("unauthenticated", "Phone number or password is incorrect.");
  }
});

exports.phonePasswordReset = onCall({ region: "asia-south1" }, async (request) => {
  const phone = request.data?.phone;
  const key = apiKey(request.data?.apiKey);
  if (!validPhone(phone)) throw new HttpsError("invalid-argument", "Enter a valid 10-digit phone number.");
  try {
    let email = null;
    if (phone === ADMIN_PHONE) {
      email = (await auth.getUser(ADMIN_UID)).email;
    } else {
      const index = await db.doc(`phoneIndex/${phone}`).get();
      if (index.exists) {
        const profile = await db.doc(`users/${index.data().uid}`).get();
        if (profile.exists) email = profile.data().email;
      }
    }
    if (email) {
      await identityToolkit("accounts:sendOobCode", key, {
        requestType: "PASSWORD_RESET", email
      });
    }
    // Same response whether the phone is registered or not, to reduce account enumeration.
    return { ok: true };
  } catch (e) {
    console.warn("Password reset request could not be completed:", e.message);
    // Do not disclose whether a phone number exists.
    return { ok: true };
  }
});

exports.adminUpdateStudent = onCall({ region: "asia-south1" }, async (request) => {
  requireAdmin(request);
  const { uid, name, phone, email, status } = request.data || {};
  validateStudent(uid);
  if (typeof name !== "string" || !name.trim() || !validPhone(phone) ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !["pending", "approved", "rejected"].includes(status)) {
    throw new HttpsError("invalid-argument", "Check the student's name, phone, email and status.");
  }
  const userRef = db.doc(`users/${uid}`);
  const newPhoneRef = db.doc(`phoneIndex/${phone}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().role !== "student") {
    throw new HttpsError("not-found", "Student profile not found.");
  }
  const oldPhone = userSnap.data().phone;
  await db.runTransaction(async tx => {
    const newPhoneSnap = await tx.get(newPhoneRef);
    if (newPhoneSnap.exists && newPhoneSnap.data().uid !== uid) {
      throw new HttpsError("already-exists", "That phone number is already used by another account.");
    }
    if (oldPhone && oldPhone !== phone) {
      const oldRef = db.doc(`phoneIndex/${oldPhone}`);
      const oldSnap = await tx.get(oldRef);
      if (oldSnap.exists && oldSnap.data().uid === uid) tx.delete(oldRef);
    }
    tx.set(newPhoneRef, { uid, updatedAt: FieldValue.serverTimestamp() });
    tx.update(userRef, {
      name: name.trim(), phone, email: email.trim().toLowerCase(), status,
      updatedAt: FieldValue.serverTimestamp(), updatedBy: request.auth.uid
    });
  });
  await auth.updateUser(uid, { email: email.trim().toLowerCase() });
  return { ok: true };
});

exports.adminSetStudentPassword = onCall({ region: "asia-south1" }, async (request) => {
  requireAdmin(request);
  const { uid, newPassword } = request.data || {};
  validateStudent(uid);
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw new HttpsError("invalid-argument", "Password must contain at least 8 characters.");
  }
  await auth.updateUser(uid, { password: newPassword });
  return { ok: true };
});

exports.adminDeleteStudent = onCall({ region: "asia-south1" }, async (request) => {
  requireAdmin(request);
  const { uid } = request.data || {};
  validateStudent(uid);
  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().role !== "student") {
    throw new HttpsError("not-found", "Student profile not found.");
  }
  const phone = userSnap.data().phone;
  const batch = db.batch();
  batch.delete(userRef);
  batch.delete(db.doc(`presence/${uid}`));
  if (phone) batch.delete(db.doc(`phoneIndex/${phone}`));
  await batch.commit();
  const history = await db.collection("loginHistory").where("uid", "==", uid).get();
  for (let i = 0; i < history.docs.length; i += 400) {
    const b = db.batch();
    history.docs.slice(i, i + 400).forEach(d => b.delete(d.ref));
    await b.commit();
  }
  await auth.deleteUser(uid);
  return { ok: true };
});
