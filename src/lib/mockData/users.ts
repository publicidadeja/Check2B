
import type { UserProfile } from '@/types/user';

// Added a Super Admin user to mock data
export const mockUsers: UserProfile[] = [
    {
        uid: 'superadmin001', // Example UID
        name: 'Super Admin',
        email: 'super@check2b.com',
        role: 'super_admin',
        organizationId: null, // Super admins don't belong to an org
        createdAt: new Date(2023, 0, 1),
        status: 'active',
    },
    {
        uid: 'admin001',
        name: 'Admin Principal (Empresa Padrão)',
        email: 'admin@check2b.com',
        role: 'admin',
        organizationId: 'org_default',
        createdAt: new Date(2023, 5, 14),
        status: 'active',
    },
    {
        uid: 'collab001',
        name: 'Alice Silva',
        email: 'alice.silva@check2b.com',
        role: 'collaborator',
        organizationId: 'org_default',
        createdAt: new Date(2023, 1, 15),
        status: 'active',
        department: 'RH',
        phone: '11987654321',
        photoUrl: 'https://picsum.photos/id/1027/40/40'
    },
     {
        uid: 'collab002',
        name: 'Leo Corax',
        email: 'leocorax@gmail.com',
        role: 'collaborator',
        organizationId: 'org_default',
        createdAt: new Date(2024, 0, 10),
        status: 'active',
        department: 'Engenharia',
        phone: '61988885555',
    },
    // Add more mock users as needed for testing different roles and organizations
];

// Optionally, export functions to get users by role or org if needed for testing
export const getMockAdmins = (orgId: string) => mockUsers.filter(u => u.role === 'admin' && u.organizationId === orgId);
export const getMockCollaborators = (orgId: string) => mockUsers.filter(u => u.role === 'collaborator' && u.organizationId === orgId);
