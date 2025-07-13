
// functions/index.js
// Force re-deploy: v1.0.10
const admin = require("firebase-admin");
const util = require("util");
const {onDocumentWritten, onDocumentCreated} = require("firebase-functions/v2/firestore");

// Importações para Firebase Functions v2
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2/options");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Definir opções globais para todas as funções v2 (ex: região)
setGlobalOptions({region: "us-central1"});

/**
 * Sets custom user claims (role, organizationId) for a given user UID.
 * Can only be called by an authenticated user (preferably a Super Admin).
 */
exports.setCustomUserClaimsFirebase = onCall({
    enforceAppCheck: true, 
}, async (request) => {
  const data = request.data;
  const auth = request.auth;
  const app = request.app; 

  console.log('[setCustomUserClaimsFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[setCustomUserClaimsFirebase] Caller UID: ${auth?.uid || 'N/A'}`);
  if (auth && auth.token && typeof auth.token === 'object') {
      console.log('[setCustomUserClaimsFirebase] Caller token claims (decoded):');
      for (const key in auth.token) {
          if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
              try {
                  const value = auth.token[key];
                  console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value, {depth: 2}) : value}`);
              } catch (e) {
                  console.log(`  ${key}: [Could not stringify/inspect value for this claim]`);
              }
          }
      }
  } else if (auth && auth.token) {
      console.log('[setCustomUserClaimsFirebase] Caller token (RAW, not an object, or unexpected type):', auth.token);
  } else {
      console.log('[setCustomUserClaimsFirebase] Caller token (auth.token) is undefined or null.');
  }
  console.log('[setCustomUserClaimsFirebase] App Check token verification status (request.app):', util.inspect(app, { depth: null }));


  if (!auth) {
    throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  // App Check verification: request.app will be undefined if token is missing or invalid.
  if (app === undefined) {
    console.error("[setCustomUserClaimsFirebase] App Check token missing or invalid. Throwing unauthenticated.");
    throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
  }


  const callerUid = auth.uid;
  let callerClaims = auth.token || {};

  if (!callerClaims || Object.keys(callerClaims).length === 0) {
    console.warn('[setCustomUserClaimsFirebase] Caller token is empty or missing. Fetching user record for claims for UID:', callerUid);
    try {
        const callerUserRecord = await admin.auth().getUser(callerUid);
        callerClaims = callerUserRecord.customClaims || {};
        console.log('[setCustomUserClaimsFirebase] Fetched custom claims for caller:', JSON.stringify(callerClaims));
    } catch (fetchError) {
        const err = fetchError;
        console.error('[setCustomUserClaimsFirebase] Error fetching caller user record:', err);
        throw new HttpsError('internal', `Não foi possível verificar as permissões do chamador. ${(err instanceof Error ? err.message : String(err))}`);
    }
  }

  if (callerClaims.role !== 'super_admin') {
    console.error(`[setCustomUserClaimsFirebase] Permission denied for UID: ${callerUid}. Claims: ${JSON.stringify(callerClaims)}`);
    throw new HttpsError('permission-denied', 'Apenas Super Admins podem definir claims diretamente.');
  }

  const { uid, claims } = data;

  if (!uid || typeof uid !== "string") {
    throw new HttpsError("invalid-argument", "O UID do usuário deve ser uma string não vazia.");
  }
  if (!claims || typeof claims !== "object") {
    throw new HttpsError("invalid-argument", "Os claims devem ser um objeto.");
  }
  if (claims.role && !['super_admin', 'admin', 'collaborator'].includes(claims.role)) {
    throw new HttpsError("invalid-argument", "O papel (role) fornecido é inválido.");
  }
  if (claims.role === 'super_admin') {
    if (claims.organizationId !== undefined && claims.organizationId !== null) {
      throw new HttpsError("invalid-argument", "Super admin não deve ter um organizationId.");
    }
    claims.organizationId = null;
  } else if ((claims.role === 'admin' || claims.role === 'collaborator') && (!claims.organizationId || typeof claims.organizationId !== 'string')) {
    throw new HttpsError("invalid-argument", "OrganizationId é obrigatório e deve ser uma string para admin/collaborator.");
  }

  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`[setCustomUserClaimsFirebase] Custom claims definidos para ${uid}:`, claims);

    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.set({
        role: claims.role,
        organizationId: claims.organizationId,
    }, { merge: true });
    console.log(`[setCustomUserClaimsFirebase] Documento do usuário ${uid} atualizado no Firestore com novos claims.`);

    return { success: true, message: `Sucesso! Custom claims ${JSON.stringify(claims)} definidos para o usuário ${uid}` };
  } catch (error) {
    const err = error;
    console.error("[setCustomUserClaimsFirebase] CRITICAL ERROR setting claims or updating Firestore:", err);
    throw new HttpsError("internal", `Não foi possível definir os custom claims. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
  }
});


exports.createOrganizationAdmin = onCall({
    enforceAppCheck: true,
}, async (request) => {
  const data = request.data;
  const auth = request.auth;
  const app = request.app; // App Check token context

  console.log('[createOrganizationAdmin] Function called with data:', JSON.stringify(data));
  console.log('[createOrganizationAdmin] Full context object keys:', Object.keys(request));
  console.log('[createOrganizationAdmin] context.auth (decoded token claims):', util.inspect(auth?.token, { depth: null }));
  console.log('[createOrganizationAdmin] context.app (App Check token verification):', util.inspect(app, { depth: null }));

  if (!auth) {
    console.error('[createOrganizationAdmin] Unauthenticated. Auth object missing.');
    throw new HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
  }

  // App Check verification: request.app will be undefined if token is missing or invalid.
  if (app === undefined) {
    console.error("[createOrganizationAdmin] App Check token missing or invalid. Throwing unauthenticated.");
    throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
  }

  let hasSuperAdminRole = false;
  if (auth.token && typeof auth.token === 'object' && auth.token.role === 'super_admin') {
      hasSuperAdminRole = true;
  }

  if (!hasSuperAdminRole) {
    const callerUid = auth?.uid || 'N/A';
    const receivedRole = auth?.token?.role || 'N/A (token or role missing)';
    console.error(`[createOrganizationAdmin] PERMISSION DENIED. Caller UID: ${callerUid}. Role recebida: ${receivedRole}. Esperado 'super_admin'.`);
    throw new HttpsError('permission-denied', 'Apenas Super Admins podem criar administradores de organização.');
  }

  console.log('[createOrganizationAdmin] Permissão de Super Admin CONCEDIDA, prosseguindo...');

  const { name, email, password, organizationId } = data;

  if (!name || !email || !password || !organizationId) {
    throw new HttpsError('invalid-argument', 'Nome, email, senha e ID da organização são obrigatórios.');
  }
  if (password.length < 6) {
     throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
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
    const err = authError;
    console.error('[createOrganizationAdmin] ERROR creating user in Auth:', err);
    if (err.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
  }

  try {
    const claimsToSet = { role: 'admin', organizationId: organizationId };
    console.log(`[createOrganizationAdmin] Attempting to set custom claims for UID ${userRecord.uid}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log(`[createOrganizationAdmin] Custom claims set successfully for UID ${userRecord.uid}.`);
  } catch (claimsError) {
    const err = claimsError;
    console.error(`[createOrganizationAdmin] ERROR setting custom claims for UID ${userRecord.uid}:`, err);
    throw new HttpsError('internal', `Falha ao definir custom claims. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
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
    const err = firestoreError;
    console.error(`[createOrganizationAdmin] ERROR creating user profile in Firestore for UID ${userRecord.uid}:`, err);
    throw new HttpsError('internal', `Falha ao criar perfil do usuário no Firestore. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
  }

  return { success: true, userId: userRecord.uid, message: `Administrador '${name}' criado com sucesso para a organização ${organizationId}.` };
});


exports.createOrganizationUser = onCall({
    enforceAppCheck: true,
}, async (request) => {
    const data = request.data;
    const auth = request.auth;
    const app = request.app;

    console.log('[createOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log(`[createOrganizationUser] Caller UID: ${auth?.uid || 'N/A'}`);
      if (auth && auth.token && typeof auth.token === 'object') {
          console.log('[createOrganizationUser] Caller token claims (decoded):');
          for (const key in auth.token) {
              if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
                   try {
                      const value = auth.token[key];
                      console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value, {depth: 2}) : value}`);
                  } catch (e) {
                      console.log(`  ${key}: [Could not stringify/inspect value for this claim]`);
                  }
              }
          }
      } else if (auth && auth.token) {
          console.log('[createOrganizationUser] Caller token (RAW, not an object, or unexpected type):', auth.token);
      } else {
          console.log('[createOrganizationUser] Caller token (auth.token) is undefined or null.');
      }
    console.log('[createOrganizationUser] App Check token verification status (request.app):', util.inspect(app, { depth: null }));


    if (!auth || !auth.token) {
        console.error('[createOrganizationUser] Unauthenticated or token missing.');
        throw new HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
    }
    // App Check verification: request.app will be undefined if token is missing or invalid.
    if (app === undefined) {
        console.error("[createOrganizationUser] App Check token missing or invalid. Throwing unauthenticated.");
        throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
    }

    const callerClaims = auth.token || {};
    const { name, email, password, organizationId, department, role: userRole, photoUrl, admissionDate, status = 'active' } = data;

    const isAdminOfOrg = callerClaims.role === 'admin' && callerClaims.organizationId === organizationId;
    const isSuperAdmin = callerClaims.role === 'super_admin';

    if (!isAdminOfOrg && !isSuperAdmin) {
        console.error(`[createOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, Caller orgId: ${callerClaims.organizationId}, Target orgId: ${organizationId}`);
        throw new HttpsError('permission-denied', 'Você não tem permissão para criar usuários para esta organização.');
    }
    console.log('[createOrganizationUser] Permission GRANTED.');

    if (!name || !email || !password || !organizationId || !userRole || !department || !admissionDate) {
        throw new HttpsError('invalid-argument', 'Campos obrigatórios: nome, email, senha, ID da organização, função, departamento, data de admissão.');
    }
    if (password.length < 6) {
        throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
    }
    
    const authUserData = {
        email: email,
        password: password,
        displayName: name,
        emailVerified: false,
    };

    if (photoUrl && typeof photoUrl === 'string' && photoUrl.trim().startsWith('http')) {
        authUserData.photoURL = photoUrl.trim();
    }


    try {
        const userRecord = await admin.auth().createUser(authUserData);
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
            photoUrl: authUserData.photoURL || null, // Use the potentially set photoURL or null
            status: status, 
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('[createOrganizationUser] Perfil do colaborador criado no Firestore:', userRecord.uid);

        return { success: true, userId: userRecord.uid, message: `Colaborador '${name}' criado com sucesso.` };
    } catch (error) {
        const err = error;
        console.error('[createOrganizationUser] CRITICAL ERROR creating user:', err);
        if (err.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Este email já está em uso.');
        }
        throw new HttpsError('internal', `Falha ao criar colaborador. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
    }
});


exports.deleteOrganizationUser = onCall({
    enforceAppCheck: true,
}, async (request) => {
    const data = request.data;
    const auth = request.auth;
    const app = request.app;

    console.log('[deleteOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log(`[deleteOrganizationUser] Caller UID: ${auth?.uid || 'N/A'}`);
     if (auth && auth.token && typeof auth.token === 'object') {
        console.log('[deleteOrganizationUser] Caller token claims (decoded):');
        for (const key in auth.token) {
            if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
                 try {
                    const value = auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value, {depth: 2}) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify/inspect value for this claim]`);
                }
            }
        }
    } else if (auth && auth.token) {
        console.log('[deleteOrganizationUser] Caller token (RAW, not an object, or unexpected type):', auth.token);
    } else {
        console.log('[deleteOrganizationUser] Caller token (auth.token) is undefined or null.');
    }
    console.log('[deleteOrganizationUser] App Check token verification status (request.app):', util.inspect(app, { depth: null }));


    if (!auth || !auth.token) {
        console.error('[deleteOrganizationUser] Unauthenticated or token missing.');
        throw new HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    // App Check verification
    if (app === undefined) {
        console.error("[deleteOrganizationUser] App Check token missing or invalid. Throwing unauthenticated.");
        throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
    }
    
    const callerClaims = auth.token || {};
    const { userId, organizationId: targetOrganizationId } = data;

    if (!userId) {
        throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
    }
    
    let userToDeleteRecord;
    try {
        console.log(`[deleteOrganizationUser] Attempting to fetch user to delete (UID: ${userId}).`);
        userToDeleteRecord = await admin.auth().getUser(userId);
        console.log(`[deleteOrganizationUser] Successfully fetched user to delete. Claims:`, util.inspect(userToDeleteRecord.customClaims, {depth: null}));
    } catch (error) {
        const err = error;
        console.error(`[deleteOrganizationUser] ERROR fetching user to delete (UID: ${userId}):`, err);
        throw new HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
    }
    const userToDeleteClaims = userToDeleteRecord.customClaims || {};

    const isSuperAdmin = callerClaims.role === 'super_admin';
    const isAdminDeletingCollaboratorInOwnOrg = 
        callerClaims.role === 'admin' &&
        callerClaims.organizationId === targetOrganizationId && // Caller's org must match target org
        userToDeleteClaims.organizationId === targetOrganizationId && // User to delete must be in target org
        userToDeleteClaims.role === 'collaborator'; // Admin can only delete collaborators in their org

    if (!isSuperAdmin && !isAdminDeletingCollaboratorInOwnOrg) {
        console.error(`[deleteOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, User to delete role: ${userToDeleteClaims.role}, Target Org: ${targetOrganizationId}, User Org: ${userToDeleteClaims.organizationId}`);
        throw new HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
    }
    console.log('[deleteOrganizationUser] Permission GRANTED for action.');

    try {
        console.log(`[deleteOrganizationUser] Attempting to delete user from Firebase Auth (UID: ${userId}).`);
        await admin.auth().deleteUser(userId);
        console.log(`[deleteOrganizationUser] User ${userId} removed from Firebase Auth.`);
    } catch (authError) {
        const err = authError;
        console.error(`[deleteOrganizationUser] ERROR deleting user from Auth (UID: ${userId}):`, err);
        throw new HttpsError('internal', `Falha ao remover usuário da autenticação. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
    }
    
    try {
        const userDocRef = admin.firestore().collection('users').doc(userId);
        console.log(`[deleteOrganizationUser] Attempting to delete user document from Firestore (UID: ${userId}).`);
        await userDocRef.delete();
        console.log(`[deleteOrganizationUser] User document ${userId} removed from Firestore.`);
    } catch (firestoreError) {
        const err = firestoreError;
        // Log this error but don't necessarily throw if Auth deletion was successful,
        // or decide if this is a critical failure. For now, log and proceed.
        console.error(`[deleteOrganizationUser] ERROR deleting user document from Firestore (UID: ${userId}):`, err);
        // Optionally re-throw if Firestore deletion is critical:
        // throw new HttpsError('internal', `Falha ao remover documento do usuário do Firestore. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
    }

    return { success: true, message: `Usuário ${userId} removido com sucesso (Auth e tentativa no Firestore).` };
});


