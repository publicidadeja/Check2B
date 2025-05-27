// functions/index.js
// Force re-deploy: v1.0.8
const functions = require("firebase-functions/v2/https"); // Using v2 for HttpsError and options
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");
const util = require("util"); // For util.inspect

if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Definir opções globais para todas as funções v2 (ex: região)
setGlobalOptions({ region: "us-central1" });


/**
 * Sets custom user claims (role, organizationId) for a given user UID.
 * Can only be called by an authenticated user (preferably a Super Admin).
 */
exports.setCustomUserClaimsFirebase = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' }, 
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;

        console.log('[setCustomUserClaimsFirebase] Function called with data:', JSON.stringify(data));
        console.log(`[setCustomUserClaimsFirebase] Caller UID: ${contextAuth?.uid || 'N/A'}`);
        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[setCustomUserClaimsFirebase] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                    try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[setCustomUserClaimsFirebase] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[setCustomUserClaimsFirebase] Caller token (contextAuth.token) is undefined or null.');
        }
        console.log('[setCustomUserClaimsFirebase] App Check token verification status (request.app):', util.inspect(request.app, { depth: null }));

        if (!contextAuth) {
            console.error('[setCustomUserClaimsFirebase] Unauthenticated: No auth context.');
            throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
        }

        const callerUid = contextAuth.uid;
        let callerClaims = contextAuth.token || {};

        if (Object.keys(callerClaims).length === 0 && callerUid) {
            console.warn('[setCustomUserClaimsFirebase] Caller token is empty. Fetching user record for claims for UID:', callerUid);
            try {
                const callerUserRecord = await admin.auth().getUser(callerUid);
                callerClaims = callerUserRecord.customClaims || {};
                console.log('[setCustomUserClaimsFirebase] Fetched custom claims for caller:', callerClaims);
            } catch (fetchError) {
                console.error('[setCustomUserClaimsFirebase] Error fetching caller user record:', fetchError);
                throw new functions.https.HttpsError('internal', 'Não foi possível verificar as permissões do chamador.', (fetchError as Error).message);
            }
        }

        if (callerClaims.role !== 'super_admin') {
            const receivedRole = callerClaims.role || 'N/A (role missing in claims)';
            console.error(`[setCustomUserClaimsFirebase] PERMISSION DENIED. Caller UID: ${callerUid}. Role received: ${receivedRole}. Expected 'super_admin'.`);
            throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem definir claims diretamente.');
        }
        console.log('[setCustomUserClaimsFirebase] Permissão de Super Admin CONCEDIDA.');

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
            console.error("[setCustomUserClaimsFirebase] CRITICAL ERROR setting claims or updating Firestore:", error);
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            throw new functions.https.HttpsError("internal", `Não foi possível definir os custom claims. Detalhe: ${errorMessage}`);
        }
    }
);


