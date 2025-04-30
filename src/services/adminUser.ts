
'use server';

import { db } from '@/lib/firebase';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot
} from 'firebase/firestore';

// Define the AdminUser interface (ensure consistency with the page)
export interface AdminUser {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLogin?: string; // Storing as ISO string
    // permissionLevel?: string; // Optional permission level
}

const adminCollection = collection(db, 'admins');

// Helper to convert Firestore doc to AdminUser
const docToAdminUser = (doc: QueryDocumentSnapshot<DocumentData>): AdminUser => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        email: data.email,
        isActive: data.isActive,
        lastLogin: data.lastLogin instanceof Timestamp ? data.lastLogin.toDate().toISOString() : data.lastLogin,
        // permissionLevel: data.permissionLevel,
    };
};


// --- Firestore API Functions ---

export async function getAllAdmins(): Promise<AdminUser[]> {
    console.log("Fetching admin users from Firestore...");
    try {
        const snapshot = await getDocs(adminCollection);
        if (snapshot.empty) {
            // Optionally seed initial admin if needed
            // console.log("No admins found, seeding initial admin...");
            // await addAdminUser({ name: 'Admin Principal', email: 'admin@check2b.com', isActive: true });
            // const seededSnapshot = await getDocs(adminCollection);
            // return seededSnapshot.docs.map(docToAdminUser);
            return [];
        }
        return snapshot.docs.map(docToAdminUser);
    } catch (error) {
        console.error("Error fetching admins:", error);
        throw new Error("Falha ao buscar administradores.");
    }
}

export async function addAdminUser(userData: Omit<AdminUser, 'id' | 'lastLogin'>): Promise<AdminUser> {
     console.log("Adding admin user to Firestore:", userData);
     try {
         // Check for duplicate email
         const q = query(adminCollection, where("email", "==", userData.email));
         const existing = await getDocs(q);
         if (!existing.empty) {
             throw new Error("Email já cadastrado.");
         }

         const adminData = {
            ...userData,
            isActive: userData.isActive ?? true,
            createdAt: Timestamp.now(), // Add a creation timestamp
         };

         const docRef = await addDoc(adminCollection, adminData);

         // In a real app, trigger Firebase Function to send welcome/password setup email here
         console.log(`Real app: Trigger welcome email function for ${userData.email}`);

         return {
             id: docRef.id,
             ...adminData,
             // Convert timestamp back if needed, though not strictly necessary here
             lastLogin: undefined, // No last login initially
         } as AdminUser;
     } catch (error: any) {
         console.error("Error adding admin user:", error);
         // Rethrow specific errors or a generic one
         if (error.message === "Email já cadastrado.") {
             throw error;
         }
         throw new Error("Falha ao adicionar administrador.");
     }
}

export async function updateAdminUser(id: string, userData: Partial<Omit<AdminUser, 'id' | 'lastLogin'>>): Promise<AdminUser> {
    console.log("Updating admin user in Firestore:", id, userData);
    try {
        const adminDocRef = doc(db, 'admins', id);
        const adminDoc = await getDoc(adminDocRef);

        if (!adminDoc.exists()) {
            throw new Error("Administrador não encontrado.");
        }

        // Prevent changing email to an existing one (excluding self)
        if (userData.email) {
            const q = query(adminCollection, where("email", "==", userData.email));
            const existing = await getDocs(q);
            if (!existing.empty && existing.docs[0].id !== id) {
                 throw new Error("Email já pertence a outro administrador.");
            }
        }

        const updateData: Partial<AdminUser> & { updatedAt?: Timestamp } = { ...userData, updatedAt: Timestamp.now() };

        // Remove undefined fields to avoid overwriting with null in Firestore
        Object.keys(updateData).forEach(key => updateData[key as keyof typeof updateData] === undefined && delete updateData[key as keyof typeof updateData]);


        await updateDoc(adminDocRef, updateData);

         // Fetch the updated document to return complete data
         const updatedDoc = await getDoc(adminDocRef);
         return docToAdminUser(updatedDoc as QueryDocumentSnapshot<DocumentData>); // Cast needed as getDoc returns DocumentSnapshot

     } catch (error: any) {
         console.error("Error updating admin user:", error);
          if (error.message.includes("encontrado") || error.message.includes("pertence")) {
             throw error;
         }
         throw new Error("Falha ao atualizar administrador.");
     }
}

export async function deleteAdminUser(id: string): Promise<void> {
     console.log("Deleting admin user from Firestore:", id);
     try {
        const adminDocRef = doc(db, 'admins', id);
        const adminDoc = await getDoc(adminDocRef);

        if (!adminDoc.exists()) {
             throw new Error("Administrador não encontrado para exclusão.");
        }

         // Basic check: Prevent deleting the first admin (example guard based on email/specific ID)
         if (adminDoc.data()?.email === 'admin@check2b.com') { // Adjust if using a different primary identifier
             throw new Error("Não é possível excluir o administrador principal.");
         }

         await deleteDoc(adminDocRef);
         console.log(`Admin ${id} deleted successfully.`);
     } catch (error: any) {
         console.error("Error deleting admin user:", error);
         if (error.message.includes("encontrado") || error.message.includes("principal")) {
            throw error;
         }
         throw new Error("Falha ao excluir administrador.");
     }
}

export async function resetAdminPassword(id: string): Promise<void> {
    console.log("Resetting password for admin (Triggering function):", id);
    try {
        const adminDocRef = doc(db, 'admins', id);
        const adminDoc = await getDoc(adminDocRef);
        if (!adminDoc.exists()) {
            throw new Error("Administrador não encontrado.");
        }
        const adminEmail = adminDoc.data()?.email;
        if (!adminEmail) {
             throw new Error("Email do administrador não encontrado.");
        }
        // This would trigger a password reset email flow (e.g., via Firebase Auth or a custom backend function)
        // For Firebase Auth: import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
        // const auth = getAuth(); await sendPasswordResetEmail(auth, adminEmail);
        console.log(`Real app: Trigger password reset function for ${adminEmail}`);
    } catch (error: any) {
         console.error("Error initiating password reset:", error);
         if (error.message.includes("encontrado")) {
             throw error;
         }
         throw new Error("Falha ao iniciar redefinição de senha.");
    }
}

// Helper to get admin document reference
async function getDoc(ref: any): Promise<DocumentData> {
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
        throw new Error('Documento não encontrado');
    }
    return docSnap;
}
