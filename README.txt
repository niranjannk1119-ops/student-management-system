NIRU STUDY NOTES — EMAIL LOGIN / FIREBASE SPARK PACKAGE
=====================================================

Firebase project: niru-study-notes
Admin UID configured in app.js and firestore.rules: Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3

AUTHENTICATION FEATURES
- Login: registered email address + password.
- Registration: full name, email address, password and confirmation. Phone number has been removed from student registration.
- Forgot password: student enters the registered email address; Firebase sends a password-reset link.
- New registrations remain pending until the administrator approves them.
- Existing student accounts with email/password can continue to sign in. Existing old profile phone fields are ignored by this version.

FREE-PLAN NOTE
This version uses Firebase Authentication Email/Password and Firestore directly from the website. It does not call or deploy Cloud Functions. It is designed for the Firebase Spark plan, subject to Firebase's free-tier quotas.

ADMIN FEATURES
- Approve/reject student registrations.
- View student information and edit student name/status. Email is shown read-only because changing the Authentication email securely requires a separate account-management flow.
- Add and remove study material links.
- View student presence and login history.
- Admin password reset is performed through Firebase Authentication's email reset flow, not by exposing passwords in the admin panel.

DEPLOYMENT
1. Firebase Console > Authentication > Sign-in method: enable Email/Password.
2. Firebase Console > Authentication > Settings > Authorized domains: ensure your GitHub Pages domain is listed.
3. Firebase Console > Firestore Database > Rules: publish the included firestore.rules.
4. Upload the CONTENTS of this folder to the ROOT of your second GitHub repository: student-management-system. Do not upload the folder as a nested directory.
5. GitHub repository > Settings > Pages: deploy from main branch and /(root).
6. Wait for GitHub Pages to publish.

IMPORTANT ADMIN CHECK
The admin account must exist in the niru-study-notes Firebase project with this exact UID: Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3. Sign in using that account's own email and password.

This package does not modify your first website or first Firebase project.

Website hero background: assets/nature-sunrise-background.png (provided nature sunrise image).


LATEST VISUAL UPDATE
- Login, registration and forgot-password screens use the sunrise nature image as a full-screen background with a glass-style form card.
- After student login, the student dashboard displays the Golden Valley stream sunset image.
- Admin student three-dot menu includes Information, Edit details and Delete profile. Delete profile removes Firestore user profile, presence and login-history records. It does not delete the Firebase Authentication account; that requires a trusted backend with Admin SDK privileges.
