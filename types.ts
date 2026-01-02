
export interface GameEntry {
  id: string;
  time: string;
  league: string;
  match: string;
  status: 'pending' | 'win' | 'loss' | 'void';
}

export interface DayPlan {
  date: string; // ISO format YYYY-MM-DD
  games: GameEntry[];
}

export type AppData = Record<string, DayPlan>;

export interface AIAnalysisResponse {
  summary: string;
  confidence: string;
  advice: string;
}
