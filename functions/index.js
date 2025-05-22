// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK only once
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Sets custom user claims (role, organizationId) for a given user UID.
 * Can only be called by an authenticated user with 'super_admin' role.
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
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerClaims = context.auth.token || {};
  if (callerClaims.role !== 'super_admin') {
    console.error(`[setCustomUserClaimsFirebase] Permission denied for UID: ${context.auth.uid}. Claims:`, callerClaims);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem definir claims diretamente.');
  }
  console.log('[setCustomUserClaimsFirebase] Super Admin permission GRANTED.');

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
    console.log(`[setCustomUserClaimsFirebase] Attempting to set custom claims for UID ${uid}:`, claims);
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`[setCustomUserClaimsFirebase] Custom claims set successfully for UID ${uid}.`);

    const userDocRef = admin.firestore().collection('users').doc(uid);
    const firestoreUpdateData = {
        role: claims.role,
        organizationId: claims.organizationId,
    };
    console.log(`[setCustomUserClaimsFirebase] Attempting to update Firestore for UID ${uid} with:`, firestoreUpdateData);
    await userDocRef.set(firestoreUpdateData, { merge: true });
    console.log(`[setCustomUserClaimsFirebase] Firestore document updated for UID ${uid}.`);

    return { success: true, message: `Sucesso! Custom claims ${JSON.stringify(claims)} definidos para o usuário ${uid}` };
  } catch (error) {
    console.error("[setCustomUserClaimsFirebase] CRITICAL ERROR setting custom claims:", error);
    throw new functions.https.HttpsError("internal", `Não foi possível definir os custom claims. Detalhe: ${(error instanceof Error ? error.message : String(error))}`);
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
  
  if (!context.auth || !context.auth.token) {
    console.error('[createOrganizationAdmin] Unauthenticated or token missing.');
    throw new functions.https.HttpsError('unauthenticated', 'Ação requer autenticação.');
  }
  
  const callerClaims = context.auth.token || {};
  if (callerClaims.role !== 'super_admin') {
    const callerUid = context.auth.uid || 'N/A';
    const receivedRole = callerClaims.role || 'N/A (token or role missing)';
    console.error(`[createOrganizationAdmin] PERMISSION DENIED. Caller UID: ${callerUid}. Role received: ${receivedRole}. Expected 'super_admin'.`);
    if (context.auth.token) console.log('[createOrganizationAdmin] Denied token claims (decoded):', context.auth.token);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem criar administradores de organização.');
  }
  console.log('[createOrganizationAdmin] Permissão de Super Admin CONCEDIDA, prosseguindo...');

  const { name, email, password, organizationId } = data;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Nome do administrador é obrigatório.');
  }
  if (!email || typeof email !== 'string' || email.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Email do administrador é obrigatório.');
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Senha é obrigatória e deve ter pelo menos 6 caracteres.');
  }
  if (!organizationId || typeof organizationId !== 'string' || organizationId.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'ID da organização é obrigatório.');
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
    if ((authError instanceof Error) && (authError as any).code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new functions.https.HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${(authError instanceof Error ? authError.message : String(authError))}`);
  }

  try {
    const claimsToSet = { role: 'admin', organizationId: organizationId };
    console.log(`[createOrganizationAdmin] Attempting to set custom claims for UID ${userRecord.uid}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log(`[createOrganizationAdmin] Custom claims set successfully for UID ${userRecord.uid}.`);
  } catch (claimsError) {
    console.error(`[createOrganizationAdmin] ERROR setting custom claims for UID ${userRecord.uid}:`, claimsError);
    // Attempt to delete the user if claims setting fails to avoid orphaned auth user
    try {
        await admin.auth().deleteUser(userRecord.uid);
        console.log(`[createOrganizationAdmin] Cleaned up orphaned Auth user ${userRecord.uid} due to claims setting failure.`);
    } catch (cleanupError) {
        console.error(`[createOrganizationAdmin] CRITICAL: Failed to cleanup orphaned Auth user ${userRecord.uid}:`, cleanupError);
    }
    throw new functions.https.HttpsError('internal', `Falha ao definir claims para o usuário. Detalhe: ${(claimsError instanceof Error ? claimsError.message : String(claimsError))}`);
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
     // Attempt to delete the user and clear claims if Firestore profile creation fails
    try {
        await admin.auth().deleteUser(userRecord.uid); // Claims are removed when user is deleted
        console.log(`[createOrganizationAdmin] Cleaned up Auth user ${userRecord.uid} due to Firestore profile creation failure.`);
    } catch (cleanupError) {
        console.error(`[createOrganizationAdmin] CRITICAL: Failed to cleanup Auth user ${userRecord.uid} after Firestore error:`, cleanupError);
    }
    throw new functions.https.HttpsError('internal', `Falha ao criar perfil do usuário no Firestore. Detalhe: ${(firestoreError instanceof Error ? firestoreError.message : String(firestoreError))}`);
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
  console.log(`[createOrganizationUser] Permission GRANTED. Caller role: ${callerClaims.role}`);

  if (!name || !email || !password || !organizationId || !userRole || !department || !admissionDate) {
    throw new functions.https.HttpsError('invalid-argument', 'Campos obrigatórios: nome, email, senha, ID da organização, papel do usuário, departamento, data de admissão.');
  }
  if (password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
  }

  let userRecord;
  try {
    console.log(`[createOrganizationUser] Attempting to create user in Auth for email: ${email}`);
    userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      photoURL: photoUrl || undefined,
      emailVerified: false, 
    });
    console.log(`[createOrganizationUser] User created in Auth successfully. UID: ${userRecord.uid}`);
  } catch (authError) {
    console.error('[createOrganizationUser] ERROR creating user in Auth:', authError);
    if ((authError instanceof Error) && (authError as any).code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new functions.https.HttpsError('internal', `Falha ao criar usuário no Firebase Auth. Detalhe: ${(authError instanceof Error ? authError.message : String(authError))}`);
  }

  try {
    const claimsToSet = { role: 'collaborator', organizationId: organizationId };
    console.log(`[createOrganizationUser] Attempting to set custom claims for UID ${userRecord.uid}:`, claimsToSet);
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log(`[createOrganizationUser] Custom claims set successfully for UID ${userRecord.uid}.`);
  } catch (claimsError) {
    console.error(`[createOrganizationUser] ERROR setting custom claims for UID ${userRecord.uid}:`, claimsError);
    try { await admin.auth().deleteUser(userRecord.uid); console.log(`[createOrganizationUser] Cleaned up orphaned Auth user ${userRecord.uid}.`); }
    catch (cleanupError) { console.error(`[createOrganizationUser] CRITICAL: Failed to cleanup Auth user ${userRecord.uid}:`, cleanupError); }
    throw new functions.https.HttpsError('internal', `Falha ao definir claims. Detalhe: ${(claimsError instanceof Error ? claimsError.message : String(claimsError))}`);
  }

  try {
    const userProfileData = {
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'collaborator', 
      organizationId: organizationId,
      department: department,
      userRole: userRole, // This might be what you intended for 'Função'
      admissionDate: admissionDate,
      photoUrl: photoUrl || null,
      status: status, 
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    console.log(`[createOrganizationUser] Attempting to create user profile in Firestore for UID ${userRecord.uid}.`);
    await userDocRef.set(userProfileData);
    console.log(`[createOrganizationUser] User profile created in Firestore for UID ${userRecord.uid}.`);
  } catch (firestoreError) {
    console.error(`[createOrganizationUser] ERROR creating user profile in Firestore for UID ${userRecord.uid}:`, firestoreError);
    try { await admin.auth().deleteUser(userRecord.uid); console.log(`[createOrganizationUser] Cleaned up Auth user ${userRecord.uid}.`); }
    catch (cleanupError) { console.error(`[createOrganizationUser] CRITICAL: Failed to cleanup Auth user ${userRecord.uid}:`, cleanupError); }
    throw new functions.https.HttpsError('internal', `Falha ao criar perfil no Firestore. Detalhe: ${(firestoreError instanceof Error ? firestoreError.message : String(firestoreError))}`);
  }

  return { success: true, userId: userRecord.uid, message: `Colaborador '${name}' criado com sucesso.` };
});

