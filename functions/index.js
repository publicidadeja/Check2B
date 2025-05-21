// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Sets custom user claims (role, organizationId) for a given user UID.
 * Can only be called by an authenticated user (preferably a Super Admin).
 */
exports.setCustomUserClaimsFirebase = functions.https.onCall(async (data, context) => {
  console.log('[setCustomUserClaimsFirebase] Function called with data:', JSON.stringify(data));
  console.log('[setCustomUserClaimsFirebase] Caller Auth context:', JSON.stringify(context.auth));

  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerUid = context.auth.uid;
  let callerClaims = context.auth.token; // Claims from the ID token of the caller

  // If token is empty, try to fetch user record to get claims (fallback, might not be ideal for callable functions)
  if (!callerClaims || Object.keys(callerClaims).length === 0) {
    console.warn('[setCustomUserClaimsFirebase] Caller token is empty or missing. Fetching user record for claims for UID:', callerUid);
    try {
        const callerUserRecord = await admin.auth().getUser(callerUid);
        callerClaims = callerUserRecord.customClaims || {};
        console.log('[setCustomUserClaimsFirebase] Fetched custom claims for caller:', JSON.stringify(callerClaims));
    } catch (fetchError) {
        console.error('[setCustomUserClaimsFirebase] Error fetching caller user record:', fetchError);
        throw new functions.https.HttpsError('internal', 'Não foi possível verificar as permissões do chamador.');
    }
  }


  // IMPORTANT: Robust authorization
  if (!callerClaims || callerClaims.role !== 'super_admin') {
    console.error(`[setCustomUserClaimsFirebase] Permission denied for UID: ${callerUid}. Claims: ${JSON.stringify(callerClaims)}`);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem definir claims diretamente.');
  }

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
    claims.organizationId = null; // Ensure it's null for super_admin
  } else if ((claims.role === 'admin' || claims.role === 'collaborator') && (!claims.organizationId || typeof claims.organizationId !== 'string')) {
    throw new functions.https.HttpsError("invalid-argument", "OrganizationId é obrigatório e deve ser uma string para admin/collaborator.");
  }

  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    console.log(`[setCustomUserClaimsFirebase] Custom claims definidos para ${uid}:`, claims);

    // Also update the user document in Firestore with the new role and orgId for consistency
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.set({ // Use set with merge:true or update if sure doc exists
        role: claims.role,
        organizationId: claims.organizationId,
    }, { merge: true });
    console.log(`[setCustomUserClaimsFirebase] Documento do usuário ${uid} atualizado no Firestore com novos claims.`);

    return { success: true, message: `Sucesso! Custom claims ${JSON.stringify(claims)} definidos para o usuário ${uid}` };
  } catch (error) {
    console.error("[setCustomUserClaimsFirebase] Erro ao definir custom claims:", error);
    throw new functions.https.HttpsError("internal", "Não foi possível definir os custom claims.", error.message);
  }
});


/**
 * Creates a new user (admin for an organization) in Firebase Auth,
 * sets their custom claims, and creates their profile in Firestore.
 * Can only be called by a Super Admin.
 */
exports.createOrganizationAdmin = functions.https.onCall(async (data, context) => {
  console.log('[createOrganizationAdmin] Function called with data:', JSON.stringify(data));
  console.log('[createOrganizationAdmin] Caller Auth context:', JSON.stringify(context.auth)); // Log the auth context

  if (!context.auth || !context.auth.token) {
    console.error('[createOrganizationAdmin] Unauthenticated or token missing.');
    throw new functions.https.HttpsError('unauthenticated', 'Ação requer autenticação.');
  }
  
  // Log the claims from the token
  console.log('[createOrganizationAdmin] Caller token claims:', JSON.stringify(context.auth.token));

  if (context.auth.token.role !== 'super_admin') {
    console.error(`[createOrganizationAdmin] Permission denied. Caller role is '${context.auth.token.role}', not 'super_admin'.`);
    throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem criar administradores de organização.');
  }

  const { name, email, password, organizationId } = data;

  if (!name || !email || !password || !organizationId) {
    throw new functions.https.HttpsError('invalid-argument', 'Nome, email, senha e ID da organização são obrigatórios.');
  }
  if (password.length < 6) {
     throw new functions.https.HttpsError('invalid-argument', 'A senha deve ter pelo menos 6 caracteres.');
  }

  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: false, // Consider setting to true or implementing verification flow
    });
    console.log('[createOrganizationAdmin] Novo admin de organização criado no Auth:', userRecord.uid);

    const claimsToSet = { role: 'admin', organizationId: organizationId };
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log('[createOrganizationAdmin] Custom claims definidos para o novo admin:', claimsToSet);

    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'admin', // Explicitly set role in Firestore document
      organizationId: organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active', // Default status for new admin
    });
    console.log('[createOrganizationAdmin] Perfil do admin criado no Firestore:', userRecord.uid);

    return { success: true, userId: userRecord.uid, message: `Administrador '${name}' criado com sucesso para a organização ${organizationId}.` };
  } catch (error) {
    console.error('[createOrganizationAdmin] Erro ao criar admin de organização:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    // For other errors, throw a generic internal error
    throw new functions.https.HttpsError('internal', 'Falha ao criar administrador de organização.', error.message);
  }
});

