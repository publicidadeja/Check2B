// functions/index.js
// Force re-deploy: v1.0.5
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const util = require("util"); // Importar o módulo util

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Sets custom user claims (role, organizationId) for a given user UID.
 * Can only be called by an authenticated user (preferably a Super Admin).
 */
exports.setCustomUserClaimsFirebase = functions.https.onCall(async (data, context) => {
  console.log('[setCustomUserClaimsFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[setCustomUserClaimsFirebase] Caller UID: ${context.auth?.uid || 'N/A'}`);
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
    console.log('[setCustomUserClaimsFirebase] Caller token claims (decoded):');
    for (const key in context.auth.token) {
        if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
            try {
                const value = context.auth.token[key];
                console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
            } catch (e) {
                console.log(`  ${key}: [Could not stringify value for this claim]`);
            }
        }
    }
  } else if (context.auth && context.auth.token) {
      console.log('[setCustomUserClaimsFirebase] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
  } else {
      console.log('[setCustomUserClaimsFirebase] Caller token (context.auth.token) is undefined or null.');
  }

  if (!context.auth) {
    console.error("[setCustomUserClaimsFirebase] Unauthenticated: No auth context.");
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerUid = context.auth.uid;
  const callerClaims = context.auth.token || {};

  if (callerClaims.role !== 'super_admin') {
    console.error(`[setCustomUserClaimsFirebase] Permission denied for UID: ${callerUid}. Role received: ${callerClaims.role || 'N/A'}`);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem definir claims diretamente.');
  }
  console.log('[setCustomUserClaimsFirebase] Permission GRANTED for Super Admin.');

  const { uid, claims } = data;

  if (!uid || typeof uid !== "string") {
    throw new functions.https.HttpsError("invalid-argument", "O UID do usuário deve ser uma string não vazia.");
  }
  if (!claims || typeof claims !== "object") {
    throw new functions.https.HttpsError("invalid-argument", "Os claims devem ser um objeto.");
  }
  if (claims.role && !['super_admin', 'admin', 'collaborator'].includes(claims.role)) {
    throw new functions.https.HttpsError("invalid-argument", "O papel (role) fornecido é inválido.");
  }
  if (claims.role === 'super_admin') {
    if (claims.organizationId !== undefined && claims.organizationId !== null) {
      throw new functions.https.HttpsError("invalid-argument", "Super admin não deve ter um organizationId.");
    }
    claims.organizationId = null;
  } else if ((claims.role === 'admin' || claims.role === 'collaborator') && (!claims.organizationId || typeof claims.organizationId !== 'string')) {
    throw new functions.https.HttpsError("invalid-argument", "OrganizationId é obrigatório e deve ser uma string para admin/collaborator.");
  }

  try {
    console.log(`[setCustomUserClaimsFirebase] Attempting to set claims for UID ${uid}:`, claims);
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`[setCustomUserClaimsFirebase] Custom claims set successfully for UID ${uid}.`);

    const userDocRef = admin.firestore().collection('users').doc(uid);
    console.log(`[setCustomUserClaimsFirebase] Attempting to update Firestore for UID ${uid}.`);
    await userDocRef.set({
        role: claims.role,
        organizationId: claims.organizationId,
    }, { merge: true });
    console.log(`[setCustomUserClaimsFirebase] Firestore updated successfully for UID ${uid}.`);

    return { success: true, message: `Sucesso! Custom claims ${JSON.stringify(claims)} definidos para o usuário ${uid}` };
  } catch (error) {
    console.error("[setCustomUserClaimsFirebase] CRITICAL ERROR setting claims or updating Firestore:", error);
    const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
    throw new functions.https.HttpsError("internal", `Não foi possível definir os custom claims. Detalhe: ${errorMessage}`);
  }
});


