import React from 'react';
import { Card } from './Card';
import { Card as CardType, Suit } from '../types';
import { getSuitIcon } from '../constants';
import clsx from 'clsx';

interface GameTableProps {
  tableCards: { card: CardType; playerIndex: number }[];
  trumpCard: CardType | null;
  trumpSuit: Suit | null;
  deckCount: number;
  winnerIndex: number | null;
}

export const GameTable: React.FC<GameTableProps> = ({ 
  tableCards, 
  trumpCard, 
  trumpSuit,
  deckCount,
  winnerIndex
}) => {
  // Map playerIndex to position class relative to bottom (user)
  const getCardPosition = (playerIndex: number) => {
    switch(playerIndex) {
      case 0: return 'translate-y-8 z-10'; // Bottom (User)
      case 1: return '-translate-x-12 -rotate-90 z-0'; // Left
      case 2: return '-translate-y-8 z-0'; // Top
      case 3: return 'translate-x-12 rotate-90 z-0'; // Right
      default: return '';
    }
  };

  return (
    <div className="relative flex-1 w-full max-w-4xl mx-auto flex items-center justify-center min-h-[360px]">
      {/* Background decoration */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
        <div className="w-64 h-64 rounded-full border-4 border-white"></div>
        <div className="absolute w-full h-px bg-white/20"></div>
        <div className="absolute h-full w-px bg-white/20"></div>
      </div>

      {/* Trump Card Area - Moved to Center Left */}
      <div className="absolute left-2 md:left-10 top-1/2 -translate-y-1/2 flex flex-col items-center z-0">
        {deckCount > 0 && (
          <div className="relative mb-2">
             {/* The Trump Card */}
            {trumpCard && (
               <div className="transform rotate-90 translate-x-6 translate-y-2">
                 <Card card={trumpCard} size="sm" disabled />
               </div>
            )}
            {/* The Deck */}
            <div className="absolute top-0 left-0">
               <Card size="sm" />
               <div className="absolute -top-2 -right-2 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg z-10">
                 {deckCount}
               </div>
            </div>
          </div>
        )}
        
        {/* Trump Suit Icon if deck empty */}
        {deckCount === 0 && trumpSuit && (
           <div className="bg-white/10 p-2 rounded-full backdrop-blur-sm border border-white/20 flex flex-col items-center shadow-lg">
             <span className="text-white text-[10px] uppercase tracking-widest mb-1">Trunfo</span>
             <span className="text-2xl text-yellow-400">{getSuitIcon(trumpSuit)}</span>
           </div>
        )}
      </div>

      {/* Played Cards Center */}
      <div className="relative w-64 h-64 flex items-center justify-center z-10">
        {tableCards.length === 0 && !winnerIndex && (
           <div className="absolute text-white/30 text-sm font-medium tracking-widest uppercase animate-pulse">
              Mesa Limpa
           </div>
        )}

        {tableCards.map((play, index) => (
          <div 
            key={`${play.playerIndex}-${play.card.id}`}
            className={clsx(
              "absolute transition-all duration-500 ease-out shadow-2xl",
              getCardPosition(play.playerIndex)
            )}
          >
            <Card card={play.card} size="md" disabled className="shadow-2xl ring-2 ring-black/20" />
            <div className={clsx(
                "absolute -bottom-6 w-full text-center text-[10px] font-bold text-white uppercase tracking-wider bg-black/40 rounded-full px-1 py-0.5",
                play.playerIndex === 1 && "rotate-90 bottom-auto -right-10 top-1/2 -translate-y-1/2",
                play.playerIndex === 3 && "-rotate-90 bottom-auto -left-10 top-1/2 -translate-y-1/2",
                play.playerIndex === 2 && "bottom-auto -top-6"
            )}>
                {play.playerIndex === 0 ? 'Você' : 
                 play.playerIndex === 1 ? 'Esq' :
                 play.playerIndex === 2 ? 'Parceiro' : 'Dir'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};