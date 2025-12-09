import { GoogleGenAI, Type } from "@google/genai";
import { Card, Suit, AiMoveResponse, GameMode } from '../types';

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!genAI) {
    let apiKey = '';
    try {
      // Access process.env securely. The index.html polyfill ensures window.process exists.
      // @ts-ignore
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        // @ts-ignore
        apiKey = process.env.API_KEY;
      }
    } catch (e) {
      console.warn("Could not read API Key from process.env");
    }
    
    // Initialize even if key is empty to prevent app crash on load.
    // The error will only happen when actually trying to generate content.
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
};

export const getAiMove = async (
  aiHand: Card[],
  tableCards: { card: Card; playerIndex: number }[],
  trumpSuit: Suit,
  team0Score: number,
  team1Score: number,
  cardsRemaining: number,
  myPlayerIndex: number, // 1, 2, or 3 (or 1 in 1v1)
  startingPlayerIndex: number,
  mode: GameMode
): Promise<AiMoveResponse> => {
  try {
    const ai = getGenAI();
    
    let prompt = "";
    const handStr = aiHand.map((c, i) => `${i}: ${c.rank} of ${c.suit}`).join(', ');

    if (mode === '1v1') {
        // 1v1 Context
        const myScore = team1Score;
        const enemyScore = team0Score;

        const tableStr = tableCards.length > 0 
          ? tableCards.map(p => `Enemy played ${p.card.rank} of ${p.card.suit}`).join('; ')
          : 'Table is empty (You lead)';

        prompt = `
          You are playing a 1vs1 game of Bisca (Brazilian Card Game).
          You are the AI Opponent.
          Current Trump Suit: ${trumpSuit}.
          Cards remaining: ${cardsRemaining}.
          Scores - You: ${myScore}, Human: ${enemyScore}.
          Your Hand: [${handStr}]
          Table Cards: ${tableStr}
          Rules: A=11, 7=10, K=4, J=3, Q=2, Others=0.
          Strategy: Play to win rounds or save trumps.
          Return JSON with cardIndex and a short Portuguese phrase (thought).
        `;
    } else {
        // 2v2 Context
        const partnerIndex = (myPlayerIndex + 2) % 4;
        const tableStr = tableCards.length > 0 
          ? tableCards.map(p => {
              const relation = p.playerIndex === partnerIndex ? 'Partner' : 'Enemy';
              return `${relation} played ${p.card.rank} of ${p.card.suit}`;
            }).join('; ')
          : 'Table is empty (You lead)';
        
        const myTeamScore = (myPlayerIndex === 0 || myPlayerIndex === 2) ? team0Score : team1Score;
        const enemyTeamScore = (myPlayerIndex === 0 || myPlayerIndex === 2) ? team1Score : team0Score;

        prompt = `
          You are playing a 2vs2 game of Bisca.
          You are Player ${myPlayerIndex}. Partner: ${partnerIndex}.
          Trump: ${trumpSuit}.
          Scores - Us: ${myTeamScore}, Them: ${enemyTeamScore}.
          Hand: [${handStr}]
          Table: ${tableStr}
          Return JSON with cardIndex and a short Portuguese phrase (thought).
        `;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cardIndex: { type: Type.INTEGER },
            thought: { type: Type.STRING }
          },
          required: ["cardIndex", "thought"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as AiMoveResponse;
    }
    throw new Error("Empty response");

  } catch (error) {
    console.error("AI Error (Playing Random Card):", error);
    // Fail-safe: Se a API falhar (ex: sem chave ou cota), joga a primeira carta e não trava o jogo
    return {
      cardIndex: 0,
      thought: "..."
    };
  }
};