exports.createOrganizationAdmin = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' },
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;
        
        console.log('[createOrganizationAdmin] Function called with data:', JSON.stringify(data));
        console.log('[createOrganizationAdmin] Full context object keys:', Object.keys(request)); // request is the first arg for v2
        console.log('[createOrganizationAdmin] context.app (inspected):', util.inspect(request.app, { depth: null }));
        console.log(`[createOrganizationAdmin] Caller UID: ${contextAuth?.uid || 'N/A'}`);

        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[createOrganizationAdmin] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                    try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[createOrganizationAdmin] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[createOrganizationAdmin] Caller token (contextAuth.token) is undefined or null.');
        }
        
        let hasSuperAdminRole = false;
        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object' && contextAuth.token.role === 'super_admin') {
            hasSuperAdminRole = true;
        }

        console.log(`[createOrganizationAdmin] Verificação de Permissão: contextAuth existe? ${!!contextAuth}`);
        if(contextAuth) {
            console.log(`[createOrganizationAdmin] Verificação de Permissão: contextAuth.token existe? ${!!contextAuth.token}`);
            if(contextAuth.token && typeof contextAuth.token === 'object') {
                console.log(`[createOrganizationAdmin] Verificação de Permissão: typeof contextAuth.token é 'object'? ${typeof contextAuth.token === 'object'}`);
                console.log(`[createOrganizationAdmin] Verificação de Permissão: contextAuth.token.role é '${contextAuth.token.role}' (tipo: ${typeof contextAuth.token.role})`);
            }
        }
        console.log(`[createOrganizationAdmin] Verificação de Permissão: hasSuperAdminRole é ${hasSuperAdminRole}`);

        if (!hasSuperAdminRole) {
            const callerUid = contextAuth?.uid || 'N/A';
            const receivedRole = contextAuth?.token?.role || 'N/A (token or role missing)';
            console.error(`[createOrganizationAdmin] PERMISSION DENIED. Caller UID: ${callerUid}. Role received: ${receivedRole}. Expected 'super_admin'.`);
            if (contextAuth && contextAuth.token) {
                console.log('[createOrganizationAdmin] Denied token claims (inspected):', util.inspect(contextAuth.token, { depth: null }));
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
            if ((authError as any).code === 'auth/email-already-exists') {
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
    }
);


exports.createOrganizationUser = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' },
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;

        console.log('[createOrganizationUser] Function called with data:', JSON.stringify(data));
        console.log(`[createOrganizationUser] Caller UID: ${contextAuth?.uid || 'N/A'}`);
        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[createOrganizationUser] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                     try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[createOrganizationUser] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[createOrganizationUser] Caller token (contextAuth.token) is undefined or null.');
        }
        console.log('[createOrganizationUser] App Check token verification status (request.app):', util.inspect(request.app, { depth: null }));


        if (!contextAuth || !contextAuth.token) {
            console.error('[createOrganizationUser] Unauthenticated or token missing.');
            throw new functions.https.HttpsError('unauthenticated', 'A função só pode ser chamada por usuários autenticados.');
        }
        
        const callerClaims = contextAuth.token || {};
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
            if ((error as any).code === 'auth/email-already-exists') {
                throw new functions.https.HttpsError('already-exists', 'Este email já está em uso.');
            }
            throw new functions.https.HttpsError('internal', `Falha ao criar colaborador. Detalhe: ${errorMessage}`);
        }
    }
);


exports.deleteOrganizationUser = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' },
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;

        console.log('[deleteOrganizationUser] Function called with data:', JSON.stringify(data));
        console.log(`[deleteOrganizationUser] Caller UID: ${contextAuth?.uid || 'N/A'}`);
         if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[deleteOrganizationUser] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                     try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[deleteOrganizationUser] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[deleteOrganizationUser] Caller token (contextAuth.token) is undefined or null.');
        }
        console.log('[deleteOrganizationUser] App Check token verification status (request.app):', util.inspect(request.app, { depth: null }));


        if (!contextAuth || !contextAuth.token) {
            console.error('[deleteOrganizationUser] Unauthenticated or token missing.');
            throw new functions.https.HttpsError('unauthenticated', 'Autenticação é necessária.');
        }
        
        const callerClaims = contextAuth.token || {};
        const { userId, organizationId: targetOrganizationId } = data;

        if (!userId || typeof userId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'UID do usuário é obrigatório e deve ser uma string.');
        }
        
        let userToDeleteRecord;
        try {
            console.log(`[deleteOrganizationUser] Attempting to fetch user to delete (UID: ${userId}).`);
            userToDeleteRecord = await admin.auth().getUser(userId);
            console.log(`[deleteOrganizationUser] Successfully fetched user to delete. Claims:`, userToDeleteRecord.customClaims);
        } catch (error) {
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            console.error(`[deleteOrganizationUser] ERROR fetching user to delete (UID: ${userId}):`, error);
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
            console.error(`[deleteOrganizationUser] Permission denied. Caller role: ${callerClaims.role}, User to delete role: ${userToDeleteClaims.role}, Target Org: ${targetOrganizationId}, User Org: ${userToDeleteClaims.organizationId}`);
            throw new functions.https.HttpsError('permission-denied', 'Você não tem permissão para remover este usuário.');
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
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            console.error(`[deleteOrganizationUser] CRITICAL ERROR deleting user ${userId}:`, error);
            throw new functions.https.HttpsError('internal', `Falha ao remover usuário. Detalhe: ${errorMessage}`);
        }
    }
);


