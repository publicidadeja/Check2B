
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
    orderBy,
    Timestamp,
    DocumentData,
    QueryDocumentSnapshot,
    Query,
    getCountFromServer // Import getCountFromServer
} from 'firebase/firestore';

// Define the Department interface
export interface Department {
    id: string;
    name: string;
    createdAt?: Timestamp;
    // Add other relevant fields like managerId, description etc. if needed
}

const departmentsCollection = collection(db, 'departments');

// Helper to convert Firestore doc to Department
const docToDepartment = (doc: QueryDocumentSnapshot<DocumentData>): Department => {
    const data = doc.data();
    return {
        id: doc.id,
        name: data.name,
        createdAt: data.createdAt,
    };
};

// --- Firestore API Functions ---

export async function getAllDepartments(): Promise<Department[]> {
    console.log("Fetching departments from Firestore...");
    try {
        const q = query(departmentsCollection, orderBy("name")); // Order alphabetically
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docToDepartment);
    } catch (error) {
        console.error("Error fetching departments:", error);
        throw new Error("Falha ao buscar departamentos.");
    }
}

export async function addDepartment(name: string): Promise<Department> {
    console.log("Adding department to Firestore:", name);
    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Nome do departamento não pode ser vazio.");
    }

    try {
        // Check for duplicates (case-insensitive)
        const q = query(departmentsCollection, where("nameLower", "==", trimmedName.toLowerCase()));
        const existing = await getDocs(q);
        if (!existing.empty) {
            throw new Error(`Departamento "${trimmedName}" já existe.`);
        }

        const newDepartmentData = {
            name: trimmedName,
            nameLower: trimmedName.toLowerCase(), // Store lowercase for case-insensitive checks
            createdAt: Timestamp.now(),
        };

        const docRef = await addDoc(departmentsCollection, newDepartmentData);
        return {
            id: docRef.id,
            ...newDepartmentData,
        } as Department;

    } catch (error: any) {
        console.error("Error adding department:", error);
        if (error.message.includes("já existe")) {
            throw error;
        }
        throw new Error("Falha ao adicionar departamento.");
    }
}

export async function updateDepartment(id: string, name: string): Promise<Department> {
    console.log("Updating department in Firestore:", id, name);
    const trimmedName = name.trim();
    if (!trimmedName) {
        throw new Error("Nome do departamento não pode ser vazio.");
    }

    try {
        const deptDocRef = doc(db, 'departments', id);
        const deptDoc = await getDoc(deptDocRef);

        if (!deptDoc.exists()) {
            throw new Error("Departamento não encontrado.");
        }

        // Check if new name conflicts with another department (case-insensitive)
        const q = query(departmentsCollection, where("nameLower", "==", trimmedName.toLowerCase()));
        const existing = await getDocs(q);
        if (!existing.empty && existing.docs[0].id !== id) {
            throw new Error(`Outro departamento já possui o nome "${trimmedName}".`);
        }

        const updateData = {
            name: trimmedName,
            nameLower: trimmedName.toLowerCase(),
            updatedAt: Timestamp.now(),
        };

        await updateDoc(deptDocRef, updateData);

        // Fetch the updated document to return complete data
        const updatedDoc = await getDoc(deptDocRef);
        return docToDepartment(updatedDoc as QueryDocumentSnapshot<DocumentData>); // Cast needed

    } catch (error: any) {
        console.error("Error updating department:", error);
        if (error.message.includes("encontrado") || error.message.includes("possui o nome")) {
            throw error;
        }
        throw new Error("Falha ao atualizar departamento.");
    }
}

export async function deleteDepartment(id: string): Promise<void> {
    console.log("Deleting department from Firestore:", id);
    try {
        const deptDocRef = doc(db, 'departments', id);
        const deptDoc = await getDoc(deptDocRef);

        if (!deptDoc.exists()) {
             throw new Error("Departamento não encontrado para exclusão.");
        }

         // **Important Check:** Verify if any employees are linked to this department before deleting.
         const employeesCollection = collection(db, 'employees');
         const q = query(employeesCollection, where("department", "==", deptDoc.data().name), limit(1)); // Check if at least one exists
         const employeeSnapshot = await getDocs(q);
         if (!employeeSnapshot.empty) {
             throw new Error(`Não é possível excluir o departamento "${deptDoc.data().name}" pois existem colaboradores associados.`);
         }
        // TODO: Add similar checks for Tasks, Challenges, Rewards if they reference department name directly

        await deleteDoc(deptDocRef);
        console.log(`Department ${id} deleted successfully.`);
    } catch (error: any) {
        console.error("Error deleting department:", error);
        if (error.message.includes("encontrado") || error.message.includes("colaboradores associados")) {
            throw error;
        }
        throw new Error("Falha ao excluir departamento.");
    }
}


// Helper to get document snapshot
async function getDoc(ref: any): Promise<DocumentData> {
    const docSnap = await getDoc(ref);
    if (!docSnap.exists()) {
        throw new Error('Documento não encontrado');
    }
    return docSnap;
}

// Helper function needed by deleteDepartment - consider moving getDocs to a shared utils?
async function getDocs(query: Query): Promise<{ empty: boolean; docs: QueryDocumentSnapshot[] }> {
    const snapshot = await getDocs(query);
    return {
        empty: snapshot.empty,
        docs: snapshot.docs,
    };
}
// Helper function needed by deleteDepartment - consider moving limit to a shared utils?
function limit(n: number): any { // Simplified type, adjust as per actual Firestore v9 usage if needed
    return (query: Query) => query.limit(n);
}