exports.toggleUserStatusFirebase = onCall({
    enforceAppCheck: true,
}, async (request) => {
  const data = request.data;
  const auth = request.auth;
  const app = request.app;

  console.log('[toggleUserStatusFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[toggleUserStatusFirebase] Caller UID: ${auth?.uid || 'N/A'}`);
  if (auth && auth.token && typeof auth.token === 'object') {
    console.log('[toggleUserStatusFirebase] Caller token claims (decoded):');
    for (const key in auth.token) {
        if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
            try {
                const value = auth.token[key];
                console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value, {depth: 2}) : value}`);
            } catch (e) {
                console.log(`  ${key}: [Could not stringify/inspect value for this claim]`);
            }
        }
    }
  } else if (auth && auth.token) {
      console.log('[toggleUserStatusFirebase] Caller token (RAW, not an object, or unexpected type):', auth.token);
  } else {
      console.log('[toggleUserStatusFirebase] Caller token (auth.token) is undefined or null.');
  }
  console.log('[toggleUserStatusFirebase] App Check token verification status (request.app):', util.inspect(app, { depth: null }));

  
  if (!auth || !auth.token) {
    console.error('[toggleUserStatusFirebase] Unauthenticated or token missing.');
    throw new HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }
  // App Check verification
  if (app === undefined) {
      console.error("[toggleUserStatusFirebase] App Check token missing or invalid. Throwing unauthenticated.");
      throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
  }

  const callerClaims = auth.token || {};
  const { userId, status } = data;

  if (!userId || !status || !['active', 'inactive'].includes(status)) {
    throw new HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios.");
  }

  let userToUpdateRecord;
  try {
      console.log(`[toggleUserStatusFirebase] Attempting to fetch user to update (UID: ${userId}).`);
      userToUpdateRecord = await admin.auth().getUser(userId);
      console.log(`[toggleUserStatusFirebase] Successfully fetched user to update. Claims:`, util.inspect(userToUpdateRecord.customClaims, {depth: null}));
  } catch (error) {
      const err = error;
      console.error(`[toggleUserStatusFirebase] ERROR fetching user to update (UID: ${userId}):`, err);
      throw new HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
  }
  const userToUpdateClaims = userToUpdateRecord.customClaims || {};

  const isSuperAdmin = callerClaims.role === 'super_admin';
  const isAdminManagingOwnOrgUser = 
      callerClaims.role === 'admin' &&
      callerClaims.organizationId && // Caller must have an org ID
      callerClaims.organizationId === userToUpdateClaims.organizationId; // Caller's org ID must match user's org ID

  if (!isSuperAdmin && !isAdminManagingOwnOrgUser) {
    console.error(`[toggleUserStatusFirebase] Permission denied. Caller role: ${callerClaims.role}, Target user org: ${userToUpdateClaims.organizationId}, Caller org: ${callerClaims.organizationId}`);
    throw new HttpsError('permission-denied', 'Você não tem permissão para alterar o status deste usuário.');
  }
   console.log('[toggleUserStatusFirebase] Permission GRANTED.');

  try {
    console.log(`[toggleUserStatusFirebase] Attempting to update Firestore status for UID ${userId} to ${status}.`);
    await admin.firestore().collection('users').doc(userId).update({ status: status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`[toggleUserStatusFirebase] Firestore status updated. Attempting to update Firebase Auth disabled state for UID ${userId} to ${status === 'inactive'}.`);
    await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

    console.log(`[toggleUserStatusFirebase] Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
    return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    const err = error;
    console.error("[toggleUserStatusFirebase] CRITICAL ERROR updating user status:", err);
    throw new HttpsError("internal", `Falha ao alterar status do usuário. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
  }
});


exports.removeAdminFromOrganizationFirebase = onCall({
    enforceAppCheck: true,
}, async (request) => {
    const data = request.data;
    const auth = request.auth;
    const app = request.app;

    console.log('[removeAdminFromOrganizationFirebase] Function called with data:', JSON.stringify(data));
    console.log(`[removeAdminFromOrganizationFirebase] Caller UID: ${auth?.uid || 'N/A'}`);
    if (auth && auth.token && typeof auth.token === 'object') {
        console.log('[removeAdminFromOrganizationFirebase] Caller token claims (decoded):');
        for (const key in auth.token) {
            if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
                 try {
                    const value = auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value, {depth: 2}) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify/inspect value for this claim]`);
                }
            }
        }
    } else if (auth && auth.token) {
        console.log('[removeAdminFromOrganizationFirebase] Caller token (RAW, not an object, or unexpected type):', auth.token);
    } else {
        console.log('[removeAdminFromOrganizationFirebase] Caller token (auth.token) is undefined or null.');
    }
    console.log('[removeAdminFromOrganizationFirebase] App Check token verification status (request.app):', util.inspect(app, { depth: null }));


    if (!auth || !auth.token) {
        console.error('[removeAdminFromOrganizationFirebase] Unauthenticated or token missing.');
        throw new HttpsError('unauthenticated', 'Ação requer autenticação.');
    }
    // App Check verification
    if (app === undefined) {
        console.error("[removeAdminFromOrganizationFirebase] App Check token missing or invalid. Throwing unauthenticated.");
        throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
    }
    
    const callerClaims = auth.token || {};
    if (callerClaims.role !== 'super_admin') {
        console.error(`[removeAdminFromOrganizationFirebase] Permission denied. Caller UID: ${auth.uid}. Role received: ${callerClaims.role || 'N/A'}`);
        throw new HttpsError('permission-denied', 'Apenas Super Admins podem remover administradores de organização.');
    }
    console.log('[removeAdminFromOrganizationFirebase] Permission GRANTED for Super Admin.');

    const { userId, organizationId } = data;
    if (!userId || !organizationId) {
        throw new HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios.');
    }

    let userRecord;
    try {
        console.log(`[removeAdminFromOrganizationFirebase] Attempting to fetch user (UID: ${userId}) to remove admin role.`);
        userRecord = await admin.auth().getUser(userId);
    } catch (error) {
        const err = error;
        console.error(`[removeAdminFromOrganizationFirebase] ERROR fetching user (UID: ${userId}):`, err);
        throw new HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
    }
    
    const currentClaims = userRecord.customClaims || {};
    console.log(`[removeAdminFromOrganizationFirebase] Current claims for UID ${userId}:`, util.inspect(currentClaims, {depth: null}));

    if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
        // Rebaixar para 'collaborator' na mesma organização
        const newClaims = { role: 'collaborator', organizationId: organizationId }; 
        
        try {
            console.log(`[removeAdminFromOrganizationFirebase] Attempting to update claims for UID ${userId} to:`, newClaims);
            await admin.auth().setCustomUserClaims(userId, newClaims);
            console.log(`[removeAdminFromOrganizationFirebase] Custom claims updated successfully for UID ${userId}.`);
        } catch (claimsError) {
            const err = claimsError;
            console.error(`[removeAdminFromOrganizationFirebase] ERROR setting custom claims for UID ${userId}:`, err);
            throw new HttpsError('internal', `Falha ao atualizar claims do usuário. Detalhe: ${(err instanceof Error ? err.message : String(err))}`);
        }

        try {
            console.log(`[removeAdminFromOrganizationFirebase] Attempting to update Firestore role for UID ${userId}.`);
            await admin.firestore().collection('users').doc(userId).update({
                role: newClaims.role, // Update role in Firestore as well
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`[removeAdminFromOrganizationFirebase] Firestore role updated successfully for UID ${userId}.`);
        } catch (firestoreError) {
            const err = firestoreError;
            console.error(`[removeAdminFromOrganizationFirebase] ERROR updating Firestore role for UID ${userId}:`, err);
            // Log this error but don't necessarily re-throw if claims update was successful,
            // or decide if this is critical. For now, log and proceed.
        }
            
        return { success: true, message: `Admin ${userId} removido/rebaixado na organização ${organizationId}.` };
    } else {
        console.log(`[removeAdminFromOrganizationFirebase] User ${userId} is not an admin of organization ${organizationId} or claims are inconsistent. Current claims:`, util.inspect(currentClaims, {depth: null}));
        throw new HttpsError('not-found', 'Usuário não é administrador desta organização ou claims inconsistentes.');
    }
});


