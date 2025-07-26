
import type { Employee } from '@/types/employee';

const DEFAULT_ORG_ID = 'org_default'; // Define a default org ID for mock data

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Alice Silva', email: 'alice.silva@check2b.com', phone: '11987654321', department: 'RH', role: 'Recrutadora', admissionDate: '2023-01-15', isActive: true, photoUrl: 'https://picsum.photos/id/1027/80/80', organizationId: DEFAULT_ORG_ID },
  { id: '2', name: 'Beto Santos', email: 'beto.santos@check2b.com', phone: '21912345678', department: 'Engenharia', role: 'Desenvolvedor Backend', admissionDate: '2022-08-20', isActive: true, photoUrl: 'https://picsum.photos/id/1005/80/80', organizationId: DEFAULT_ORG_ID },
  { id: '3', name: 'Carla Dias', email: 'carla.dias@check2b.com', phone: '31976543210', department: 'Marketing', role: 'Analista de Marketing', admissionDate: '2023-05-10', isActive: false, photoUrl: 'https://picsum.photos/id/1011/80/80', organizationId: DEFAULT_ORG_ID },
  { id: '4', name: 'Davi Costa', email: 'davi.costa@check2b.com', phone: '41988887777', department: 'Vendas', role: 'Executivo de Contas', admissionDate: '2021-11-01', isActive: true, photoUrl: 'https://picsum.photos/id/338/80/80', organizationId: DEFAULT_ORG_ID },
  { id: '5', name: 'Eva Pereira', email: 'eva.pereira@check2b.com', phone: '51977776666', department: 'Engenharia', role: 'Desenvolvedora Frontend', admissionDate: '2023-03-22', isActive: true, photoUrl: 'https://picsum.photos/id/349/80/80', organizationId: DEFAULT_ORG_ID },
  { id: '6', name: 'Leo Corax', email: 'leocorax@gmail.com', phone: '99999999999', department: 'Engenharia', role: 'Desenvolvedor Frontend', admissionDate: '2024-01-01', isActive: true, photoUrl: 'https://placehold.co/80x80.png', organizationId: DEFAULT_ORG_ID },
  { id: 'wgpM4OgAVFSVhM8NXKVpVwx0mCl2', name: 'Leo Corax', email: 'leocorax@gmail.com', phone: '99999999999', department: 'Engenharia', role: 'Desenvolvedor Frontend', admissionDate: '2024-01-01', isActive: true, photoUrl: 'https://placehold.co/80x80.png', organizationId: DEFAULT_ORG_ID },
];
