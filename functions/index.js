// functions/index.js
// Force re-deploy: v1.0.8
const admin = require("firebase-admin");
const util = require("util");

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
    enforceAppCheck: true, // Rejeita requisições com tokens App Check ausentes ou inválidos.
}, async (request) => {
  const data = request.data;
  const auth = request.auth;
  const app = request.app; // App Check context

  console.log('[setCustomUserClaimsFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[setCustomUserClaimsFirebase] Caller UID: ${auth?.uid || 'N/A'}`);
  if (auth && auth.token && typeof auth.token === 'object') {
      console.log('[setCustomUserClaimsFirebase] Caller token claims (decoded):');
      for (const key in auth.token) {
          if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
              try {
                  const value = auth.token[key];
                  console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
              } catch (e) {
                  console.log(`  ${key}: [Could not stringify value for this claim]`);
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

  const callerUid = auth.uid;
  let callerClaims = auth.token || {};

  if (!callerClaims || Object.keys(callerClaims).length === 0) {
    console.warn('[setCustomUserClaimsFirebase] Caller token is empty or missing. Fetching user record for claims for UID:', callerUid);
    try {
        const callerUserRecord = await admin.auth().getUser(callerUid);
        callerClaims = callerUserRecord.customClaims || {};
        console.log('[setCustomUserClaimsFirebase] Fetched custom claims for caller:', JSON.stringify(callerClaims));
    } catch (fetchError) {
        const err = fetchError as Error;
        console.error('[setCustomUserClaimsFirebase] Error fetching caller user record:', err);
        throw new HttpsError('internal', `Não foi possível verificar as permissões do chamador. ${err.message}`);
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
    const err = error as Error;
    console.error("[setCustomUserClaimsFirebase] CRITICAL ERROR setting claims or updating Firestore:", err);
    throw new HttpsError("internal", `Não foi possível definir os custom claims. Detalhe: ${err.message}`);
  }
});


exports.createOrganizationAdmin = onCall({
    enforceAppCheck: true,
}, async (request) => {
  const data = request.data;
  const auth = request.auth;
  const app = request.app;

  console.log('[createOrganizationAdmin] Function called with data:', JSON.stringify(data));
  console.log('[createOrganizationAdmin] Full context object keys:', Object.keys(request)); // Log top-level keys of request
  console.log('[createOrganizationAdmin] context.app (inspected):', util.inspect(app, { depth: null }));
  console.log(`[createOrganizationAdmin] Caller UID: ${auth?.uid || 'N/A'}`);
    if (auth && auth.token && typeof auth.token === 'object') {
        console.log('[createOrganizationAdmin] Caller token claims (decoded):');
        for (const key in auth.token) {
            if (Object.prototype.hasOwnProperty.call(auth.token, key)) {
                 try {
                    const value = auth.token[key];
                    console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
                }
            }
        }
    } else if (auth && auth.token) {
        console.log('[createOrganizationAdmin] Caller token (RAW, not an object, or unexpected type):', auth.token);
    } else {
        console.log('[createOrganizationAdmin] Caller token (auth.token) is undefined or null.');
    }


  let hasSuperAdminRole = false;
  if (auth && auth.token && typeof auth.token === 'object' && auth.token.role === 'super_admin') {
      hasSuperAdminRole = true;
  }

  console.log(`[createOrganizationAdmin] Verificação de Permissão: auth existe? ${!!auth}`);
  if(auth) {
      console.log(`[createOrganizationAdmin] Verificação de Permissão: auth.token existe? ${!!auth.token}`);
      if(auth.token && typeof auth.token === 'object') {
          console.log(`[createOrganizationAdmin] Verificação de Permissão: typeof auth.token é 'object'? ${typeof auth.token === 'object'}`);
          console.log(`[createOrganizationAdmin] Verificação de Permissão: auth.token.role é '${auth.token.role}' (tipo: ${typeof auth.token.role})`);
      }
  }
  console.log(`[createOrganizationAdmin] Verificação de Permissão: hasSuperAdminRole é ${hasSuperAdminRole}`);

  if (!hasSuperAdminRole) {
    const callerUid = auth?.uid || 'N/A';
    const receivedRole = auth?.token?.role || 'N/A (token or role missing)';
    console.error(`[createOrganizationAdmin] PERMISSION DENIED. Caller UID: ${callerUid}. Role recebida: ${receivedRole}. Esperado 'super_admin'.`);
    if (auth && auth.token) {
        console.log('[createOrganizationAdmin] Denied token claims (inspected):', util.inspect(auth.token, { depth: null }));
    }
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
    const err = authError as Error & { code?: string };
    console.error('[createOrganizationAdmin] ERROR creating user in Auth:', err);
    if (err.code === 'auth/email-already-exists') {
        throw new HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${err.message}`);
  }

  try {
    const claimsToSet = { role: 'admin', organizationId: organizationId };
    console.log(`[createOrganizationAdmin] Attempting to set custom claims for UID ${userRecord.uid}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log(`[createOrganizationAdmin] Custom claims set successfully for UID ${userRecord.uid}.`);
  } catch (claimsError) {
    const err = claimsError as Error;
    console.error(`[createOrganizationAdmin] ERROR setting custom claims for UID ${userRecord.uid}:`, err);
    throw new HttpsError('internal', `Falha ao definir custom claims. Detalhe: ${err.message}`);
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
    const err = firestoreError as Error;
    console.error(`[createOrganizationAdmin] ERROR creating user profile in Firestore for UID ${userRecord.uid}:`, err);
    throw new HttpsError('internal', `Falha ao criar perfil do usuário no Firestore. Detalhe: ${err.message}`);
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
                      console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                  } catch (e) {
                      console.log(`  ${key}: [Could not stringify value for this claim]`);
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
        const err = error as Error & { code?: string };
        console.error('[createOrganizationUser] CRITICAL ERROR creating user:', err);
        if (err.code === 'auth/email-already-exists') {
            throw new HttpsError('already-exists', 'Este email já está em uso.');
        }
        throw new HttpsError('internal', `Falha ao criar colaborador. Detalhe: ${err.message}`);
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
                    console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
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
    
    const callerClaims = auth.token || {};
    const { userId, organizationId: targetOrganizationId } = data;

    if (!userId) {
        throw new HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
    }
    
    let userToDeleteRecord;
    try {
        console.log(`[deleteOrganizationUser] Attempting to fetch user to delete (UID: ${userId}).`);
        userToDeleteRecord = await admin.auth().getUser(userId);
        console.log(`[deleteOrganizationUser] Successfully fetched user to delete. Claims:`, userToDeleteRecord.customClaims);
    } catch (error) {
        const err = error as Error;
        console.error(`[deleteOrganizationUser] ERROR fetching user to delete (UID: ${userId}):`, err);
        throw new HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${err.message}`);
    }
    const userToDeleteClaims = userToDeleteRecord.customClaims || {};

    const isSuperAdmin = callerClaims.role === 'super_admin';
    const isAdminDeletingCollaboratorInOwnOrg = 
        callerClaims.role === 'admin' &&
        callerClaims.organizationId === targetOrganizationId &&
        userToDeleteClaims.organizationId === targetOrganizationId &&
        userToDeleteClaims.role === 'collaborator';

    if (!isSuperAdmin && !isAdminDeletingCollaboratorInOwnOrg) {
        console.error(`[deleteOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, User to delete role: ${userToDeleteClaims.role}, Target Org: ${targetOrganizationId}, User Org: ${userToDeleteClaims.organizationId}`);
        throw new HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
    }
    console.log('[deleteOrganizationUser] Permission GRANTED.');

    try {
        console.log(`[deleteOrganizationUser] Attempting to delete user from Firebase Auth (UID: ${userId}).`);
        await admin.auth().deleteUser(userId);
        console.log(`[deleteOrganizationUser] User ${userId} removed from Firebase Auth.`);

        const userDocRef = admin.firestore().collection('users').doc(userId);
        console.log(`[deleteOrganizationUser] Attempting to delete user document from Firestore (UID: ${userId}).`);
        await userDocRef.delete();
        console.log(`[deleteOrganizationUser] User document ${userId} removed from Firestore.`);

        return { success: true, message: `Usuário ${userId} removido com sucesso.` };
    } catch (error) {
        const err = error as Error;
        console.error(`[deleteOrganizationUser] CRITICAL ERROR deleting user ${userId}:`, err);
        throw new HttpsError('internal', `Falha ao remover usuário. Detalhe: ${err.message}`);
    }
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
                console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
            } catch (e) {
                console.log(`  ${key}: [Could not stringify value for this claim]`);
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

  const callerClaims = auth.token || {};
  const { userId, status } = data;

  if (!userId || !status || !['active', 'inactive'].includes(status)) {
    throw new HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios.");
  }

  let userToUpdateRecord;
  try {
      console.log(`[toggleUserStatusFirebase] Attempting to fetch user to update (UID: ${userId}).`);
      userToUpdateRecord = await admin.auth().getUser(userId);
      console.log(`[toggleUserStatusFirebase] Successfully fetched user to update. Claims:`, userToUpdateRecord.customClaims);
  } catch (error) {
      const err = error as Error;
      console.error(`[toggleUserStatusFirebase] ERROR fetching user to update (UID: ${userId}):`, err);
      throw new HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${err.message}`);
  }
  const userToUpdateClaims = userToUpdateRecord.customClaims || {};

  const isSuperAdmin = callerClaims.role === 'super_admin';
  const isAdminManagingOwnOrgUser = 
      callerClaims.role === 'admin' &&
      callerClaims.organizationId &&
      callerClaims.organizationId === userToUpdateClaims.organizationId;

  if (!isSuperAdmin && !isAdminManagingOwnOrgUser) {
    console.error(`[toggleUserStatusFirebase] Permission denied. Caller role: ${callerClaims.role}, Target user org: ${userToUpdateClaims.organizationId}, Caller org: ${callerClaims.organizationId}`);
    throw new HttpsError('permission-denied', 'Você não tem permissão para alterar o status deste usuário.');
  }
   console.log('[toggleUserStatusFirebase] Permission GRANTED.');

  try {
    console.log(`[toggleUserStatusFirebase] Attempting to update Firestore status for UID ${userId} to ${status}.`);
    await admin.firestore().collection('users').doc(userId).update({ status: status });
    console.log(`[toggleUserStatusFirebase] Firestore status updated. Attempting to update Firebase Auth disabled state for UID ${userId} to ${status === 'inactive'}.`);
    await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

    console.log(`[toggleUserStatusFirebase] Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
    return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    const err = error as Error;
    console.error("[toggleUserStatusFirebase] CRITICAL ERROR updating user status:", err);
    throw new HttpsError("internal", `Falha ao alterar status do usuário. Detalhe: ${err.message}`);
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
                    console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                } catch (e) {
                    console.log(`  ${key}: [Could not stringify value for this claim]`);
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

    try {
        console.log(`[removeAdminFromOrganizationFirebase] Attempting to fetch user (UID: ${userId}) to remove admin role.`);
        const userRecord = await admin.auth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};
        console.log(`[removeAdminFromOrganizationFirebase] Current claims for UID ${userId}:`, currentClaims);


        if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
            const newClaims = { role: 'collaborator', organizationId: organizationId }; 
            
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
            console.log(`[removeAdminFromOrganizationFirebase] User ${userId} is not an admin of organization ${organizationId} or claims are inconsistent. Current claims:`, currentClaims);
            throw new HttpsError('not-found', 'Usuário não é administrador desta organização ou claims inconsistentes.');
        }
    } catch (error) {
        const err = error as Error;
        console.error(`[removeAdminFromOrganizationFirebase] CRITICAL ERROR removing admin ${userId} from org ${organizationId}:`, err);
        throw new HttpsError('internal', `Falha ao remover admin da organização. Detalhe: ${err.message}`);
    }
});
