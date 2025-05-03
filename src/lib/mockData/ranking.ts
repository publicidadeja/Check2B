
import type { RankingEntry, Award as AdminAward, AwardHistoryEntry } from '@/app/(admin)/ranking/page'; // Adjust import path if needed
import { format, parseISO } from 'date-fns';
import { getDb } from '@/lib/firebase'; // Import getDb
import { getAwardById } from '@/lib/ranking-service'; // Import getAwardById

// Mock Data for Ranking
export const mockRanking: RankingEntry[] = [
    { rank: 1, employeeId: '1', employeeName: 'Alice Silva', department: 'RH', role: 'Recrutadora', score: 980, zeros: 0, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1027/40/40' },
    { rank: 2, employeeId: '4', employeeName: 'Davi Costa', department: 'Vendas', role: 'Executivo de Contas', score: 950, zeros: 1, trend: 'stable', employeePhotoUrl: 'https://picsum.photos/id/338/40/40' },
    { rank: 3, employeeId: '5', employeeName: 'Eva Pereira', department: 'Engenharia', role: 'Desenvolvedora Frontend', score: 945, zeros: 1, trend: 'down', employeePhotoUrl: 'https://picsum.photos/id/1005/40/40' },
    { rank: 4, employeeId: '2', employeeName: 'Beto Santos', department: 'Engenharia', role: 'Desenvolvedor Backend', score: 920, zeros: 2, trend: 'up', employeePhotoUrl: 'https://picsum.photos/id/1005/40/40' },
    { rank: 5, employeeId: '6', employeeName: 'Leo Corax', department: 'Engenharia', role: 'Desenvolvedor Frontend', score: 890, zeros: 3, trend: 'stable', employeePhotoUrl: 'https://picsum.photos/seed/leo/40/40' },
];

export const mockHistory: AwardHistoryEntry[] = [
    { id: 'hist1', period: '2024-07', awardTitle: 'Destaque Operacional - Julho', winners: [{ rank: 1, employeeName: 'Beto Santos', prize: 'Folga adicional' }], notes: 'Entrega realizada na reunião semanal.' },
    { id: 'hist2', period: '2024-06', awardTitle: 'Colaborador do Mês', winners: [{ rank: 1, employeeName: 'Alice Silva', prize: 'R$ 500,00' }], deliveryPhotoUrl: 'https://picsum.photos/seed/award6/200/100' },
];

export const mockDepartments = ['RH', 'Engenharia', 'Marketing', 'Vendas', 'Operações'];

// Mock employees for simple selection/display
export const mockEmployeesSimple = [
    { id: '1', name: 'Alice Silva', role: 'Recrutadora', department: 'RH' },
    { id: '2', name: 'Beto Santos', role: 'Desenvolvedor Backend', department: 'Engenharia' },
    { id: '4', name: 'Davi Costa', role: 'Executivo de Contas', department: 'Vendas' },
    { id: '5', name: 'Eva Pereira', role: 'Desenvolvedora Frontend', department: 'Engenharia' },
     { id: '6', name: 'Leo Corax', role: 'Desenvolvedor Frontend', department: 'Engenharia' },
];


// Mock API Functions (kept here for organization)

export const fetchRankingData = async (period: Date): Promise<RankingEntry[]> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    // Simulate data changes based on month for demo
    const monthFactor = period.getMonth() + 1;
    return mockRanking.map(entry => ({
        ...entry,
        score: Math.max(800, entry.score + (monthFactor * 5 - 20)), // Adjust score slightly per month
        zeros: Math.max(0, entry.zeros + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.8 ? 1 : 0)), // Simulate zero changes
    })).sort((a, b) => b.score - a.score || a.zeros - b.zeros) // Re-sort based on simulated scores
      .map((entry, index) => ({ ...entry, rank: index + 1 })); // Re-assign ranks
}


export const confirmWinners = async (period: string, awardId: string, winners: RankingEntry[]): Promise<AwardHistoryEntry> => {
     await new Promise(resolve => setTimeout(resolve, 1000));
     const db = getDb();
      if (!db) throw new Error("Database not initialized");

      // Fetch the specific award details
     const award = await getAwardById(db, awardId);
      if (!award) throw new Error("Award not found");


     // Create history entry based on the winners provided and award definition
     const historyEntry: AwardHistoryEntry = {
         id: `hist${Date.now()}`,
         period: period,
         awardTitle: award.title,
         winners: winners.slice(0, award.winnerCount).map(winner => ({
             rank: winner.rank,
             employeeName: winner.employeeName,
             // Determine prize based on position or default award value
             prize: award.valuesPerPosition?.[winner.rank]?.monetary
                 ? `R$ ${award.valuesPerPosition[winner.rank]?.monetary?.toFixed(2)}`
                 : award.valuesPerPosition?.[winner.rank]?.nonMonetary
                 ? award.valuesPerPosition[winner.rank]?.nonMonetary ?? ''
                 : award.monetaryValue ? `R$ ${award.monetaryValue.toFixed(2)}` : award.nonMonetaryValue || 'Prêmio Indefinido'
         })),
     };
     mockHistory.unshift(historyEntry); // Add to the beginning of the mock history array
     console.log("Vencedores confirmados e histórico atualizado (mock):", historyEntry);
     // TODO: In a real app, save historyEntry to Firestore collection `awardHistory`
     return historyEntry;
}

    