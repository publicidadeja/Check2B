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


exports.setCustomUserClaimsFirebase = functions.https.onCall(async (data, context) => {
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
   const callerUserRecord = await admin.auth().getUser(context.auth.uid);
   if (!callerUserRecord.customClaims || callerUserRecord.customClaims.role !== 'super_admin') {
     throw new functions.https.HttpsError(
       'permission-denied',
       'Você não tem permissão para executar esta ação (apenas Super Admin).'
     );
   }

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
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Super admin não deve ter um organizationId ou ele deve ser nulo.",
        );
    }
    claims.organizationId = null; // Ensure organizationId is explicitly set to null
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
    // Also update the user document in Firestore with the new role and orgId for consistency
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.update({
        role: claims.role,
        organizationId: claims.organizationId,
    }, { merge: true });
    console.log(\`Documento do usuário \${uid} atualizado no Firestore com novos claims.\`);

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

exports.createOrganizationAdmin = functions.https.onCall(async (data, context) => {
  // 1. Verify caller is Super Admin
  if (!context.auth || !context.auth.token || context.auth.token.role !== 'super_admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Apenas Super Admins podem criar administradores de organização.'
    );
  }

  const { name, email, password, organizationId } = data;

  // Validate input
  if (!name || !email || !password || !organizationId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Nome, email, senha e ID da organização são obrigatórios.'
    );
  }
  if (password.length < 6) {
     throw new functions.https.HttpsError(
      'invalid-argument',
      'A senha deve ter pelo menos 6 caracteres.'
    );
  }

  try {
    // 2. Create user in Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false, // Or true if you have an email verification flow
      disabled: false,
    });

    console.log('Novo admin de organização criado no Auth:', userRecord.uid);

    // 3. Set Custom Claims
    const claimsToSet = {
      role: 'admin',
      organizationId: organizationId,
    };
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log('Custom claims definidos para o novo admin:', claimsToSet);

    // 4. Create user profile in Firestore
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'admin',
      organizationId: organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active', // Or 'pending_verification' if email verification is used
    });
    console.log('Perfil do admin criado no Firestore:', userRecord.uid);

    // 5. Optionally, send a welcome email (implementation not shown here)
    // await sendWelcomeEmailToNewAdmin(email, name, organizationName);

    return {
      success: true,
      userId: userRecord.uid,
      message: `Administrador '${name}' criado com sucesso para a organização ${organizationId}.`,
    };
  } catch (error) {
    console.error('Erro ao criar admin de organização:', error);
    // Handle specific errors like 'auth/email-already-exists'
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new functions.https.HttpsError('internal', 'Falha ao criar administrador de organização.', error.message);
  }
});
