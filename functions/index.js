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
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  // IMPORTANT: Implement robust authorization here.
  // Example: Check if the caller is a super_admin.
  const callerUserRecord = await admin.auth().getUser(context.auth.uid);
  if (!callerUserRecord.customClaims || callerUserRecord.customClaims.role !== 'super_admin') {
    // Allow admin to set claims for users in their own organization if needed
    // if (callerUserRecord.customClaims.role === 'admin' && data.claims.organizationId !== callerUserRecord.customClaims.organizationId) {
    //   throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para definir claims para esta organização.');
    // } else if (callerUserRecord.customClaims.role !== 'admin') {
    //   throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para executar esta ação.');
    // }
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
    console.log(`Custom claims definidos para ${uid}:`, claims);

    // Also update the user document in Firestore with the new role and orgId for consistency
    const userDocRef = admin.firestore().collection('users').doc(uid);
    await userDocRef.set({ // Use set with merge:true or update if sure doc exists
        role: claims.role,
        organizationId: claims.organizationId,
    }, { merge: true });
    console.log(`Documento do usuário ${uid} atualizado no Firestore com novos claims.`);

    return { message: `Sucesso! Custom claims ${JSON.stringify(claims)} definidos para o usuário ${uid}` };
  } catch (error) {
    console.error("Erro ao definir custom claims:", error);
    throw new functions.https.HttpsError("internal", "Não foi possível definir os custom claims.", error.message);
  }
});


/**
 * Creates a new user (admin for an organization) in Firebase Auth,
 * sets their custom claims, and creates their profile in Firestore.
 * Can only be called by a Super Admin.
 */
exports.createOrganizationAdmin = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.token || context.auth.token.role !== 'super_admin') {
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
      emailVerified: false,
    });
    console.log('Novo admin de organização criado no Auth:', userRecord.uid);

    const claimsToSet = { role: 'admin', organizationId: organizationId };
    await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
    console.log('Custom claims definidos para o novo admin:', claimsToSet);

    const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
    await userDocRef.set({
      uid: userRecord.uid,
      name: name,
      email: email,
      role: 'admin',
      organizationId: organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
    });
    console.log('Perfil do admin criado no Firestore:', userRecord.uid);

    return { success: true, userId: userRecord.uid, message: `Administrador '${name}' criado com sucesso para a organização ${organizationId}.` };
  } catch (error) {
    console.error('Erro ao criar admin de organização:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
    }
    throw new functions.https.HttpsError('internal', 'Falha ao criar administrador de organização.', error.message);
  }
});

/**
 * Creates a new user (collaborator for an organization) in Firebase Auth,
 * sets their custom claims, and creates their profile in Firestore.
 * Can be called by an Admin of the same organization.
 */
exports.createOrganizationUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
    }

    const callerUid = context.auth.uid;
    const callerUserRecord = await admin.auth().getUser(callerUid);
    const callerClaims = callerUserRecord.customClaims;

    const { name, email, password, organizationId, department, role: userRole, photoUrl, admissionDate, status = 'active' } = data;

    // Authorization: Caller must be an admin of the target organization OR a super_admin
    if (!(callerClaims && ((callerClaims.role === 'admin' && callerClaims.organizationId === organizationId) || callerClaims.role === 'super_admin'))) {
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
            emailVerified: false, // Or true if you have an email verification flow
        });
        console.log(`Novo colaborador ${userRecord.uid} criado no Firebase Auth.`);

        const claimsToSet = { role: 'collaborator', organizationId: organizationId };
        await admin.auth().setCustomUserClaims(userRecord.uid, claimsToSet);
        console.log('Custom claims definidos para novo colaborador:', claimsToSet);

        const userDocRef = admin.firestore().collection('users').doc(userRecord.uid);
        await userDocRef.set({
            uid: userRecord.uid,
            name: name,
            email: email,
            role: 'collaborator', // Explicitly set role
            organizationId: organizationId,
            department: department,
            userRole: userRole, // This is the job title, distinct from system role
            admissionDate: admissionDate, // Should be YYYY-MM-DD string
            photoUrl: photoUrl || null,
            status: status, // 'active' or 'inactive'
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('Perfil do colaborador criado no Firestore:', userRecord.uid);

        return { success: true, userId: userRecord.uid, message: `Colaborador '${name}' criado com sucesso.` };
    } catch (error) {
        console.error('Erro ao criar colaborador:', error);
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
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Autenticação é necessária.');
    }
    const callerUid = context.auth.uid;
    const { userId, organizationId: targetOrganizationId } = data;

    if (!userId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório.');
    }

    const callerUserRecord = await admin.auth().getUser(callerUid);
    const callerClaims = callerUserRecord.customClaims;

    const userToDeleteRecord = await admin.auth().getUser(userId);
    const userToDeleteClaims = userToDeleteRecord.customClaims;

    // Authorization check
    const canDelete = callerClaims.role === 'super_admin' ||
                      (callerClaims.role === 'admin' &&
                       callerClaims.organizationId === targetOrganizationId && // Admin deleting user from their org
                       userToDeleteClaims.organizationId === targetOrganizationId && // User belongs to admin's org
                       userToDeleteClaims.role === 'collaborator'); // Admin can only delete collaborators

    if (!canDelete) {
        throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
    }

    try {
        // Delete from Firebase Authentication
        await admin.auth().deleteUser(userId);
        console.log(`Usuário ${userId} removido do Firebase Auth.`);

        // Delete from Firestore
        const userDocRef = admin.firestore().collection('users').doc(userId);
        await userDocRef.delete();
        console.log(`Documento do usuário ${userId} removido do Firestore.`);

        return { success: true, message: `Usuário ${userId} removido com sucesso.` };
    } catch (error) {
        console.error(`Erro ao remover usuário ${userId}:`, error);
        throw new functions.https.HttpsError('internal', 'Falha ao remover usuário.', error.message);
    }
});



