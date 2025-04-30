
'use server';

import { currentSettings as settingsStore } from './mock-data'; // Import shared store

// Define the Settings interface
export interface AppSettings {
  bonusValuePerPoint: number;
  maxZerosThreshold: number;
  enableAutoReports: boolean;
  notificationFrequency: 'daily' | 'weekly' | 'monthly' | 'never'; // Example options
  // Add other settings as needed
  // e.g., companyName?: string;
  // e.g., defaultEmailSignature?: string;
}


// --- Mock API Functions ---

/**
 * Asynchronously retrieves the current application settings.
 *
 * @returns A promise that resolves to the AppSettings object.
 */
export async function getSettings(): Promise<AppSettings> {
    console.log("Fetching settings (mock)...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 50));
    // Return a copy to prevent direct modification
    return { ...settingsStore }; // Use shared store
}

/**
 * Asynchronously saves updated application settings.
 *
 * @param newSettings A partial AppSettings object containing the settings to update.
 * @returns A promise that resolves to the fully updated AppSettings object.
 * @throws Error if validation fails.
 */
export async function saveSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
    console.log("Saving settings (mock):", newSettings);
    // Simulate API delay and potential validation
    await new Promise(resolve => setTimeout(resolve, 150));

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

    // Merge the new settings into the shared settings store
    Object.assign(settingsStore, newSettings);

    console.log("Settings updated (mock):", settingsStore);
    // Return a copy of the updated settings
    return { ...settingsStore };
}
