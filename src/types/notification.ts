export interface Notification {
  id: string;
  type: 'evaluation' | 'challenge' | 'ranking' | 'announcement' | 'system' | 'info'; // Added 'info'
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string; // Optional link to related page
}