/**
 * Creates a new user (collaborator for an organization) in Firebase Auth,
 * sets their custom claims, and creates their profile in Firestore.
 * Can be called by an Admin of the same organization or a Super Admin.
 */
exports.createOrganizationUser = functions.https.onCall(async (data, context) => {
    console.log('[createOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log('[createOrganizationUser] Caller Auth context:', JSON.stringify(context.auth));

    if (!context.auth || !context.auth.token) {
        console.error('[createOrganizationUser] Unauthenticated or token missing.');
        throw new functions.https.HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
    }
    
    console.log('[createOrganizationUser] Caller token claims:', JSON.stringify(context.auth.token));
    const callerClaims = context.auth.token;
    const { name, email, password, organizationId, department, role: userRole, photoUrl, admissionDate, status = 'active' } = data;

    // Authorization: Caller must be an admin of the target organization OR a super_admin
    const isAdminOfOrg = callerClaims.role === 'admin' && callerClaims.organizationId === organizationId;
    const isSuperAdmin = callerClaims.role === 'super_admin';

    if (!isAdminOfOrg && !isSuperAdmin) {
        console.error(`[createOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, Caller orgId: ${callerClaims.organizationId}, Target orgId: ${organizationId}`);
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para criar usuários para esta organização.');
    }

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
        console.error('[createOrganizationUser] Erro ao criar colaborador:', error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
        }
        throw new functions.https.HttpsError('internal', 'Falha ao criar colaborador.', error.message);
    }
});


/**
 * Deletes a user from Firebase Authentication and their profile from Firestore.
 * Authorization: Only Super Admin or Admin of the same organization can delete.
 */
exports.deleteOrganizationUser = functions.https.onCall(async (data, context) => {
    console.log('[deleteOrganizationUser] Function called with data:', JSON.stringify(data));
    console.log('[deleteOrganizationUser] Caller Auth context:', JSON.stringify(context.auth));

    if (!context.auth || !context.auth.token) {
        console.error('[deleteOrganizationUser] Unauthenticated or token missing.');
        throw new functions.https.HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    
    console.log('[deleteOrganizationUser] Caller token claims:', JSON.stringify(context.auth.token));
    const callerClaims = context.auth.token;
    const { userId, organizationId: targetOrganizationId } = data; // targetOrganizationId is for admin scope check

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
    }

    const userToDeleteRecord = await admin.auth().getUser(userId);
    const userToDeleteClaims = userToDeleteRecord.customClaims || {}; // Ensure claims object exists

    // Authorization check
    const isSuperAdmin = callerClaims.role === 'super_admin';
    // Admin can delete a collaborator from their own organization.
    const isAdminDeletingCollaboratorInOwnOrg = 
        callerClaims.role === 'admin' &&
        callerClaims.organizationId === targetOrganizationId && // Admin is from the target org
        userToDeleteClaims.organizationId === targetOrganizationId && // User belongs to admin's org
        userToDeleteClaims.role === 'collaborator'; // Admin can only delete collaborators

    if (!isSuperAdmin && !isAdminDeletingCollaboratorInOwnOrg) {
        console.error(`[deleteOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, User to delete role: ${userToDeleteClaims.role}`);
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
    }

    try {
        // Delete from Firebase Authentication
        await admin.auth().deleteUser(userId);
        console.log(`[deleteOrganizationUser] Usuário ${userId} removido do Firebase Auth.`);

        // Delete from Firestore
        const userDocRef = admin.firestore().collection('users').doc(userId);
        await userDocRef.delete();
        console.log(`[deleteOrganizationUser] Documento do usuário ${userId} removido do Firestore.`);

        return { success: true, message: `Usuário ${userId} removido com sucesso.` };
    } catch (error) {
        console.error(`[deleteOrganizationUser] Erro ao remover usuário ${userId}:`, error);
        throw new functions.https.HttpsError('internal', 'Falha ao remover usuário.', error.message);
    }
});


