NIRU STUDY NOTES — PHONE + PASSWORD LOGIN UPDATE

This ZIP includes:
- Student login with 10-digit phone number + password.
- Registration with name, phone, email and password.
- Forgot password asks for the registered phone number and sends a Firebase password-reset email to that account's registered email.
- Phone-to-account mapping is stored in a private Firestore collection; Firestore rules deny all client access to it.
- Admin three-dot student menu: view information, edit name/phone/email/status, set a new password, delete profile and Firebase Authentication account.
- Existing admin UID retained: Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3.
- Admin phone configured as 7483819617.
- First website is not modified.

IMPORTANT — REQUIRED BACKEND DEPLOYMENT:
Phone/password sign-in and phone-based email recovery use Firebase callable Cloud Functions. The functions validate credentials using Firebase Authentication and never expose the private phone-to-email mapping to the browser.

1. Ensure Firebase Authentication Email/Password provider is enabled in project niru-study-notes.
2. Ensure Firestore is created in project niru-study-notes.
3. The Firebase project must be on the Blaze plan to deploy Cloud Functions. Charges depend on usage and other services; check Firebase pricing and configure a budget alert before deployment.
4. Install Node.js 20+ and Firebase CLI.
5. Open a terminal in this folder and run:
      firebase login
      firebase use niru-study-notes
      cd functions
      npm install
      cd ..
      firebase deploy --only functions,firestore:rules
6. Confirm the admin Firebase Authentication user exists in THIS second project and its UID is exactly:
      Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3
   The admin email account must have a password set in Firebase Authentication. Admin phone is configured as 7483819617.
7. Publish/deploy the included Firestore rules. Do not make phoneIndex publicly readable.
8. Upload the contents of the niru-study-notes-final folder to the ROOT of the second GitHub repository (not a nested folder), then wait for GitHub Pages deployment.

IMPORTANT EXISTING STUDENT ACCOUNTS:
The private phoneIndex mapping is created when a student registers after this update. Existing students registered before this update need their phoneIndex records backfilled securely before phone login works for them. They can re-register only if their old Auth account/profile has first been handled; do not create duplicate accounts. Existing student email/password credentials remain in Firebase Auth and are not converted or reset by this ZIP.

PASSWORD RECOVERY:
Firebase's password-reset email template and authorized domains must be configured in Firebase Authentication. The reset email goes to the email address stored in the student's Firebase Authentication account.

SECURITY:
- Do not publish phoneIndex documents to clients.
- The backend validates phone/password against Firebase Authentication before minting a custom token.
- Passwords are not stored in Firestore.
- Admin-only actions validate the configured admin UID.
- This package is not deployed automatically; you must deploy the included Cloud Functions and rules.