/**
 * Toggles a user's status (active/inactive) in Firestore and Firebase Auth.
 * Can only be called by a Super Admin or an Admin for users in their organization.
 */
exports.toggleUserStatusFirebase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
  }

  const callerUserRecord = await admin.auth().getUser(context.auth.uid);
  const callerClaims = callerUserRecord.customClaims;
  const { userId, status } = data; // status should be 'active' or 'inactive'

  if (!userId || !status || !['active', 'inactive'].includes(status)) {
    throw new functions.https.HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios.");
  }

  const userToUpdateRecord = await admin.auth().getUser(userId);
  const userToUpdateClaims = userToUpdateRecord.customClaims;

  // Authorization: Super Admin or Admin of the same organization
  const canToggle = callerClaims.role === 'super_admin' ||
                    (callerClaims.role === 'admin' &&
                     callerClaims.organizationId && // Ensure caller admin has an org
                     callerClaims.organizationId === userToUpdateClaims.organizationId); // Target user is in caller's org

  if (!canToggle) {
    throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para alterar o status deste usuário.');
  }

  try {
    // Update Firestore status
    await admin.firestore().collection('users').doc(userId).update({ status: status });
    // Enable/disable user in Firebase Auth
    await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

    console.log(`Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
    return { message: `Status do usuário ${userId} alterado para ${status}.` };
  } catch (error) {
    console.error("Erro ao alterar status do usuário:", error);
    throw new functions.https.HttpsError("internal", "Falha ao alterar status do usuário.", error.message);
  }
});

/**
 * Removes an admin's specific administrative claims for an organization.
 * Typically, this would revert them to a 'collaborator' role within that org,
 * or remove org-specific claims if they have no other role in that org.
 * Can only be called by a Super Admin.
 */
exports.removeAdminFromOrganizationFirebase = functions.https.onCall(async (data, context) => {
    if (!context.auth || context.auth.token.role !== 'super_admin') {
        throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem remover administradores de organização.');
    }
    const { userId, organizationId } = data;
    if (!userId || !organizationId) {
        throw new functions.https.HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios.');
    }

    try {
        // Fetch current claims to see if they are admin of THIS org
        const userRecord = await admin.auth().getUser(userId);
        const currentClaims = userRecord.customClaims || {};

        if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
            // Option 1: Revert to collaborator in the same org
            // const newClaims = { role: 'collaborator', organizationId: organizationId };
            // Option 2: Remove all org-specific claims if they are only admin of this org
            // This depends on your system's logic if a user can be in multiple orgs or have multiple roles.
            // For simplicity, let's assume they become a collaborator of the same org or lose org-specific claims.
            // If they should be completely removed from the org, handle that at the user document level.
            const newClaims = { ...currentClaims, role: 'collaborator' }; // Example: downgrade role
            // Or, if they should lose org access completely:
            // const newClaims = { role: null, organizationId: null }; // This might need more thought based on app logic

            await admin.auth().setCustomUserClaims(userId, newClaims);
            // Update Firestore document
            await admin.firestore().collection('users').doc(userId).update({
                role: newClaims.role,
                // organizationId: newClaims.organizationId, // if changing/removing
            });
            console.log(`Admin ${userId} removido da organização ${organizationId}. Claims atualizados para:`, newClaims);
            return { success: true, message: `Admin ${userId} removido da organização ${organizationId}.` };
        } else {
            console.log(`Usuário ${userId} não é admin da organização ${organizationId} ou claims estão inconsistentes.`);
            throw new functions.https.HttpsError('not-found', 'Usuário não é administrador desta organização ou claims inconsistentes.');
        }
    } catch (error) {
        console.error(`Erro ao remover admin ${userId} da organização ${organizationId}:`, error);
        throw new functions.https.HttpsError('internal', 'Falha ao remover admin da organização.', error.message);
    }
});
