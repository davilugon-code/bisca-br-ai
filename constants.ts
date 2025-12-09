import { Card, Rank, Suit } from './types';
import { BookOpen, Diamond, Club, Spade, Heart } from 'lucide-react';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
// Rank order for Bisca: A, 7, K, J, Q, 6, 5, 4, 3, 2
// Note: In some regions Q=2, J=3, K=4. In others K=4, J=3, Q=2. 
// We will use the standard Portuguese/Brazilian hierarchical order:
// A (11), 7 (10), K (4), J (3), Q (2), 6, 5, 4, 3, 2 (0)
export const RANKS: Rank[] = ['A', '7', 'K', 'J', 'Q', '6', '5', '4', '3', '2'];

export const CARD_VALUES: Record<Rank, number> = {
  'A': 11,
  '7': 10,
  'K': 4,
  'J': 3,
  'Q': 2,
  '6': 0,
  '5': 0,
  '4': 0,
  '3': 0,
  '2': 0,
};

export const CARD_POWER: Record<Rank, number> = {
  'A': 10,
  '7': 9,
  'K': 8,
  'J': 7,
  'Q': 6,
  '6': 5,
  '5': 4,
  '4': 3,
  '3': 2,
  '2': 1,
};

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        value: CARD_VALUES[rank],
        power: CARD_POWER[rank],
      });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
};

export const getSuitIcon = (suit: Suit) => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

export const getSuitColor = (suit: Suit) => {
  return (suit === 'hearts' || suit === 'diamonds') ? 'text-red-600' : 'text-gray-900';
};