exports.addAdminToMyOrg = onCall({
    enforceAppCheck: true,
}, async (request) => {
    const data = request.data; // { name, email, password }
    const auth = request.auth; // { uid, token: { role, organizationId, ... } }
    const app = request.app;

    console.log('[addAdminToMyOrg] Function called with data:', JSON.stringify({name: data.name, email: data.email, password: '***'}));
    console.log(`[addAdminToMyOrg] Caller UID: ${auth?.uid || 'N/A'}`);
    console.log('[addAdminToMyOrg] Caller claims:', util.inspect(auth?.token, {depth: null}));
    console.log('[addAdminToMyOrg] App Check token verification:', util.inspect(app, { depth: null }));

    if (!auth || !auth.token) {
        throw new HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    // App Check verification
    if (app === undefined) {
        console.error("[addAdminToMyOrg] App Check token missing or invalid. Throwing unauthenticated.");
        throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
    }

    if (auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Apenas administradores podem adicionar outros admins à sua organização.');
    }
    if (!auth.token.organizationId) {
        throw new HttpsError('failed-precondition', 'Administrador chamador não possui ID de organização.');
    }

    const { name, email, password } = data;
    const callerOrganizationId = auth.token.organizationId;

    if (!name || !email || !password) {
        throw new HttpsError('invalid-argument', 'Nome, email e senha são obrigatórios.');
    }
    if (password.length < 6) {
        throw new HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
    }

    let newUserRecord;
    try {
        newUserRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name,
            emailVerified: false, // Ou true, se preferir
        });
        console.log(`[addAdminToMyOrg] User created in Auth: ${newUserRecord.uid}`);
    } catch (error) {
        const err = error;
        console.error('[addAdminToMyOrg] Error creating user in Auth:', err);
        if (err.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Este email já está em uso.');
        }
        throw new HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${err.message}`);
    }

    const claimsToSet = { role: 'admin', organizationId: callerOrganizationId };
    try {
        await admin.auth().setCustomUserClaims(newUserRecord.uid, claimsToSet);
        console.log(`[addAdminToMyOrg] Custom claims set for ${newUserRecord.uid}:`, claimsToSet);
    } catch (error) {
        const err = error;
        console.error(`[addAdminToMyOrg] Error setting custom claims for ${newUserRecord.uid}:`, err);
        throw new HttpsError('internal', `Falha ao definir custom claims. Detalhe: ${err.message}`);
    }

    try {
        const userProfileData = {
            uid: newUserRecord.uid,
            name: name,
            email: email,
            role: 'admin',
            organizationId: callerOrganizationId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'active', // Novo admin é ativo por padrão
        };
        await admin.firestore().collection('users').doc(newUserRecord.uid).set(userProfileData);
        console.log(`[addAdminToMyOrg] User profile created in Firestore for ${newUserRecord.uid}.`);
    } catch (error) {
        const err = error;
        console.error(`[addAdminToMyOrg] Error creating user profile in Firestore for ${newUserRecord.uid}:`, err);
        throw new HttpsError('internal', `Falha ao criar perfil do usuário no Firestore. Detalhe: ${err.message}`);
    }

    return { success: true, userId: newUserRecord.uid, message: `Administrador '${name}' adicionado com sucesso à sua organização.` };
});

exports.demoteAdminInMyOrg = onCall({
    enforceAppCheck: true,
}, async (request) => {
    const data = request.data; // { userIdToDemote }
    const auth = request.auth; // { uid, token: { role, organizationId, ... } }
    const app = request.app;

    console.log('[demoteAdminInMyOrg] Function called with data:', JSON.stringify(data));
    console.log(`[demoteAdminInMyOrg] Caller UID: ${auth?.uid || 'N/A'}`);
    console.log('[demoteAdminInMyOrg] Caller claims:', util.inspect(auth?.token, {depth: null}));
    console.log('[demoteAdminInMyOrg] App Check token verification:', util.inspect(app, { depth: null }));

    if (!auth || !auth.token) {
        throw new HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    // App Check verification
    if (app === undefined) {
        console.error("[demoteAdminInMyOrg] App Check token missing or invalid. Throwing unauthenticated.");
        throw new HttpsError("unauthenticated", "App Check token missing or invalid.");
    }

    if (auth.token.role !== 'admin') {
        throw new HttpsError('permission-denied', 'Apenas administradores podem rebaixar outros admins da sua organização.');
    }
    if (!auth.token.organizationId) {
        throw new HttpsError('failed-precondition', 'Administrador chamador não possui ID de organização.');
    }

    const { userIdToDemote } = data;
    const callerUid = auth.uid;
    const callerOrganizationId = auth.token.organizationId;

    if (!userIdToDemote) {
        throw new HttpsError('invalid-argument', 'UID do usuário a ser rebaixado é obrigatório.');
    }
    if (userIdToDemote === callerUid) {
        throw new HttpsError('invalid-argument', 'Você não pode rebaixar a si mesmo.');
    }

    let userToDemoteRecord;
    try {
        userToDemoteRecord = await admin.auth().getUser(userIdToDemote);
    } catch (error) {
        const err = error;
        console.error(`[demoteAdminInMyOrg] Error fetching user to demote (UID: ${userIdToDemote}):`, err);
        throw new HttpsError('not-found', `Usuário com UID ${userIdToDemote} não encontrado.`);
    }

    const userToDemoteClaims = userToDemoteRecord.customClaims || {};
    if (userToDemoteClaims.role !== 'admin' || userToDemoteClaims.organizationId !== callerOrganizationId) {
        throw new HttpsError('failed-precondition', 'O usuário especificado não é um administrador desta organização.');
    }

    // Rebaixar para 'collaborator' na mesma organização
    const newClaims = { role: 'collaborator', organizationId: callerOrganizationId };
    try {
        await admin.auth().setCustomUserClaims(userIdToDemote, newClaims);
        console.log(`[demoteAdminInMyOrg] Custom claims updated for ${userIdToDemote} to:`, newClaims);
    } catch (error) {
        const err = error;
        console.error(`[demoteAdminInMyOrg] Error setting custom claims for ${userIdToDemote}:`, err);
        throw new HttpsError('internal', `Falha ao atualizar claims do usuário. Detalhe: ${err.message}`);
    }

    try {
        await admin.firestore().collection('users').doc(userIdToDemote).update({
            role: 'collaborator', // Atualiza o papel no Firestore
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[demoteAdminInMyOrg] Firestore role updated for ${userIdToDemote}.`);
    } catch (error) {
        const err = error;
        console.error(`[demoteAdminInMyOrg] Error updating Firestore role for ${userIdToDemote}:`, err);
        // Não re-lançar, pois a alteração de claims é a principal.
    }

    return { success: true, message: `Administrador ${userToDemoteRecord.displayName || userIdToDemote} foi rebaixado para colaborador.` };
});
// --- Funções de Notificação ---