exports.deleteOrganizationUser = functions.https.onCall(async (data, context) => {
  console.log('[deleteOrganizationUser] Function called with data:', JSON.stringify(data));
  console.log(`[deleteOrganizationUser] Caller UID: ${context.auth?.uid || 'N/A'}`);
  // Secure logging for claims
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') { /* ... */ } 
  else if (context.auth && context.auth.token) { /* ... */ } else { /* ... */ }

  if (!context.auth || !context.auth.token) {
    console.error('[deleteOrganizationUser] Unauthenticated or token missing.');
    throw new functions.https.HttpsError('unauthenticated', 'Autenticação é necessária.');
  }
  
  const callerClaims = context.auth.token || {};
  const { userId, organizationId: targetOrganizationId } = data;

  if (!userId || typeof userId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório e deve ser uma string.');
  }

  let userToDeleteRecord;
  try {
    userToDeleteRecord = await admin.auth().getUser(userId);
  } catch (error) {
    console.error(`[deleteOrganizationUser] Error fetching user to delete (UID: ${userId}):`, error);
    if ((error as any).code === 'auth/user-not-found') {
        throw new functions.https.HttpsError('not-found', 'Usuário a ser removido não encontrado na autenticação.');
    }
    throw new functions.https.HttpsError('internal', `Erro ao buscar usuário. Detalhe: ${(error as Error).message}`);
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
  console.log(`[deleteOrganizationUser] Permission GRANTED. Caller role: ${callerClaims.role}`);

  try {
    console.log(`[deleteOrganizationUser] Attempting to delete user from Auth: ${userId}`);
    await admin.auth().deleteUser(userId);
    console.log(`[deleteOrganizationUser] User ${userId} deleted from Firebase Auth successfully.`);
  } catch (authError) {
    console.error(`[deleteOrganizationUser] ERROR deleting user ${userId} from Auth:`, authError);
    throw new functions.https.HttpsError('internal', `Falha ao remover usuário do Firebase Auth. Detalhe: ${(authError as Error).message}`);
  }
  
  try {
    const userDocRef = admin.firestore().collection('users').doc(userId);
    console.log(`[deleteOrganizationUser] Attempting to delete user profile from Firestore: ${userId}`);
    await userDocRef.delete();
    console.log(`[deleteOrganizationUser] Firestore document for user ${userId} deleted successfully.`);
  } catch (firestoreError) {
    // Log this error but don't necessarily throw if Auth user was deleted.
    // Consider if this should be a critical failure.
    console.error(`[deleteOrganizationUser] ERROR deleting Firestore document for user ${userId}:`, firestoreError);
    // Optionally re-throw or handle differently:
    // throw new functions.https.HttpsError('internal', `Falha ao remover perfil do Firestore. Detalhe: ${(firestoreError as Error).message}`);
  }

  return { success: true, message: `Usuário ${userId} removido com sucesso.` };
});

exports.toggleUserStatusFirebase = functions.https.onCall(async (data, context) => {
  console.log('[toggleUserStatusFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[toggleUserStatusFirebase] Caller UID: ${context.auth?.uid || 'N/A'}`);
  // Secure logging for claims
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') { /* ... */ }
  else if (context.auth && context.auth.token) { /* ... */ } else { /* ... */ }

  if (!context.auth || !context.auth.token) {
    console.error('[toggleUserStatusFirebase] Unauthenticated or token missing.');
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerClaims = context.auth.token || {};
  const { userId, status } = data;

  if (!userId || typeof userId !== 'string' || !status || !['active', 'inactive'].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios e devem ser strings válidas.");
  }

  let userToUpdateRecord;
  try {
      userToUpdateRecord = await admin.auth().getUser(userId);
  } catch (error) {
      console.error(`[toggleUserStatusFirebase] Error fetching user to update (UID: ${userId}):`, error);
      if ((error as any).code === 'auth/user-not-found') {
          throw new functions.https.HttpsError('not-found', 'Usuário a ser atualizado não encontrado na autenticação.');
      }
      throw new functions.https.HttpsError('internal', `Erro ao buscar usuário. Detalhe: ${(error as Error).message}`);
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
  console.log(`[toggleUserStatusFirebase] Permission GRANTED. Caller role: ${callerClaims.role}`);

  try {
    console.log(`[toggleUserStatusFirebase] Attempting to update Firestore status for ${userId} to ${status}.`);
    await admin.firestore().collection('users').doc(userId).update({ status: status });
    console.log(`[toggleUserStatusFirebase] Firestore status updated for ${userId}.`);

    const authUserDisabledState = status === 'inactive';
    console.log(`[toggleUserStatusFirebase] Attempting to update Auth disabled state for ${userId} to ${authUserDisabledState}.`);
    await admin.auth().updateUser(userId, { disabled: authUserDisabledState });
    console.log(`[toggleUserStatusFirebase] Auth disabled state updated for ${userId}.`);

    return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    console.error("[toggleUserStatusFirebase] CRITICAL ERROR toggling user status:", error);
    throw new functions.https.HttpsError("internal", `Falha ao alterar status do usuário. Detalhe: ${(error as Error).message}`);
  }
});

exports.removeAdminFromOrganizationFirebase = functions.https.onCall(async (data, context) => {
  console.log('[removeAdminFromOrganizationFirebase] Function called with data:', JSON.stringify(data));
  console.log(`[removeAdminFromOrganizationFirebase] Caller UID: ${context.auth?.uid || 'N/A'}`);
  // Secure logging for claims
  if (context.auth && context.auth.token && typeof context.auth.token === 'object') { /* ... */ }
  else if (context.auth && context.auth.token) { /* ... */ } else { /* ... */ }

  if (!context.auth || !context.auth.token) {
    console.error('[removeAdminFromOrganizationFirebase] Unauthenticated or token missing.');
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }
  
  const callerClaims = context.auth.token || {};
  if (callerClaims.role !== 'super_admin') {
    console.error(`[removeAdminFromOrganizationFirebase] Permission denied. Caller role: ${callerClaims.role}. Expected 'super_admin'.`);
    if (context.auth.token) console.log('[removeAdminFromOrganizationFirebase] Denied token claims (decoded):', context.auth.token);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem remover administradores de organização.');
  }
  console.log('[removeAdminFromOrganizationFirebase] Super Admin permission GRANTED.');
  
  const { userId, organizationId } = data;
  if (!userId || typeof userId !== 'string' || !organizationId || typeof organizationId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios e devem ser strings.');
  }

  let userRecord;
  try {
      userRecord = await admin.auth().getUser(userId);
  } catch (error) {
      console.error(`[removeAdminFromOrganizationFirebase] Error fetching user to demote (UID: ${userId}):`, error);
      if ((error as any).code === 'auth/user-not-found') {
          throw new functions.https.HttpsError('not-found', 'Usuário a ser modificado não encontrado na autenticação.');
      }
      throw new functions.https.HttpsError('internal', `Erro ao buscar usuário. Detalhe: ${(error as Error).message}`);
  }
  const currentClaims = userRecord.customClaims || {};

  if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
    // Demote to collaborator in the same org
    const newClaims = { role: 'collaborator', organizationId: organizationId }; 
    
    try {
      console.log(`[removeAdminFromOrganizationFirebase] Attempting to update claims for UID ${userId} to:`, newClaims);
      await admin.auth().setCustomUserClaims(userId, newClaims);
      console.log(`[removeAdminFromOrganizationFirebase] Custom claims for ${userId} updated successfully.`);
    } catch (claimsError) {
      console.error(`[removeAdminFromOrganizationFirebase] ERROR updating claims for UID ${userId}:`, claimsError);
      throw new functions.https.HttpsError('internal', `Falha ao atualizar claims. Detalhe: ${(claimsError as Error).message}`);
    }

    try {
      console.log(`[removeAdminFromOrganizationFirebase] Attempting to update Firestore role for UID ${userId} to '${newClaims.role}'.`);
      await admin.firestore().collection('users').doc(userId).update({ role: newClaims.role });
      console.log(`[removeAdminFromOrganizationFirebase] Firestore role for ${userId} updated successfully.`);
    } catch (firestoreError) {
      console.error(`[removeAdminFromOrganizationFirebase] ERROR updating Firestore role for UID ${userId}:`, firestoreError);
      // Consider if you need to revert claims if Firestore update fails. For now, just log.
      throw new functions.https.HttpsError('internal', `Falha ao atualizar papel no Firestore. Detalhe: ${(firestoreError as Error).message}`);
    }
            
    return { success: true, message: `Admin ${userId} removido/rebaixado para colaborador na organização ${organizationId}.` };
  } else {
    console.log(`[removeAdminFromOrganizationFirebase] Usuário ${userId} não é admin da organização ${organizationId} ou claims atuais são:`, currentClaims);
    throw new functions.https.HttpsError('failed-precondition', 'Usuário não é administrador desta organização ou os claims atuais não correspondem.');
  }
});
// Force re-deploy: v1.0.1
// Add this comment to force re-deploy if Firebase CLI says "no changes detected"