exports.toggleUserStatusFirebase = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' },
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;

        console.log('[toggleUserStatusFirebase] Function called with data:', JSON.stringify(data));
        console.log(`[toggleUserStatusFirebase] Caller UID: ${contextAuth?.uid || 'N/A'}`);
        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[toggleUserStatusFirebase] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                    try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[toggleUserStatusFirebase] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[toggleUserStatusFirebase] Caller token (contextAuth.token) is undefined or null.');
        }
        console.log('[toggleUserStatusFirebase] App Check token verification status (request.app):', util.inspect(request.app, { depth: null }));

        
        if (!contextAuth || !contextAuth.token) {
            console.error('[toggleUserStatusFirebase] Unauthenticated or token missing.');
            throw new functions.https.HttpsError("unauthenticated", "A função só pode ser chamada por usuários autenticados.");
        }

        const callerClaims = contextAuth.token || {};
        const { userId, status } = data;

        if (!userId || typeof userId !== 'string' || !status || !['active', 'inactive'].includes(status)) {
            throw new functions.https.HttpsError("invalid-argument", "UID do usuário e novo status (active/inactive) são obrigatórios e UID deve ser string.");
        }

        let userToUpdateRecord;
        try {
            console.log(`[toggleUserStatusFirebase] Attempting to fetch user to update (UID: ${userId}).`);
            userToUpdateRecord = await admin.auth().getUser(userId);
            console.log(`[toggleUserStatusFirebase] Successfully fetched user to update. Claims:`, userToUpdateRecord.customClaims);
        } catch (error) {
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            console.error(`[toggleUserStatusFirebase] ERROR fetching user to update (UID: ${userId}):`, error);
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
            console.log(`[toggleUserStatusFirebase] Attempting to update Firestore status for UID ${userId} to ${status}.`);
            await admin.firestore().collection('users').doc(userId).update({ status: status });
            console.log(`[toggleUserStatusFirebase] Firestore status updated. Attempting to update Firebase Auth disabled state for UID ${userId} to ${status === 'inactive'}.`);
            await admin.auth().updateUser(userId, { disabled: status === 'inactive' });

            console.log(`[toggleUserStatusFirebase] Status do usuário ${userId} alterado para ${status} e Auth state para disabled: ${status === 'inactive'}`);
            return { success: true, message: `Status do usuário ${userId} alterado para ${status}.` };
        } catch (error) {
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            console.error("[toggleUserStatusFirebase] CRITICAL ERROR updating user status:", error);
            throw new functions.https.HttpsError("internal", `Falha ao alterar status do usuário. Detalhe: ${errorMessage}`);
        }
    }
);


