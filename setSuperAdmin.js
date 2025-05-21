// setupSuperAdmin.js
const admin = require('firebase-admin');
const serviceAccount = require('./checkup.json'); // baixe do console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function criarSuperAdmin() {
  const name = "Admin Master";
  const email = "victor.vh340@gmail.com";
  const password = "superadmin";

  const user = await admin.auth().createUser({ email, password, displayName: name });

  await admin.auth().setCustomUserClaims(user.uid, { role: 'super_admin' });

  await admin.firestore().collection('users').doc(user.uid).set({
    uid: user.uid,
    name,
    email,
    role: 'super_admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'active',
  });

  console.log('Super Admin criado com sucesso:', user.uid);
}

criarSuperAdmin().catch(console.error);
