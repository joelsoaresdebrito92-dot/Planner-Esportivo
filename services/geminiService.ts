
import { GoogleGenAI, Type } from "@google/genai";
import { DayPlan } from "../types";

export const analyzeDayPicks = async (dayPlan: DayPlan): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  const gamesText = dayPlan.games
    .filter(g => g.match && g.league)
    .map(g => `- ${g.time}: ${g.match} (${g.league})`)
    .join('\n');

  if (!gamesText) return "Adicione jogos para receber uma análise da IA.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analise estes jogos de apostas para o dia ${dayPlan.date}:\n${gamesText}\nForneça um resumo rápido sobre a dificuldade dos confrontos e uma dica estratégica curta.`,
      config: {
        temperature: 0.7,
      }
    });

    return response.text || "Não foi possível gerar análise no momento.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Erro ao conectar com a inteligência artificial.";
  }
};