exports.removeAdminFromOrganizationFirebase = functions.https.onCall(
    { enforceAppCheck: true, timeoutSeconds: 60, memory: '256MB' },
    async (request) => {
        const data = request.data;
        const contextAuth = request.auth;
        
        console.log('[removeAdminFromOrganizationFirebase] Function called with data:', JSON.stringify(data));
        console.log(`[removeAdminFromOrganizationFirebase] Caller UID: ${contextAuth?.uid || 'N/A'}`);
        if (contextAuth && contextAuth.token && typeof contextAuth.token === 'object') {
            console.log('[removeAdminFromOrganizationFirebase] Caller token claims (decoded):');
            for (const key in contextAuth.token) {
                if (Object.prototype.hasOwnProperty.call(contextAuth.token, key)) {
                     try {
                        const value = contextAuth.token[key];
                        console.log(`  ${key}: ${typeof value === 'object' ? util.inspect(value) : value}`);
                    } catch (e) {
                        console.log(`  ${key}: [Could not stringify value for this claim]`);
                    }
                }
            }
        } else if (contextAuth && contextAuth.token) {
            console.log('[removeAdminFromOrganizationFirebase] Caller token (RAW, not an object, or unexpected type):', contextAuth.token);
        } else {
            console.log('[removeAdminFromOrganizationFirebase] Caller token (contextAuth.token) is undefined or null.');
        }
        console.log('[removeAdminFromOrganizationFirebase] App Check token verification status (request.app):', util.inspect(request.app, { depth: null }));


        const callerClaims = contextAuth?.token || {};
        if (callerClaims.role !== 'super_admin') {
            const callerUid = contextAuth?.uid || 'N/A';
            const receivedRole = callerClaims.role || 'N/A (token or role missing)';
            console.error(`[removeAdminFromOrganizationFirebase] PERMISSION DENIED. Caller UID: ${callerUid}. Role received: ${receivedRole}. Expected 'super_admin'.`);
            if (contextAuth && contextAuth.token) {
                console.log('[removeAdminFromOrganizationFirebase] Denied token claims (inspected):', util.inspect(contextAuth.token, { depth: null }));
            }
            throw new functions.https.HttpsError('permission-denied', 'Apenas Super Admins podem executar esta ação.');
        }
        console.log('[removeAdminFromOrganizationFirebase] Permissão de Super Admin CONCEDIDA, prosseguindo...');

        const { userId, organizationId } = data;
        if (!userId || typeof userId !== 'string' || !organizationId || typeof organizationId !== 'string') {
            console.error('[removeAdminFromOrganizationFirebase] Invalid arguments:', data);
            throw new functions.https.HttpsError('invalid-argument', 'UID do usuário e ID da organização são obrigatórios e devem ser strings.');
        }

        let userRecord;
        try {
            console.log(`[removeAdminFromOrganizationFirebase] Attempting to fetch user record for UID: ${userId}`);
            userRecord = await admin.auth().getUser(userId);
            console.log(`[removeAdminFromOrganizationFirebase] Successfully fetched user record for UID: ${userId}. Current custom claims:`, userRecord.customClaims);
        } catch (error) {
            const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
            console.error(`[removeAdminFromOrganizationFirebase] ERROR fetching user record for UID ${userId}:`, error);
            throw new functions.https.HttpsError('not-found', `Usuário com UID ${userId} não encontrado. Detalhe: ${errorMessage}`);
        }

        const currentClaims = userRecord.customClaims || {};

        if (currentClaims.role === 'admin' && currentClaims.organizationId === organizationId) {
            // User is indeed an admin of the specified organization.
            // Remove their admin role and association with this organization by setting claims to null.
            // Consider if a generic 'user' role is more appropriate if you have one.
            const newClaims = { 
                role: null, 
                organizationId: null 
            }; 
            
            try {
                console.log(`[removeAdminFromOrganizationFirebase] Attempting to set new claims for UID ${userId}:`, newClaims);
                await admin.auth().setCustomUserClaims(userId, newClaims);
                console.log(`[removeAdminFromOrganizationFirebase] Custom claims for UID ${userId} successfully updated to:`, newClaims);
            } catch (error) {
                const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
                console.error(`[removeAdminFromOrganizationFirebase] ERROR setting new custom claims for UID ${userId}:`, error);
                throw new functions.https.HttpsError('internal', `Falha ao atualizar claims do usuário ${userId}. Detalhe: ${errorMessage}`);
            }

            try {
                const userDocRef = admin.firestore().collection('users').doc(userId);
                console.log(`[removeAdminFromOrganizationFirebase] Attempting to update Firestore document for UID ${userId} with role: null, organizationId: null.`);
                await userDocRef.update({
                    role: null,
                    organizationId: null,
                });
                console.log(`[removeAdminFromOrganizationFirebase] Firestore document for UID ${userId} updated successfully.`);
            } catch (error) {
                const errorMessage = (error && typeof error === 'object' && 'message' in error) ? String(error.message) : String(error);
                console.error(`[removeAdminFromOrganizationFirebase] ERROR updating Firestore document for UID ${userId}:`, error);
                // Decide if this should be a fatal error for the function.
                // For now, we'll let the function indicate success if claims were updated.
            }
            
            return { success: true, message: `Administrador ${userId} removido da organização ${organizationId}. Suas permissões administrativas para esta organização foram revogadas.` };
        } else if (currentClaims.organizationId === organizationId) {
            console.log(`[removeAdminFromOrganizationFirebase] Usuário ${userId} está na organização ${organizationId}, mas não como admin. Role atual: ${currentClaims.role}. Nenhuma ação de remoção de admin tomada.`);
            throw new functions.https.HttpsError('failed-precondition', `Usuário ${userId} não é um administrador desta organização (role atual: ${currentClaims.role}).`);
        } else {
            console.log(`[removeAdminFromOrganizationFirebase] Usuário ${userId} não pertence ou não é admin da organização ${organizationId}. Claims atuais:`, currentClaims);
            throw new functions.https.HttpsError('failed-precondition', 'Usuário não é administrador desta organização ou não pertence a ela.');
        }
    }
);
