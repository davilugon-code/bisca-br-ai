export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '7' | 'K' | 'J' | 'Q' | '6' | '5' | '4' | '3' | '2';
export type GameMode = '1v1' | '2v2';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number; // Points (A=11, 7=10, K=4, J=3, Q=2, others=0)
  power: number; // For comparison (A=10, 7=9, K=8, J=7, Q=6, 6=5... 2=1)
}

export interface Player {
  index: number;
  type: 'human' | 'ai';
  name: string;
  team: number; // 0 or 1
  hand: Card[];
  pile: Card[]; // Cards won (stored usually by team, but we can track by player for animation, then sum by team)
}

export interface GameState {
  mode: GameMode;
  deck: Card[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  players: Player[]; // Array of 2 or 4 players
  table: {
    card: Card;
    playerIndex: number;
  }[];
  turn: number; // Index of player
  startingPlayerIndex: number; // Who led the current round
  phase: 'betting' | 'playing' | 'gameover';
  winnerTeam: number | 'draw' | null;
  logs: string[];
  scores: {
    team0: number; // Human (+ Partner in 2v2)
    team1: number; // Opponent(s)
  };
}

export interface AiMoveResponse {
  cardIndex: number;
  thought: string;
}