/**
 * Toggles a user's status (active/inactive) in Firestore and Firebase Auth.
 * Can only be called by a Super Admin or an Admin for users in their organization.
 */
exports.toggleUserStatusFirebase = functions.https.onCall(async (data, context) => {
  console.log('[toggleUserStatusFirebase] Function called with data:', JSON.stringify(data));
  console.log('[toggleUserStatusFirebase] Caller Auth context:', JSON.stringify(context.auth));
  
  if (!context.auth || !context.auth.token) {
    console.error('[toggleUserStatusFirebase] Unauthenticated or token missing.');
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  console.log('[toggleUserStatusFirebase] Caller token claims:', JSON.stringify(context.auth.token));
  const callerClaims = context.auth.token;
  const { userId, status } = data; // status should be 'active' or 'inactive'

  if (!userId || !status || !['active', 'inactive'].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios.");
  }

  const userToUpdateRecord = await admin.auth().getUser(userId);
  const userToUpdateClaims = userToUpdateRecord.customClaims || {};

  // Authorization: Super Admin or Admin of the same organization
  const isSuperAdmin = callerClaims.role === 'super_admin';
  const isAdminManagingOwnOrgUser = 
      callerClaims.role === 'admin' &&
      callerClaims.organizationId && // Ensure caller admin has an org
      callerClaims.organizationId === userToUpdateClaims.organizationId; // Target user is in caller's org

  if (!isSuperAdmin && !isAdminManagingOwnOrgUser) {
    console.error(`[toggleUserStatusFirebase] Permission denied. Caller role: ${callerClaims.role}, Target user org: ${userToUpdateClaims.organizationId}, Caller org: ${callerClaims.organizationId}`);
    throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para alterar o status deste usuário.');
  }

  try {
    // Update Firestore status
    await admin.firestore().collection('users').doc(userId).update({ status: status });
    // Enable/disable user in Firebase Auth
    await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

    console.log(`[toggleUserStatusFirebase] Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
    return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    console.error("[toggleUserStatusFirebase] Erro ao alterar status do usuário:", error);
    throw new functions.https.HttpsError("internal", "Falha ao alterar status do usuário.", error.message);
  }
});

/**
 * Removes an admin's specific administrative claims for an organization.
 * This function effectively "demotes" an admin of a specific organization.
 * It could revert them to a 'collaborator' role within that org, or remove org-specific claims entirely.
 * Can only be called by a Super Admin.
 */
exports.removeAdminFromOrganizationFirebase = functions.https.onCall(async (data, context) => {
    console.log('[removeAdminFromOrganizationFirebase] Function called with data:', JSON.stringify(data));
    console.log('[removeAdminFromOrganizationFirebase] Caller Auth context:', JSON.stringify(context.auth));

    if (!context.auth || !context.auth.token || context.auth.token.role !== 'super_admin') {
        console.error(`[removeAdminFromOrganizationFirebase] Permission denied. Caller role: ${context.auth.token?.role}`);
        throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem remover administradores de organização.');
    }
    const { userId, organizationId } = data;
    if (!userId || !organizationId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios.');
    }

    try {
        const userRecord = await admin.auth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};

        if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
            // Logic to "demote" or change role. Example: Demote to collaborator in the same org.
            // Adjust this based on your exact requirements.
            const newClaims = { role: 'collaborator', organizationId: organizationId }; 
            
            await admin.auth().setCustomUserClaims(userId, newClaims);
            console.log(`[removeAdminFromOrganizationFirebase] Custom claims para ${userId} atualizados para:`, newClaims);

            // Update Firestore document
            await admin.firestore().collection('users').doc(userId).update({
                role: newClaims.role, // Update role in Firestore
                // organizationId remains the same if demoting within the org
            });
            console.log(`[removeAdminFromOrganizationFirebase] Documento do usuário ${userId} atualizado no Firestore para role: ${newClaims.role}`);
            
            return { success: true, message: `Admin ${userId} removido/rebaixado na organização ${organizationId}.` };
        } else {
            console.log(`[removeAdminFromOrganizationFirebase] Usuário ${userId} não é admin da organização ${organizationId} ou claims estão inconsistentes.`);
            throw new functions.https.HttpsError('not-found', 'Usuário não é administrador desta organização ou claims inconsistentes.');
        }
    } catch (error) {
        console.error(`[removeAdminFromOrganizationFirebase] Erro ao remover admin ${userId} da organização ${organizationId}:`, error);
        throw new functions.https.HttpsError('internal', 'Falha ao remover admin da organização.', error.message);
    }
});
