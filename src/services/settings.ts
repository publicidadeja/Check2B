
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp, DocumentData } from 'firebase/firestore';

// Define the Settings interface
export interface AppSettings {
  bonusValuePerPoint: number;
  maxZerosThreshold: number;
  enableAutoReports: boolean;
  notificationFrequency: 'daily' | 'weekly' | 'monthly' | 'never'; // Example options
  // Add other settings as needed
  // e.g., companyName?: string;
  // e.g., defaultEmailSignature?: string;
  updatedAt?: Timestamp; // Add an update timestamp
}

// Reference to the single document storing settings
const settingsDocRef = doc(db, 'systemSettings', 'global'); // Collection 'systemSettings', Document 'global'

const defaultSettings: AppSettings = {
  bonusValuePerPoint: 0, // Default to 0 if not set
  maxZerosThreshold: 5, // Default to 5 if not set
  enableAutoReports: false,
  notificationFrequency: 'never',
};

// --- Firestore API Functions ---

/**
 * Asynchronously retrieves the current application settings from Firestore.
 * If the settings document doesn't exist, it creates it with default values.
 *
 * @returns A promise that resolves to the AppSettings object.
 */
export async function getSettings(): Promise<AppSettings> {
    console.log("Fetching settings from Firestore...");
    try {
        const docSnap = await getDoc(settingsDocRef);

        if (!docSnap.exists()) {
            console.log("Settings document not found, creating with defaults...");
            await setDoc(settingsDocRef, { ...defaultSettings, createdAt: Timestamp.now() });
            return { ...defaultSettings }; // Return defaults immediately
        }

        const data = docSnap.data() as DocumentData;
        // Merge fetched data with defaults to ensure all keys exist
        return {
            ...defaultSettings, // Start with defaults
            ...data, // Overwrite with fetched data
             // Ensure numbers are numbers, handle potential string storage if needed (though Firestore should handle types)
            bonusValuePerPoint: Number(data.bonusValuePerPoint ?? defaultSettings.bonusValuePerPoint),
            maxZerosThreshold: Number(data.maxZerosThreshold ?? defaultSettings.maxZerosThreshold),
        };

    } catch (error) {
        console.error("Error fetching settings:", error);
        throw new Error("Falha ao carregar configurações.");
    }
}

/**
 * Asynchronously saves updated application settings to Firestore.
 * Uses setDoc with merge:true to update only provided fields or create if non-existent.
 *
 * @param newSettings A partial AppSettings object containing the settings to update.
 * @returns A promise that resolves to the fully updated AppSettings object after saving.
 * @throws Error if validation fails.
 */
export async function saveSettings(newSettings: Partial<Omit<AppSettings, 'updatedAt'>>): Promise<AppSettings> {
    console.log("Saving settings to Firestore:", newSettings);

    // --- Basic Validation Example ---
    if (newSettings.bonusValuePerPoint !== undefined) {
        const value = Number(newSettings.bonusValuePerPoint);
        if (isNaN(value) || value < 0) {
            throw new Error("Valor do Bônus por Ponto deve ser um número não negativo.");
        }
        // Round to 2 decimal places for currency/percentage
        newSettings.bonusValuePerPoint = parseFloat(value.toFixed(2));
    }
     if (newSettings.maxZerosThreshold !== undefined) {
        const value = Number(newSettings.maxZerosThreshold);
        if (!Number.isInteger(value) || value < 0) {
            throw new Error("Limite Máximo de Zeros deve ser um número inteiro não negativo.");
        }
         newSettings.maxZerosThreshold = value;
    }
     if (newSettings.enableAutoReports !== undefined && typeof newSettings.enableAutoReports !== 'boolean') {
         throw new Error("Configuração de Relatórios Automáticos inválida.");
     }
     if (newSettings.notificationFrequency !== undefined) {
        const allowedFrequencies: AppSettings['notificationFrequency'][] = ['daily', 'weekly', 'monthly', 'never'];
        if (!allowedFrequencies.includes(newSettings.notificationFrequency)) {
             throw new Error("Frequência de Notificação inválida.");
        }
     }
     // Add more validation as needed...

    try {
        const dataToSave = {
            ...newSettings,
            updatedAt: Timestamp.now(), // Add/update the timestamp
        };

        // Remove undefined fields explicitly before saving
        Object.keys(dataToSave).forEach(key => dataToSave[key as keyof typeof dataToSave] === undefined && delete dataToSave[key as keyof typeof dataToSave]);


        // Use setDoc with merge: true to update/create the document
        await setDoc(settingsDocRef, dataToSave, { merge: true });

        console.log("Settings updated successfully in Firestore.");

        // Fetch the latest settings after saving to return the complete, current state
        return await getSettings();

    } catch (error: any) {
        console.error("Error saving settings:", error);
         // Rethrow specific validation errors
         if (error.message.includes("inválido") || error.message.includes("não negativo")) {
             throw error;
         }
        throw new Error("Falha ao salvar configurações.");
    }
}