exports.createOrganizationAdmin = functions.https.onCall(async (data, context) => {
  console.log('[createOrganizationAdmin] Function called with data:', JSON.stringify(data));
  console.log(`[createOrganizationAdmin] Caller UID: ${context.auth?.uid || 'N/A'}`);
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
    console.log('[createOrganizationAdmin] Caller token claims (decoded):');
    for (const key in context.auth.token) {
        if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
            try {
                const value = context.auth.token[key];
                console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
            } catch (e) {
                console.log(`  ${key}: [Could not stringify value for this claim]`);
            }
        }
    }
  } else if (context.auth && context.auth.token) {
      console.log('[createOrganizationAdmin] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
  } else {
      console.log('[createOrganizationAdmin] Caller token (context.auth.token) is undefined or null.');
  }
  console.log('[createOrganizationAdmin] App Check token verification status (context.app):', JSON.stringify(context.app));


  if (!context.auth || !context.auth.token) {
    console.error('[createOrganizationAdmin] Unauthenticated: No auth context or token.');
    throw new functions.https.HttpsError('unauthenticated', 'Ação requer autenticação.');
  }
  
  const callerClaims = context.auth.token || {};
  if (callerClaims.role !== 'super_admin') {
    const callerUid = context.auth.uid || 'N/A'; // Safe access to uid
    const receivedRole = callerClaims.role || 'N/A (role missing in token)';
    console.error(`[createOrganizationAdmin] PERMISSION DENIED. Caller UID: ${callerUid}. Role received: ${receivedRole}. Expected 'super_admin'.`);
    if (context.auth.token) { // Log the token only if it exists
        console.log('[createOrganizationAdmin] Denied token claims (decoded):', context.auth.token);
    }
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem criar administradores de organização.');
  }
  console.log('[createOrganizationAdmin] Permissão de Super Admin CONCEDIDA, prosseguindo...');

  const { name, email, password, organizationId } = data;

  if (!name || !email || !password || !organizationId) {
    throw new functions.https.HttpsError('invalid-argument', 'Nome, email, senha e ID da organização são obrigatórios.');
  }
  if (password.length < 6) {
     throw new functions.https.HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
  }

  let userRecord;
  try {
    console.log(`[createOrganizationAdmin] Attempting to create user in Auth for email: ${email}`);
    userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false,
    });
    console.log(`[createOrganizationAdmin] User created in Auth successfully. UID: ${userRecord.uid}`);
  } catch (authError) {
    console.error('[createOrganizationAdmin] ERROR creating user in Auth:', authError);
    const errorMessage = (authError && typeof authError === 'object' && 'message' in authError) ? String(authError.message) : String(authError);
    if ((authError && typeof authError === 'object' && 'code' in authError) && authError.code === 'auth/email-already-exists') {
        throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new functions.https.HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${errorMessage}`);
  }

  try {
    const claimsToSet = { role: 'admin', organizationId: organizationId };
    console.log(`[createOrganizationAdmin] Attempting to set custom claims for UID ${userRecord.uid}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log(`[createOrganizationAdmin] Custom claims set successfully for UID ${userRecord.uid}.`);
  } catch (claimsError) {
    console.error(`[createOrganizationAdmin] ERROR setting custom claims for UID ${userRecord.uid}:`, claimsError);
    const errorMessage = (claimsError && typeof claimsError === 'object' && 'message' in claimsError) ? String(claimsError.message) : String(claimsError);
    throw new functions.https.HttpsError('internal', `Falha ao definir custom claims. Detalhe: ${errorMessage}`);
  }

  try {
    const userProfileData = {
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'admin',
      organizationId: organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
    };
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    console.log(`[createOrganizationAdmin] Attempting to create user profile in Firestore for UID ${userRecord.uid}.`);
    await userDocRef.set(userProfileData);
    console.log(`[createOrganizationAdmin] User profile created in Firestore for UID ${userRecord.uid}.`);
  } catch (firestoreError) {
    console.error(`[createOrganizationAdmin] ERROR creating user profile in Firestore for UID ${userRecord.uid}:`, firestoreError);
    const errorMessage = (firestoreError && typeof firestoreError === 'object' && 'message' in firestoreError) ? String(firestoreError.message) : String(firestoreError);
    throw new functions.https.HttpsError('internal', `Falha ao criar perfil do usuário no Firestore. Detalhe: ${errorMessage}`);
  }

  return { success: true, userId: userRecord.uid, message: `Administrador '${name}' criado com sucesso para a organização ${organizationId}.` };
});


