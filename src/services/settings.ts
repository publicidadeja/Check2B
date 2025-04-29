
'use server';

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

// Mock initial settings data (replace with database storage/retrieval)
let currentSettings: AppSettings = {
  bonusValuePerPoint: 1.50,
  maxZerosThreshold: 5,
  enableAutoReports: true,
  notificationFrequency: 'daily',
};

// --- Mock API Functions ---

/**
 * Asynchronously retrieves the current application settings.
 *
 * @returns A promise that resolves to the AppSettings object.
 */
export async function getSettings(): Promise<AppSettings> {
    console.log("Fetching settings (mock)...");
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200));
    // Return a copy to prevent direct modification
    return { ...currentSettings };
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
    await new Promise(resolve => setTimeout(resolve, 500));

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

    // Merge the new settings into the current settings
    currentSettings = { ...currentSettings, ...newSettings };

    console.log("Settings updated (mock):", currentSettings);
    // Return a copy of the updated settings
    return { ...currentSettings };
}
