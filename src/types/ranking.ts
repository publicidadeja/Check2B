
// src/types/ranking.ts
export interface RankingSettings {
  // organizationId will be the document ID in Firestore for the parent organization
  // These settings will be stored in a specific document, e.g., organizations/{orgId}/rankingManagement/config
  id?: string; // Document ID, typically 'config' or a fixed identifier
  tieBreaker: 'zeros' | 'admissionDate' | 'manual'; // Critério de desempate
  includeProbation: boolean; // Incluir colaboradores em período probatório
  publicViewEnabled: boolean; // Permitir que colaboradores visualizem o ranking
  notificationLevel: 'none' | 'top3' | 'significant' | 'all'; // Nível de notificação para colaboradores
  updatedAt?: Date; // Timestamp da última atualização
}

// Data for saving, can omit id and updatedAt as they are managed by Firestore or service
export type RankingSettingsData = Omit<RankingSettings, 'id' | 'updatedAt'>;
