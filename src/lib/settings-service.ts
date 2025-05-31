// src/lib/settings-service.ts
import { getDb } from './firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

const APP_SETTINGS_COLLECTION = 'appSettings';
const GENERAL_SETTINGS_DOC_ID = 'general';

export interface GeneralSettingsData {
  bonusValue: number;
  zeroLimit: number;
  updatedAt?: Date;
  // organizationId is not stored IN the document, but is part of the path
}

/**
 * Fetches general application settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @returns Promise resolving to GeneralSettingsData object or null if not found/error.
 */
export const getGeneralSettings = async (organizationId: string): Promise<GeneralSettingsData | null> => {
  const db = getDb();
  if (!db || !organizationId) {
    console.error('[SettingsService] Firestore not initialized or organizationId missing for getGeneralSettings.');
    return null;
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/${APP_SETTINGS_COLLECTION}`, GENERAL_SETTINGS_DOC_ID);
  try {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        bonusValue: data.bonusValue,
        zeroLimit: data.zeroLimit,
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined,
      } as GeneralSettingsData;
    }
    // Return default settings if none found in DB, or null to indicate fresh setup
    return {
        bonusValue: 100, // Default example
        zeroLimit: 3,    // Default example
    };
  } catch (error) {
    console.error(`[SettingsService] Error fetching general settings for org ${organizationId}:`, error);
    throw error;
  }
};

/**
 * Saves general application settings for a specific organization.
 * @param organizationId The ID of the organization.
 * @param settingsData The general settings data to save.
 * @returns Promise resolving on successful save.
 */
export const saveGeneralSettings = async (organizationId: string, settingsData: Pick<GeneralSettingsData, 'bonusValue' | 'zeroLimit'>): Promise<void> => {
  const db = getDb();
  if (!db || !organizationId) {
    throw new Error('[SettingsService] Firestore not initialized or organizationId missing for saveGeneralSettings.');
  }
  const settingsDocRef = doc(db, `organizations/${organizationId}/${APP_SETTINGS_COLLECTION}`, GENERAL_SETTINGS_DOC_ID);
  try {
    await setDoc(settingsDocRef, {
      ...settingsData,
      updatedAt: serverTimestamp(),
    }, { merge: true }); // Use merge to create if not exists, or update if exists
  } catch (error) {
    console.error(`[SettingsService] Error saving general settings for org ${organizationId}:`, error);
    throw error;
  }
};