/**
 * Helper: Send Push Notification via FCM
 */
async function sendPushNotification(employeeId, title, body, link, organizationId) {
  if (!employeeId) {
    console.warn('[sendPushNotification] employeeId is missing. Skipping.');
    return;
  }

  const userDoc = await admin.firestore().collection('users').doc(employeeId).get();
  if (!userDoc.exists) {
    console.warn(`[sendPushNotification] User document for ${employeeId} not found. Skipping.`);
    return;
  }

  const userData = userDoc.data();
  const tokens = userData.fcmTokens; 

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    console.log(`[sendPushNotification] No FCM tokens found for user ${employeeId}. Skipping.`);
    return;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: { // Add the 'data' payload here
      userIdTarget: employeeId,
      link: link || '/colaborador/dashboard',
      organizationId: organizationId || '',
      // You can add other custom data here
      // "screen": "/some_screen_path", 
    },
    tokens: tokens,
    android: { // Optional: Higher priority for Android delivery
      priority: 'high',
    },
    apns: { // Optional: APNS specific settings
        payload: {
            aps: {
                'content-available': 1, // Wakes up app for data processing
            },
        },
    },
  };

  try {
    console.log(`[sendPushNotification] Sending FCM message to ${tokens.length} tokens for user ${employeeId}.`);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[sendPushNotification] FCM response: ${response.successCount} messages sent successfully.`);
    if (response.failureCount > 0) {
        response.responses.forEach(resp => {
            if (!resp.success) {
                console.error(`[sendPushNotification] FCM send failure for token: ${resp.messageId}`, resp.error);
                // TODO: Add logic to clean up invalid tokens from user's profile
            }
        });
    }
  } catch (error) {
    console.error(`[sendPushNotification] Error sending FCM message to user ${employeeId}:`, error);
  }
}

/**
 * Helper function to add a notification to Realtime Database for a specific user.
 */
async function addNotificationToRTDB(employeeId, notificationData) {
    // admin SDK já deve estar inicializado globalmente.
    const rtdb = admin.database();
    const notificationsRef = rtdb.ref(`userNotifications/${employeeId}`);
    
    let newNotificationRef;
    let notificationId;
  
    if (notificationData.id) {
      notificationId = notificationData.id;
      newNotificationRef = notificationsRef.child(notificationId);
    } else {
      newNotificationRef = notificationsRef.push();
      notificationId = newNotificationRef.key;
    }
  
    const payload = {
      ...notificationData,
      id: notificationId, // Garante que o ID está no payload
      timestamp: new Date().toISOString(), // Usar ISO string para consistência
      read: false,
    };
    
    console.log(`[NotificationHelper] Attempting to add notification for employee ${employeeId} with ID ${notificationId}:`, payload);
    try {
      await newNotificationRef.set(payload);
      console.log(`[NotificationHelper] Notification added successfully for ${employeeId} with ID ${notificationId}`);
    } catch (error) {
      console.error(`[NotificationHelper] Error setting notification for ${employeeId} with ID ${notificationId}:`, error);
      throw error;
    }
  }
  
  /**
   * Firestore Trigger: Sends a notification when an evaluation is written (created/updated).
   */
  exports.onEvaluationWritten = onDocumentWritten(
    "organizations/{organizationId}/evaluations/{evaluationId}",
    async (event) => {
      const { organizationId, evaluationId } = event.params;
      
      if (!event.data || !event.data.after.exists) {
          console.log(`[onEvaluationWritten] Evaluation ${evaluationId} deleted or no data after write. No notification.`);
          return null;
      }
  
      const evaluationData = event.data.after.data();
      const previousEvaluationData = event.data.before.exists ? event.data.before.data() : null;
  
      const isNewScore = !previousEvaluationData?.score && evaluationData.score !== undefined;
      const scoreHasChanged = previousEvaluationData?.score !== evaluationData.score;
  
      if (!isNewScore && !scoreHasChanged) {
          console.log(`[onEvaluationWritten] Evaluation ${evaluationId} updated, but score hasn't changed or wasn't newly set. No notification.`);
          return null;
      }
  
      const employeeId = evaluationData.employeeId;
      const taskId = evaluationData.taskId;
      const score = evaluationData.score;
  
      if (!employeeId || !taskId || score === undefined) {
        console.error(`[onEvaluationWritten] Missing employeeId, taskId, or score for evaluation ${evaluationId}. Cannot send notification.`);
        return null;
      }
  
      let taskTitle = `tarefa (ID: ${taskId})`;
      try {
        const taskDoc = await admin.firestore().doc(`organizations/${organizationId}/tasks/${taskId}`).get();
        if (taskDoc.exists) {
          taskTitle = taskDoc.data().title || taskTitle;
        }
      } catch (taskError) {
        console.error(`[onEvaluationWritten] Error fetching task title for ${taskId}:`, taskError);
      }
  
      const message = `Sua avaliação para "${taskTitle}" foi registrada com nota ${score}.`;
      const notificationPayload = {
        type: "evaluation",
        message: message,
        link: "/colaborador/avaliacoes",
        relatedId: evaluationId,
        organizationId: organizationId,
      };
  
      try {
        await addNotificationToRTDB(employeeId, notificationPayload);
        console.log(`[onEvaluationWritten] RTDB Notification sent to ${employeeId} for evaluation ${evaluationId}.`);
        await sendPushNotification(employeeId, "Nova Avaliação", message, "/colaborador/avaliacoes", organizationId);
      } catch (error) {
        console.error(`[onEvaluationWritten] Failed to send notification for evaluation ${evaluationId}:`, error);
      }
      return null;
    }
  );

  /**
 * Firestore Trigger: Sends a notification when a challenge participation is evaluated.
 */
exports.onChallengeParticipationEvaluated = onDocumentWritten(
    "organizations/{organizationId}/challengeParticipations/{participationId}",
    async (event) => {
      const { organizationId, participationId } = event.params;
  
      if (!event.data || !event.data.after.exists) {
        console.log(`[onChallengeParticipationEvaluated] Participation ${participationId} deleted. No notification.`);
        return null;
      }
  
      const participationData = event.data.after.data();
      const previousParticipationData = event.data.before.exists ? event.data.before.data() : null;
  
      const evaluationJustHappened = 
          (participationData.status === 'approved' || participationData.status === 'rejected') &&
          (previousParticipationData?.status !== 'approved' && previousParticipationData?.status !== 'rejected');
  
      if (!evaluationJustHappened) {
        console.log(`[onChallengeParticipationEvaluated] Participation ${participationId} status (${participationData.status}) not an evaluation trigger. No notification.`);
        return null;
      }
  
      const employeeId = participationData.employeeId;
      const challengeId = participationData.challengeId;
  
      if (!employeeId || !challengeId) {
        console.error(`[onChallengeParticipationEvaluated] Missing employeeId or challengeId for participation ${participationId}.`);
        return null;
      }
  
      let challengeTitle = `desafio (ID: ${challengeId})`;
      try {
        const challengeDoc = await admin.firestore().doc(`organizations/${organizationId}/challenges/${challengeId}`).get();
        if (challengeDoc.exists) {
          challengeTitle = challengeDoc.data().title || challengeTitle;
        }
      } catch (challengeError) {
        console.error(`[onChallengeParticipationEvaluated] Error fetching challenge title for ${challengeId}:`, challengeError);
      }
  
      let message = `Sua submissão para o desafio "${challengeTitle}" foi avaliada como ${participationData.status === 'approved' ? 'Aprovada' : 'Rejeitada'}.`;
      if (participationData.status === 'approved' && participationData.score !== undefined) {
        message += ` Você ganhou ${participationData.score} pontos!`;
      }
      if (participationData.feedback) {
        message += ` Feedback: ${participationData.feedback}`;
      }
  
      const notificationPayload = {
        type: "challenge",
        message: message,
        link: "/colaborador/desafios",
        relatedId: participationId,
        organizationId: organizationId,
      };
  
      try {
        await addNotificationToRTDB(employeeId, notificationPayload);
        console.log(`[onChallengeParticipationEvaluated] RTDB Notification sent to ${employeeId} for challenge participation ${participationId}.`);
        await sendPushNotification(employeeId, "Desafio Avaliado", message, "/colaborador/desafios", organizationId);
      } catch (error) {
        console.error(`[onChallengeParticipationEvaluated] Failed to send notification for participation ${participationId}:`, error);
      }
      return null;
    }
  );

  /**
 * Firestore Trigger: Sends a notification when an award history entry is created (ranking confirmed for a period).
 */
  exports.onAwardHistoryCreatedV2 = onDocumentCreated(
    "awardHistory/{historyId}",
    async (event) => {
      const { historyId } = event.params;
      
      if (!event.data) {
        console.log(`[onAwardHistoryCreatedV2] No data associated with event for historyId ${historyId}. This should not happen for onCreate.`);
        return null;
      }
  
      const awardHistoryData = event.data.data();
  
      if (!awardHistoryData || !awardHistoryData.winners || awardHistoryData.winners.length === 0) {
        console.log(`[onAwardHistoryCreatedV2] No winners found in award history ${historyId}. No notifications.`);
        return null;
      }
  
      const organizationId = awardHistoryData.organizationId;
      if (!organizationId) {
          console.warn(`[onAwardHistoryCreatedV2] Missing organizationId in award history ${historyId}. Cannot determine target organization for user lookup.`);
      }
  
      const { period, awardTitle, winners } = awardHistoryData;
  
      console.log(`[onAwardHistoryCreatedV2] Processing award history ${historyId} for period ${period}, award: ${awardTitle}.`);
  
      const notificationPromises = winners.map(async (winner) => {
        if (!winner.employeeId) {
          console.warn(`[onAwardHistoryCreatedV2] Winner entry missing employeeId in history ${historyId}:`, winner);
          return null;
        }
        
        let targetOrgId = organizationId;
        if (!targetOrgId) {
          try {
              const userDoc = await admin.firestore().collection('users').doc(winner.employeeId).get();
              if (userDoc.exists && userDoc.data().organizationId) {
                  targetOrgId = userDoc.data().organizationId;
              } else {
                  console.warn(`[onAwardHistoryCreatedV2] Could not find organizationId for winner ${winner.employeeId}. Skipping notification.`);
                  return null;
              }
          } catch (userFetchError) {
              console.error(`[onAwardHistoryCreatedV2] Error fetching user to determine organizationId for winner ${winner.employeeId}:`, userFetchError);
              return null;
          }
        }
  
        const message = `Parabéns! Você foi um dos vencedores da premiação "${awardTitle}" (${period}). Sua colocação: ${winner.rank}º (${winner.prize}).`;
        const notificationPayload = {
          type: "ranking",
          message: message,
          link: "/colaborador/ranking",
          relatedId: historyId,
          organizationId: targetOrgId,
        };
  
        try {
          await addNotificationToRTDB(winner.employeeId, notificationPayload);
          await sendPushNotification(winner.employeeId, "Você foi Premiado!", message, "/colaborador/ranking", targetOrgId);
        } catch (error) {
          console.error(`[onAwardHistoryCreatedV2] Failed to send ranking notification to ${winner.employeeName || winner.employeeId}:`, error);
          return null;
        }
      });
  
      await Promise.all(notificationPromises.filter(p => p !== null));
      console.log(`[onAwardHistoryCreatedV2] Finished processing notifications for award history ${historyId}.`);
      return null;
    }
  );
  

  /**
   * Firestore Trigger: Sends notifications when a challenge is published or becomes active.
   */
  exports.onChallengePublished = onDocumentWritten(
    "organizations/{organizationId}/challenges/{challengeId}",
    async (event) => {
      const { organizationId, challengeId } = event.params;
  
      if (!event.data) {
          console.log(`[onChallengePublished] No data associated with event for challenge ${challengeId}.`);
          return null;
      }
      
      const challengeDataAfter = event.data.after.data();
      const challengeDataBefore = event.data.before.data();
  
      if (!challengeDataAfter) {
        console.log(`[onChallengePublished] Challenge ${challengeId} deleted. No notification.`);
        return null;
      }
  
      const statusAfter = challengeDataAfter.status;
      const statusBefore = challengeDataBefore ? challengeDataBefore.status : null;
  
      const isNewlyPublished = (!statusBefore || (statusBefore !== 'active' && statusBefore !== 'scheduled')) && 
                               (statusAfter === 'active' || statusAfter === 'scheduled');
  
      if (!isNewlyPublished) {
        console.log(`[onChallengePublished] Challenge ${challengeId} status (${statusAfter}) did not change to a publishable state or was already published. No notification.`);
        return null;
      }
      
      if (statusAfter === 'scheduled') {
        const startDate = new Date(challengeDataAfter.periodStartDate + "T00:00:00");
        const today = new Date();
        today.setHours(0,0,0,0);
        
        if (startDate > today) {
          console.log(`[onChallengePublished] Challenge ${challengeId} is scheduled for the future (${challengeDataAfter.periodStartDate}). No notification yet.`);
          return null;
        }
      }
  
      console.log(`[onChallengePublished] Challenge ${challengeId} is active/imminently scheduled. Processing notifications.`);
  
      const message = `Novo desafio disponível: "${challengeDataAfter.title}"! Participe e ganhe ${challengeDataAfter.points} pontos.`;
      const notificationPayloadBase = {
        type: "challenge",
        message: message,
        link: "/colaborador/desafios",
        relatedId: challengeId,
        organizationId: organizationId,
      };
  
      const eligibility = challengeDataAfter.eligibility;
      let targetEmployeeIds = [];
  
      if (eligibility.type === 'all') {
        try {
          const usersSnapshot = await admin.firestore().collection('users')
            .where('organizationId', '==', organizationId)
            .where('role', '==', 'collaborator')
            .where('status', '==', 'active')
            .get();
          targetEmployeeIds = usersSnapshot.docs.map(doc => doc.id);
        } catch (userFetchError) {
          console.error(`[onChallengePublished] Error fetching all collaborators for org ${organizationId}:`, userFetchError);
          return null;
        }
      } else if (eligibility.type === 'individual' && eligibility.entityIds) {
        targetEmployeeIds = eligibility.entityIds;
      } else if ((eligibility.type === 'department' || eligibility.type === 'role') && eligibility.entityIds) {
        const fieldToQuery = eligibility.type === 'department' ? 'department' : 'userRole';
        try {
          const usersSnapshot = await admin.firestore().collection('users')
            .where('organizationId', '==', organizationId)
            .where('role', '==', 'collaborator')
            .where('status', '==', 'active')
            .where(fieldToQuery, 'in', eligibility.entityIds)
            .get();
          targetEmployeeIds = usersSnapshot.docs.map(doc => doc.id);
        } catch (userFetchError) {
          console.error(`[onChallengePublished] Error fetching users for ${eligibility.type} ${eligibility.entityIds} in org ${organizationId}:`, userFetchError);
          return null;
        }
      }
  
      if (targetEmployeeIds.length === 0) {
        console.log(`[onChallengePublished] No target employees found for challenge ${challengeId}.`);
        return null;
      }
  
      console.log(`[onChallengePublished] Sending challenge notification to ${targetEmployeeIds.length} employees.`);
      const notificationPromises = targetEmployeeIds.map(async (employeeId) => {
        await addNotificationToRTDB(employeeId, notificationPayloadBase);
        await sendPushNotification(employeeId, "Novo Desafio Disponível", message, "/colaborador/desafios", organizationId);
      });
  
      try {
        await Promise.all(notificationPromises);
        console.log(`[onChallengePublished] All notifications sent for challenge ${challengeId}.`);
      } catch (error) {
        console.error(`[onChallengePublished] Failed to send one or more notifications for challenge ${challengeId}:`, error);
      }
      
      return null;
    }
  );



    
