/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// It's generally safe to call initializeApp() without arguments if the
// GOOGLE_APPLICATION_CREDENTIALS environment variable is set correctly in your Cloud Functions environment,
// or if the project is already configured via the Firebase CLI during deploy.
// If you need to initialize it with specific options (e.g., service account), you can do so.
if (admin.apps.length === 0) {
  admin.initializeApp();
}


exports.setCustomUserClaims = functions.https.onCall(async (data, context) => {
  // Ensure the caller is authenticated.
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "A função só pode ser chamada por usuários autenticados.",
    );
  }

  // TODO: IMPORTANT - Add authorization logic here!
  // Check if context.auth.uid has permission to set claims for data.uid
  // For example, check if the caller is a super_admin.
  // const callerUserRecord = await admin.auth().getUser(context.auth.uid);
  // if (callerUserRecord.customClaims && callerUserRecord.customClaims.role !== 'super_admin') {
  //   throw new functions.https.HttpsError(
  //     'permission-denied',
  //     'Você não tem permissão para executar esta ação.'
  //   );
  // }

  const { uid, claims } = data;

  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "O UID do usuário deve ser uma string não vazia.",
    );
  }
  if (!claims || typeof claims !== "object") {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Os claims devem ser um objeto.",
    );
  }

  // Basic validation for role and organizationId if they are part of claims
  if (claims.role && !['super_admin', 'admin', 'collaborator'].includes(claims.role)) {
    throw new functions.https.HttpsError(
        "invalid-argument",
        "O papel (role) fornecido é inválido.",
    );
  }

  // Specific logic for organizationId based on role
  if (claims.role === 'super_admin') {
    if (claims.organizationId !== undefined && claims.organizationId !== null) {
        // Super admins should not have an organizationId, or it should be explicitly null
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Super admin não deve ter um organizationId ou ele deve ser nulo.",
        );
    }
    // Ensure organizationId is explicitly set to null for super_admin if not already
    claims.organizationId = null;
  } else if (claims.role === 'admin' || claims.role === 'collaborator') {
    if (typeof claims.organizationId !== 'string' || !claims.organizationId.trim()) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            `OrganizationId é obrigatório e deve ser uma string não vazia para o papel ${claims.role}.`,
        );
    }
  }


  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(\`Custom claims definidos para \${uid}:\`, claims);
    return {
      message: \`Sucesso! Custom claims \${JSON.stringify(claims)} definidos para o usuário \${uid}.\`,
    };
  } catch (error) {
    console.error("Erro ao definir custom claims:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Não foi possível definir os custom claims.",
      error,
    );
  }
});

// Example: Create a user (auth only, Firestore doc separate) and set claims
// This would typically be part of a larger user creation/management flow
// For simplicity, this example assumes the user already exists in Firebase Auth
// and you're just setting/updating claims.

// If you need a function to create a user AND set claims:
// exports.createUserAndSetClaims = functions.https.onCall(async (data, context) => {
//   // ... (auth and permission checks as above) ...
//   const { email, password, displayName, role, organizationId } = data;
//   try {
//     const userRecord = await admin.auth().createUser({
//       email: email,
//       password: password,
//       displayName: displayName,
//       // photoURL: data.photoURL, // Optional
//       disabled: false,
//     });
//     const claimsToSet = { role, organizationId: role === 'super_admin' ? null : organizationId };
//     await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);

//     // Create user document in Firestore (example)
//     await admin.firestore().collection('users').doc(userRecord.uid).set({
//       name: displayName,
//       email: email,
//       role: role,
//       organizationId: claimsToSet.organizationId,
//       createdAt: admin.firestore.FieldValue.serverTimestamp(),
//       status: 'active' // or 'pending'
//     });

//     return { uid: userRecord.uid, message: 'Usuário criado e claims definidos com sucesso.' };
//   } catch (error) {
//     console.error("Erro ao criar usuário e definir claims:", error);
//     throw new functions.https.HttpsError("internal", "Falha ao criar usuário.");
//   }
// });