exports.createOrganizationUser = functions.https.onCall(async (data, context) => {
    console.log('[createOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log(`[createOrganizationUser] Caller UID: ${context.auth?.uid || 'N/A'}`);
    if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
        console.log('[createOrganizationUser] Caller token claims (decoded):');
        for (const key in context.auth.token) {
            if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
                 try {
                    const value = context.auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
                }
            }
        }
    } else if (context.auth && context.auth.token) {
        console.log('[createOrganizationUser] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
    } else {
        console.log('[createOrganizationUser] Caller token (context.auth.token) is undefined or null.');
    }

    if (!context.auth || !context.auth.token) {
        console.error('[createOrganizationUser] Unauthenticated or token missing.');
        throw new functions.https.HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
    }
    
    const callerClaims = context.auth.token || {};
    const { name, email, password, organizationId, department, role: userRole, photoUrl, admissionDate, status = 'active' } = data;

    const isAdminOfOrg = callerClaims.role === 'admin' && callerClaims.organizationId === organizationId;
    const isSuperAdmin = callerClaims.role === 'super_admin';

    if (!isAdminOfOrg && !isSuperAdmin) {
        console.error(`[createOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, Caller orgId: ${callerClaims.organizationId}, Target orgId: ${organizationId}`);
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para criar usuários para esta organização.');
    }
    console.log('[createOrganizationUser] Permission GRANTED.');

    if (!name || !email || !password || !organizationId || !userRole || !department || !admissionDate) {
        throw new functions.https.HttpsError('invalid-argument', 'Campos obrigatórios: nome, email, senha, ID da organização, função, departamento, data de admissão.');
    }
    if (password.length < 6) {
        throw new functions.https.HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
    }

    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name,
            photoURL: photoUrl || null,
            emailVerified: false, 
        });
        console.log(`[createOrganizationUser] Novo colaborador ${userRecord.uid} criado no Firebase Auth.`);

        const claimsToSet = { role: 'collaborator', organizationId: organizationId };
        await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
        console.log('[createOrganizationUser] Custom claims definidos para novo colaborador:', claimsToSet);

        const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
        await userDocRef.set({
            uid: userRecord.uid,
            name: name,
            email: email,
            role: 'collaborator', 
            organizationId: organizationId,
            department: department,
            userRole: userRole, 
            admissionDate: admissionDate,
            photoUrl: photoUrl || null,
            status: status, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('[createOrganizationUser] Perfil do colaborador criado no Firestore:', userRecord.uid);

        return { success: true, userId: userRecord.uid, message: `Colaborador '${name}' criado com sucesso.` };
    } catch (error) {
        console.error('[createOrganizationUser] CRITICAL ERROR creating user:', error);
        const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
        if ((error && typeof error === 'object' && 'code' in error) && error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
        }
        throw new functions.https.HttpsError('internal', `Falha ao criar colaborador. Detalhe: ${errorMessage}`);
    }
});


