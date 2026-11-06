NIRU STUDY NOTES — FINAL GITHUB PAGES PACKAGE
================================================

This package is configured for your SECOND Firebase project:
Project ID: niru-study-notes
Admin UID: qeHYqJolAaO38gunIgBk8bv2lB93
Admin phone saved in the admin setup reference: 7483819617

WHAT IS INCLUDED
- Responsive Niru Study Notes website
- Supplied Niru Study Notes logo
- Supplied Built for More image as hero/music cover
- Supplied login-song.mpeg audio file with Play/Pause/Stop controls
- Student registration with name, phone, email and password
- Admin approval/rejection using your existing admin UID
- Student dashboard and semester 1–6 study library
- Admin PDF link publishing and deletion
- Email password recovery using Firebase
- Password change after login
- Admin login history page/section
- Firestore security rules

IMPORTANT LOGIN LIMITATION — PLEASE READ
This finished Spark/free-plan version uses Firebase Email/Password authentication:
- Students sign in using their registered EMAIL + password.
- Students provide their phone number at registration; it is stored in their profile.
- Forgot password sends a secure reset link to that registered email.
- This is the secure, no-paid-backend implementation.

You specifically requested phone-number + password sign-in. Firebase's client-only Spark setup cannot securely resolve a phone number to the account's private recovery email. Making a public phone-to-email lookup would expose students' email addresses and is not safe. Secure phone/password login plus email recovery needs a trusted backend (for example, a server/Cloud Function), which may require Firebase Blaze billing. This ZIP does NOT pretend to provide that insecure shortcut.

BEFORE UPLOADING TO GITHUB
1. Firebase Console > Authentication > Sign-in method:
   Enable Email/Password.
2. Keep your EXISTING admin Firebase Auth account and its UID:
   qeHYqJolAaO38gunIgBk8bv2lB93
   Do not delete it and do not create another admin.
3. Ensure the existing admin email is the one you will enter on the login page
   (the screenshots previously showed niranjan@gmail.com). Keep its current password.
4. Firebase Console > Firestore Database > Rules:
   Replace the rules with the contents of firestore.rules and click Publish.
5. GitHub: open your SECOND repository (not the first one).
   Upload the CONTENTS of this ZIP's niru-study-notes-final folder to the repository root:
   index.html, style.css, app.js, firestore.rules, README.txt, and assets folder.
6. GitHub repository > Settings > Pages:
   Deploy from branch -> main -> /(root) -> Save.
7. Wait for GitHub Pages to publish, then open the Pages URL.

ADMIN ACCESS
- Admin is identified only by the configured Firebase UID in app.js and firestore.rules.
- Sign in with the existing admin email/password account whose UID is above.
- The admin phone number is stored as a setup reference only; this secure free version does not use phone as the authentication identifier.

STUDENT REGISTRATION
- Student enters full name, 10-digit phone, email, password, confirmation.
- Firebase creates the account; Firestore stores profile with role=student and status=pending.
- Admin approves or rejects from Student Management.
- Approved students can access the Study Library.

PDF MATERIALS
- Paste a shareable Google Drive PDF URL.
- Set Drive sharing so students with the link can view, or use another publicly accessible PDF URL.
- Actual PDF file uploads are not implemented; this admin form stores a PDF link.

MUSIC
- Audio and cover image are local assets in the assets folder.
- Browser audio playback may require the user to press Play.

SECURITY / PRIVACY
- Do not share Firebase passwords with anyone.
- Firebase web config is designed to be present in frontend code; Firestore rules enforce access.
- Do not loosen the rules to public read/write.
- The website cannot be considered production-secure until you test registration, approval, recovery and access rules using test accounts.
- Existing first website and first Firebase project are not changed by these files.
