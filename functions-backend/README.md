# Firebase Functions — Express PRO


## What this includes
- Express app mounted as a single https function: `exports.api`
- Routes: `/orders`, `/menu`
- Middleware: auth (Firebase ID tokens + admin checks), centralized error handler, logging
- Validation with Zod


## Deploy
1. make sure you have Firebase CLI installed and logged in
2. in `functions/` run `npm install`
3. `firebase deploy --only functions`


## Local development
- Use Firebase Emulator: `firebase emulators:start --only functions`
- Or run `npm run dev` (requires nodemon) for quick smoke testing (not identical to emulator)


## Admin claim
To mark a user as admin, use admin SDK in a trusted environment:


```js
// example
await admin.auth().setCustomUserClaims(uid, { admin: true });