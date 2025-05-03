
import type { Employee } from '@/types/employee';

const DEFAULT_ORG_ID = 'org_default'; // Define a default org ID for mock data

// Moved mock data here to avoid direct import from page file
export let mockEmployees: Employee[] = [
  { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/40/40', organizationId: DEFAULT_ORG_ID },
  { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/40/40', organizationId: DEFAULT_ORG_ID },
  { id: '3', name: 'Carla Mendes', email: 'carla.mendes@check2b.com', phone: '31999998888', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false, organizationId: DEFAULT_ORG_ID },
  { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/40/40', organizationId: DEFAULT_ORG_ID },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true, organizationId: DEFAULT_ORG_ID },
  { id: '6', name: 'Leo Corax', email: 'leocorax@gmail.com', phone: '61988885555', department: 'Engenharia', role: 'Desenvolvedor Frontend', admissionDate: '2024-01-10', isActive: true, organizationId: DEFAULT_ORG_ID },
];
