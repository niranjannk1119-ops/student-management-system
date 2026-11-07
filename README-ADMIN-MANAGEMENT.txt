NIRU STUDY NOTES — ADMIN STUDENT MANAGEMENT UPDATE

Included:
- Three-dot (⋮) menu for every student in the admin student list.
- Student Information view.
- Edit name, phone, email and approval status.
- Admin password reset (set a new password).
- Delete student profile, presence record, login history and Firebase Authentication account.
- Existing study materials and student presence/history dashboard retained.

IMPORTANT SETUP:
1. This package still uses the existing email + password Firebase client login and email-based password recovery.
   It does NOT yet implement phone-number + password login. That requires a separate secure login backend.
2. The three privileged admin actions use Firebase callable Cloud Functions in /functions.
3. Deploying Cloud Functions generally requires switching the Firebase project to the Blaze billing plan.
   Usage may fall within free allowances, but a billing account is required. Review current Firebase pricing before enabling.
4. In the second Firebase project (niru-study-notes), install Firebase CLI, then from this folder run:
      firebase login
      firebase use niru-study-notes
      cd functions
      npm install
      cd ..
      firebase deploy --only functions,firestore:rules
5. The administrator account must be signed in with UID:
      Kbh5nTxWNgf2ObLIXfGhJ5O4YfG3
6. The old admin UID has been removed from the Firestore rules. Keep the new UID account active.
7. Never make student records public. The Cloud Functions verify the admin UID before changing Firebase Authentication accounts.

This update edits only the second project package. It does not change your first website.
