# Niru Study Notes — New Website Demo

This is a **front-end prototype only** for the separate second website.

## Included screens
- Student phone-number login
- New student registration request
- Forgot-password request to admin
- Student dashboard and password-change request
- Admin dashboard for student approvals/rejections
- Admin review of password requests
- Admin-initiated password reset instruction

## Important
This prototype does **not** connect to Firebase. Its demo actions exist only in the current browser session. It does not create accounts, change real passwords, send SMS, or share records with your existing website.

Do not publish it as a working authentication system yet. Before production, connect it to your existing Firebase project using secure Firebase Authentication and trusted backend functions / approved security rules. Never store passwords in Firestore or send proposed passwords to the admin.

## Publish as a separate GitHub Pages site
1. Create a new GitHub repository, for example `niru-study-notes-phone`.
2. Upload `index.html`, `style.css`, and `app.js` to the repository root.
3. Open **Settings → Pages**.
4. Select **Deploy from a branch**, choose `main` and `/ (root)`, then Save.
5. GitHub will provide the new website URL. Your old repository and old website remain unchanged.

The existing Firebase project can be connected later, after the backend and authentication migration are configured safely.