exports.deleteOrganizationUser = functions.https.onCall(async (data, context) => {
    console.log('[deleteOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log(`[deleteOrganizationUser] Caller UID: ${context.auth?.uid || 'N/A'}`);
     if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
        console.log('[deleteOrganizationUser] Caller token claims (decoded):');
        for (const key in context.auth.token) {
            if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
                 try {
                    const value = context.auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
                }
            }
        }
    } else if (context.auth && context.auth.token) {
        console.log('[deleteOrganizationUser] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
    } else {
        console.log('[deleteOrganizationUser] Caller token (context.auth.token) is undefined or null.');
    }

    if (!context.auth || !context.auth.token) {
        console.error('[deleteOrganizationUser] Unauthenticated or token missing.');
        throw new functions.https.HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    
    const callerClaims = context.auth.token || {};
    const { userId, organizationId: targetOrganizationId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
    }
    
    let userToDeleteRecord;
    try {
        userToDeleteRecord = await admin.auth().getUser(userId);
    } catch (error) {
        console.error(`[deleteOrganizationUser] Error fetching user to delete (UID: ${userId}):`, error);
        const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
        throw new functions.https.HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${errorMessage}`);
    }
    const userToDeleteClaims = userToDeleteRecord.customClaims || {};

    const isSuperAdmin = callerClaims.role === 'super_admin';
    const isAdminDeletingCollaboratorInOwnOrg = 
        callerClaims.role === 'admin' &&
        callerClaims.organizationId === targetOrganizationId &&
        userToDeleteClaims.organizationId === targetOrganizationId &&
        userToDeleteClaims.role === 'collaborator';

    if (!isSuperAdmin && !isAdminDeletingCollaboratorInOwnOrg) {
        console.error(`[deleteOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, User to delete role: ${userToDeleteClaims.role}`);
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
    }
    console.log('[deleteOrganizationUser] Permission GRANTED.');

    try {
        await admin.auth().deleteUser(userId);
        console.log(`[deleteOrganizationUser] Usuário ${userId} removido do Firebase Auth.`);

        const userDocRef = admin.firestore().collection('users').doc(userId);
        await userDocRef.delete();
        console.log(`[deleteOrganizationUser] Documento do usuário ${userId} removido do Firestore.`);

        return { success: true, message: `Usuário ${userId} removido com sucesso.` };
    } catch (error) {
        console.error(`[deleteOrganizationUser] CRITICAL ERROR deleting user ${userId}:`, error);
        const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
        throw new functions.https.HttpsError('internal', `Falha ao remover usuário. Detalhe: ${errorMessage}`);
    }
});


exports.toggleUserStatusFirebase = functions.https.onCall(async (data, context) => {
  console.log('[toggleUserStatusFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[toggleUserStatusFirebase] Caller UID: ${context.auth?.uid || 'N/A'}`);
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
    console.log('[toggleUserStatusFirebase] Caller token claims (decoded):');
    for (const key in context.auth.token) {
        if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
            try {
                const value = context.auth.token[key];
                console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
            } catch (e) {
                console.log(`  ${key}: [Could not stringify value for this claim]`);
            }
        }
    }
  } else if (context.auth && context.auth.token) {
      console.log('[toggleUserStatusFirebase] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
  } else {
      console.log('[toggleUserStatusFirebase] Caller token (context.auth.token) is undefined or null.');
  }
  
  if (!context.auth || !context.auth.token) {
    console.error('[toggleUserStatusFirebase] Unauthenticated or token missing.');
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerClaims = context.auth.token || {};
  const { userId, status } = data;

  if (!userId || !status || !['active', 'inactive'].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios.");
  }

  let userToUpdateRecord;
  try {
      userToUpdateRecord = await admin.auth().getUser(userId);
  } catch (error) {
      console.error(`[toggleUserStatusFirebase] Error fetching user to update (UID: ${userId}):`, error);
      const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
      throw new functions.https.HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${errorMessage}`);
  }
  const userToUpdateClaims = userToUpdateRecord.customClaims || {};

  const isSuperAdmin = callerClaims.role === 'super_admin';
  const isAdminManagingOwnOrgUser = 
      callerClaims.role === 'admin' &&
      callerClaims.organizationId &&
      callerClaims.organizationId === userToUpdateClaims.organizationId;

  if (!isSuperAdmin && !isAdminManagingOwnOrgUser) {
    console.error(`[toggleUserStatusFirebase] Permission denied. Caller role: ${callerClaims.role}, Target user org: ${userToUpdateClaims.organizationId}, Caller org: ${callerClaims.organizationId}`);
    throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para alterar o status deste usuário.');
  }
   console.log('[toggleUserStatusFirebase] Permission GRANTED.');

  try {
    await admin.firestore().collection('users').doc(userId).update({ status: status });
    await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

    console.log(`[toggleUserStatusFirebase] Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
    return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    console.error("[toggleUserStatusFirebase] CRITICAL ERROR updating user status:", error);
    const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
    throw new functions.https.HttpsError("internal", `Falha ao alterar status do usuário. Detalhe: ${errorMessage}`);
  }
});


exports.removeAdminFromOrganizationFirebase = functions.https.onCall(async (data, context) => {
    console.log('[removeAdminFromOrganizationFirebase] Function called with data:', JSON.stringify(data));
    console.log(`[removeAdminFromOrganizationFirebase] Caller UID: ${context.auth?.uid || 'N/A'}`);
    if (context.auth && context.auth.token && typeof context.auth.token === 'object') {
        console.log('[removeAdminFromOrganizationFirebase] Caller token claims (decoded):');
        for (const key in context.auth.token) {
            if (Object.prototype.hasOwnProperty.call(context.auth.token, key)) {
                 try {
                    const value = context.auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
                }
            }
        }
    } else if (context.auth && context.auth.token) {
        console.log('[removeAdminFromOrganizationFirebase] Caller token (RAW, not an object, or unexpected type):', context.auth.token);
    } else {
        console.log('[removeAdminFromOrganizationFirebase] Caller token (context.auth.token) is undefined or null.');
    }

    if (!context.auth || !context.auth.token) {
        console.error('[removeAdminFromOrganizationFirebase] Unauthenticated or token missing.');
        throw new functions.https.HttpsError('unauthenticated', 'Ação requer autenticação.');
    }
    
    const callerClaims = context.auth.token || {};
    if (callerClaims.role !== 'super_admin') {
        console.error(`[removeAdminFromOrganizationFirebase] Permission denied. Caller UID: ${context.auth.uid}. Role received: ${callerClaims.role || 'N/A'}`);
        throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem remover administradores de organização.');
    }
    console.log('[removeAdminFromOrganizationFirebase] Permission GRANTED for Super Admin.');

    const { userId, organizationId } = data;
    if (!userId || !organizationId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios.');
    }

    try {
        const userRecord = await admin.auth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};

        if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
            const newClaims = { role: 'collaborator', organizationId: organizationId }; // Example: Demote to collaborator
            
            console.log(`[removeAdminFromOrganizationFirebase] Attempting to update claims for UID ${userId} to:`, newClaims);
            await admin.auth().setCustomUserClaims(userId, newClaims);
            console.log(`[removeAdminFromOrganizationFirebase] Custom claims updated successfully for UID ${userId}.`);

            console.log(`[removeAdminFromOrganizationFirebase] Attempting to update Firestore role for UID ${userId}.`);
            await admin.firestore().collection('users').doc(userId).update({
                role: newClaims.role,
            });
            console.log(`[removeAdminFromOrganizationFirebase] Firestore role updated successfully for UID ${userId}.`);
            
            return { success: true, message: `Admin ${userId} removido/rebaixado na organização ${organizationId}.` };
        } else {
            console.log(`[removeAdminFromOrganizationFirebase] Usuário ${userId} não é admin da organização ${organizationId} ou claims estão inconsistentes. Current claims:`, currentClaims);
            throw new functions.https.HttpsError('not-found', 'Usuário não é administrador desta organização ou claims inconsistentes.');
        }
    } catch (error) {
        console.error(`[removeAdminFromOrganizationFirebase] CRITICAL ERROR removing admin ${userId} from org ${organizationId}:`, error);
        const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
        throw new functions.https.HttpsError('internal', `Falha ao remover admin da organização. Detalhe: ${errorMessage}`);
    }
});
