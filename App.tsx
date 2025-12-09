import React, { useState, useEffect, useCallback } from 'react';
import { createDeck } from './constants';
import { Card as CardType, GameState, Suit, Player, GameMode } from './types';
import { Card } from './components/Card';
import { GameTable } from './components/GameTable';
import { getAiMove } from './services/geminiService';
import { RefreshCw, Trophy, Users, AlertCircle, EyeOff, User } from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    mode: '2v2', // Default, but overridden by start
    deck: [],
    trumpCard: null,
    trumpSuit: null,
    players: [],
    table: [],
    turn: 0,
    startingPlayerIndex: 0,
    phase: 'betting',
    winnerTeam: null,
    logs: [],
    scores: { team0: 0, team1: 0 }
  });

  const [aiThinking, setAiThinking] = useState(false);
  const [lastMessage, setLastMessage] = useState<{playerIndex: number, text: string} | null>(null);
  const [roundWinnerIndex, setRoundWinnerIndex] = useState<number | null>(null);
  const [showPartnerHand, setShowPartnerHand] = useState(false);

  const startNewGame = useCallback((mode: GameMode) => {
    const newDeck = createDeck();
    
    let initialPlayers: Player[] = [];
    
    if (mode === '2v2') {
        // 4 Players: 0 (User), 1 (Left), 2 (Partner), 3 (Right)
        const hands = [
            newDeck.splice(0, 3),
            newDeck.splice(0, 3),
            newDeck.splice(0, 3),
            newDeck.splice(0, 3)
        ];
        initialPlayers = [
            { index: 0, type: 'human' as const, name: 'Você', team: 0, hand: hands[0], pile: [] },
            { index: 1, type: 'ai' as const, name: 'Rival Esq', team: 1, hand: hands[1], pile: [] },
            { index: 2, type: 'ai' as const, name: 'Parceiro', team: 0, hand: hands[2], pile: [] },
            { index: 3, type: 'ai' as const, name: 'Rival Dir', team: 1, hand: hands[3], pile: [] }
        ];
    } else {
        // 1v1: 0 (User), 1 (Rival)
        const hands = [
            newDeck.splice(0, 3),
            newDeck.splice(0, 3)
        ];
        initialPlayers = [
            { index: 0, type: 'human' as const, name: 'Você', team: 0, hand: hands[0], pile: [] },
            { index: 1, type: 'ai' as const, name: 'Rival', team: 1, hand: hands[1], pile: [] }
        ];
    }
    
    let effectiveTrumpCard = null;
    let effectiveDeck = [...newDeck];
    
    if (effectiveDeck.length > 0) {
        effectiveTrumpCard = effectiveDeck.shift()!;
        effectiveDeck.push(effectiveTrumpCard);
    }

    setGameState({
      mode,
      deck: effectiveDeck,
      trumpCard: effectiveTrumpCard,
      trumpSuit: effectiveTrumpCard ? effectiveTrumpCard.suit : 'hearts',
      players: initialPlayers,
      table: [],
      turn: 0, // Human starts for simplicity
      startingPlayerIndex: 0,
      phase: 'playing',
      winnerTeam: null,
      logs: ['Jogo iniciado!'],
      scores: { team0: 0, team1: 0 }
    });
    setLastMessage(null);
    setRoundWinnerIndex(null);
    // Only show partner hand if 2v2
    setShowPartnerHand(mode === '2v2'); 
  }, []);

  // Determine winner of the cards on table
  const getRoundWinner = useCallback((table: { card: CardType; playerIndex: number }[], trumpSuit: Suit) => {
    if (table.length === 0) return 0;
    
    let winningPlay = table[0]; 

    for (let i = 1; i < table.length; i++) {
        const currentPlay = table[i];
        const winnerCard = winningPlay.card;
        const currentCard = currentPlay.card;

        const isWinnerTrump = winnerCard.suit === trumpSuit;
        const isCurrentTrump = currentCard.suit === trumpSuit;

        if (isCurrentTrump && !isWinnerTrump) {
            winningPlay = currentPlay;
        } else if (isCurrentTrump && isWinnerTrump) {
            if (currentCard.power > winnerCard.power) {
                winningPlay = currentPlay;
            }
        } else if (!isWinnerTrump && !isCurrentTrump) {
            if (currentCard.suit === winnerCard.suit && currentCard.power > winnerCard.power) {
                winningPlay = currentPlay;
            }
        }
    }
    return winningPlay.playerIndex;
  }, []);

  const resolveRound = useCallback(() => {
    setGameState(prev => {
        const winnerIndex = getRoundWinner(prev.table, prev.trumpSuit!);
        setRoundWinnerIndex(winnerIndex);
        
        const points = prev.table.reduce((sum, play) => sum + play.card.value, 0);
        const winningTeam = prev.players[winnerIndex].team;
        
        // Calculate new scores
        const newScores = { ...prev.scores };
        if (winningTeam === 0) newScores.team0 += points;
        else newScores.team1 += points;

        // Draw phase
        let newDeck = [...prev.deck];
        let newPlayers = [...prev.players];
        const playerCount = newPlayers.length;

        // Everyone draws 1 card, starting from winner
        if (newDeck.length > 0) {
            for (let i = 0; i < playerCount; i++) {
                const playerIdx = (winnerIndex + i) % playerCount;
                if (newDeck.length > 0) {
                    const card = newDeck.shift()!;
                    newPlayers[playerIdx] = {
                        ...newPlayers[playerIdx],
                        hand: [...newPlayers[playerIdx].hand, card]
                    };
                }
            }
        }

        const winnerName = newPlayers[winnerIndex].name;
        
        return {
            ...prev,
            deck: newDeck,
            players: newPlayers,
            scores: newScores,
            logs: [`${winnerName} venceu (+${points}).`],
        };
    });

    setTimeout(() => {
        setGameState(prev => {
            const allHandsEmpty = prev.players.every(p => p.hand.length === 0);
            
            if (allHandsEmpty) {
                 const winnerTeam = prev.scores.team0 > prev.scores.team1 ? 0 : prev.scores.team1 > prev.scores.team0 ? 1 : 'draw';
                 return {
                     ...prev,
                     table: [],
                     phase: 'gameover',
                     winnerTeam,
                     turn: -1
                 };
            }

            const wIndex = getRoundWinner(prev.table, prev.trumpSuit!);
            
            return {
                ...prev,
                table: [],
                turn: wIndex,
                startingPlayerIndex: wIndex
            };
        });
        setRoundWinnerIndex(null);
    }, 2000);

  }, [getRoundWinner, roundWinnerIndex]);

  // Trigger round resolution when table is full
  useEffect(() => {
      const maxCards = gameState.players.length; // 2 or 4
      if (maxCards > 0 && gameState.table.length === maxCards && gameState.phase === 'playing' && roundWinnerIndex === null) {
          resolveRound();
      }
  }, [gameState.table.length, gameState.phase, resolveRound, roundWinnerIndex, gameState.players.length]);

  // AI Turn Logic
  useEffect(() => {
    const maxCards = gameState.players.length;
    if (gameState.phase !== 'playing' || gameState.table.length >= maxCards || showPartnerHand) return;
    
    const currentPlayerIndex = gameState.turn;
    const currentPlayer = gameState.players[currentPlayerIndex];

    if (currentPlayer && currentPlayer.type === 'ai' && !aiThinking) {
        const playAiTurn = async () => {
            setAiThinking(true);
            await new Promise(r => setTimeout(r, 800 + Math.random() * 500)); 

            try {
                const move = await getAiMove(
                    currentPlayer.hand,
                    gameState.table,
                    gameState.trumpSuit!,
                    gameState.scores.team0,
                    gameState.scores.team1,
                    gameState.deck.length,
                    currentPlayerIndex,
                    gameState.startingPlayerIndex,
                    gameState.mode
                );
                
                setLastMessage({ playerIndex: currentPlayerIndex, text: move.thought });

                setGameState(prev => {
                    let cardIndex = move.cardIndex;
                    if (cardIndex < 0 || cardIndex >= prev.players[currentPlayerIndex].hand.length) cardIndex = 0;
                    
                    const card = prev.players[currentPlayerIndex].hand[cardIndex];
                    const newHand = prev.players[currentPlayerIndex].hand.filter((_, i) => i !== cardIndex);
                    const newPlayers = [...prev.players];
                    newPlayers[currentPlayerIndex] = { ...currentPlayer, hand: newHand };
                    
                    const playerCount = prev.players.length;
                    
                    return {
                        ...prev,
                        players: newPlayers,
                        table: [...prev.table, { card, playerIndex: currentPlayerIndex }],
                        turn: (prev.turn + 1) % playerCount
                    };
                });
            } catch (e) {
                console.error(e);
                // Fallback
                setGameState(prev => {
                    const card = prev.players[currentPlayerIndex].hand[0];
                    const newHand = prev.players[currentPlayerIndex].hand.slice(1);
                    const newPlayers = [...prev.players];
                    newPlayers[currentPlayerIndex] = { ...currentPlayer, hand: newHand };
                    const playerCount = prev.players.length;
                    return {
                        ...prev,
                        players: newPlayers,
                        table: [...prev.table, { card, playerIndex: currentPlayerIndex }],
                        turn: (prev.turn + 1) % playerCount
                    };
                });
            } finally {
                setAiThinking(false);
            }
        };
        playAiTurn();
    }
  }, [gameState, aiThinking, showPartnerHand]);

  const handlePlayerCardClick = (cardIndex: number) => {
    const maxCards = gameState.players.length;
    if (gameState.phase !== 'playing' || gameState.turn !== 0 || gameState.table.length >= maxCards || aiThinking || showPartnerHand) return;

    setGameState(prev => {
        const card = prev.players[0].hand[cardIndex];
        const newHand = prev.players[0].hand.filter((_, i) => i !== cardIndex);
        const newPlayers = [...prev.players];
        newPlayers[0] = { ...newPlayers[0], hand: newHand };
        const playerCount = prev.players.length;

        return {
            ...prev,
            players: newPlayers,
            table: [...prev.table, { card, playerIndex: 0 }],
            turn: 1 
        };
    });
  };

  // Helper to get player component for top area
  const getTopPlayer = () => {
    if (gameState.mode === '2v2') {
        // Partner (Index 2)
        return gameState.players[2];
    } else {
        // Opponent (Index 1) in 1v1 sits top
        return gameState.players[1];
    }
  };

  const topPlayer = getTopPlayer();

  return (
    <div className="h-screen bg-green-900 text-gray-100 font-sans selection:bg-yellow-500 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md p-3 flex justify-between items-center border-b border-white/10 shadow-lg z-30 flex-shrink-0">
        <div className="flex items-center gap-2">
           <div className="bg-yellow-500 text-yellow-900 p-2 rounded-lg shadow-inner">
             <Trophy size={20} strokeWidth={3} />
           </div>
           <div>
             <h1 className="font-bold text-lg leading-none">Bisca BR AI</h1>
             <span className="text-xs text-green-300 opacity-80">
                 {gameState.mode === '2v2' ? '2x2 - Parceiros' : '1x1 - Duelo'}
             </span>
           </div>
        </div>

        <div className="flex gap-6 items-center bg-black/20 px-4 py-2 rounded-full border border-white/5">
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest opacity-60">
                    {gameState.mode === '2v2' ? 'Nós' : 'Você'}
                </span>
                <span className="text-2xl font-mono font-bold text-green-400">{gameState.scores.team0}</span>
            </div>
            <div className="h-8 w-px bg-white/20"></div>
            <div className="flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-widest opacity-60">
                    {gameState.mode === '2v2' ? 'Eles' : 'Rival'}
                </span>
                <span className="text-2xl font-mono font-bold text-red-400">{gameState.scores.team1}</span>
            </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 relative flex flex-col justify-between p-2 md:p-4 max-w-5xl mx-auto w-full h-full">
        
        {/* Top Player Area (Partner in 2v2, Opponent in 1v1) */}
        <div className="flex justify-center z-10">
            <div className="flex flex-col items-center relative">
                 <div className="flex gap-1">
                    {/* Hand of Top Player */}
                    {topPlayer?.hand?.map((card, i) => (
                        <Card 
                          key={`top-${i}`} 
                          // If 2v2 partner peeking logic OR game over, show face.
                          card={gameState.phase === 'gameover' ? card : undefined} 
                          size="sm" 
                          className={`transform ${gameState.phase === 'gameover' ? '' : 'rotate-180'} border-blue-900 h-16 w-10 md:w-16 md:h-24`} 
                        />
                    ))}
                    {topPlayer?.hand?.length === 0 && <div className="h-16 w-10"></div>}
                 </div>
                 <div className="flex items-center gap-2 mt-1">
                   <span className={gameState.mode === '2v2' ? "bg-blue-900/50 text-xs px-2 rounded-full" : "bg-red-900/50 text-xs px-2 rounded-full"}>
                       {topPlayer?.name}
                   </span>
                 </div>
            </div>
        </div>

        {/* Middle Section */}
        <div className="flex-1 flex items-center w-full min-h-0">
             {/* Left Player (Only 2v2) */}
             {gameState.mode === '2v2' && (
                 <div className="flex flex-col items-center -mr-4 z-10 w-16">
                     <span className="bg-red-900/50 text-xs px-2 rounded-full mb-1">Rival Esq</span>
                     <div className="flex flex-col gap-1">
                        {gameState.players[1]?.hand?.map((card, i) => (
                            <Card 
                                key={`p1-${i}`} 
                                card={gameState.phase === 'gameover' ? card : undefined}
                                size="sm" 
                                className={`transform ${gameState.phase === 'gameover' ? 'rotate-90' : 'rotate-90'} border-red-900 h-16 w-10 md:w-16 md:h-24`} 
                            />
                        ))}
                     </div>
                 </div>
             )}

             {/* Table */}
             <div className="flex-1 h-full flex items-center justify-center">
                <GameTable 
                    tableCards={gameState.table} 
                    trumpCard={gameState.trumpCard}
                    trumpSuit={gameState.trumpSuit}
                    deckCount={gameState.deck.length}
                    winnerIndex={roundWinnerIndex}
                    mode={gameState.mode}
                />
             </div>

             {/* Right Player (Only 2v2) */}
             {gameState.mode === '2v2' && (
                 <div className="flex flex-col items-center -ml-4 z-10 w-16">
                     <span className="bg-red-900/50 text-xs px-2 rounded-full mb-1">Rival Dir</span>
                     <div className="flex flex-col gap-1">
                        {gameState.players[3]?.hand?.map((card, i) => (
                            <Card 
                                key={`p3-${i}`} 
                                card={gameState.phase === 'gameover' ? card : undefined}
                                size="sm" 
                                className={`transform ${gameState.phase === 'gameover' ? '-rotate-90' : '-rotate-90'} border-red-900 h-16 w-10 md:w-16 md:h-24`} 
                            />
                        ))}
                     </div>
                 </div>
             )}
        </div>

        {/* Floating Chat Bubbles */}
        <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
             {lastMessage && (
                 <div className={`
                    absolute p-3 rounded-2xl shadow-xl text-sm max-w-[200px] bg-white text-gray-900
                    transition-opacity duration-500 animate-in fade-in zoom-in-50
                    ${/* Position logic based on index and mode */ ''}
                    ${gameState.mode === '1v1' && lastMessage.playerIndex === 1 ? 'top-20 left-1/2 -translate-x-1/2 rounded-tl-none' : ''}
                    ${gameState.mode === '2v2' && lastMessage.playerIndex === 1 ? 'top-1/2 left-20 -translate-y-1/2 rounded-bl-none' : ''}
                    ${gameState.mode === '2v2' && lastMessage.playerIndex === 2 ? 'top-20 left-1/2 -translate-x-1/2 rounded-tl-none' : ''}
                    ${gameState.mode === '2v2' && lastMessage.playerIndex === 3 ? 'top-1/2 right-20 -translate-y-1/2 rounded-br-none' : ''}
                 `}>
                    <p className="font-bold text-[10px] text-gray-500 uppercase mb-1">
                        {gameState.players[lastMessage.playerIndex]?.name} diz:
                    </p>
                    "{lastMessage.text}"
                 </div>
             )}
        </div>

        {/* Bottom Player (User) */}
        <div className="flex flex-col items-center gap-2 mb-2 z-20 flex-shrink-0">
             {gameState.turn === 0 && gameState.phase === 'playing' && !showPartnerHand && (
                 <div className="animate-bounce text-yellow-400 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle size={16} /> Sua Vez
                 </div>
             )}
             
             <div className="flex gap-[-1rem] justify-center items-end h-32 md:h-40">
                {gameState.players[0]?.hand?.map((card, i) => (
                    <div key={card.id} className="transition-all hover:z-10 hover:-translate-y-4" style={{ marginLeft: i > 0 ? '-1.5rem' : '0' }}>
                        <Card 
                            card={card} 
                            onClick={() => handlePlayerCardClick(i)}
                            isPlayable={gameState.turn === 0 && !aiThinking && !showPartnerHand}
                            disabled={gameState.turn !== 0 || aiThinking || showPartnerHand}
                            className="shadow-2xl border-gray-300"
                        />
                    </div>
                ))}
             </div>
        </div>

      </main>

      {/* Partner Cards Modal (Only 2v2) */}
      {showPartnerHand && gameState.mode === '2v2' && gameState.phase === 'playing' && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50 backdrop-blur-md p-4 animate-in fade-in overflow-y-auto">
             <div className="text-white text-center mb-6">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <Users size={32} className="text-blue-400" />
                    <h2 className="text-3xl font-bold text-blue-100">Cartas do Parceiro</h2>
                </div>
                <p className="text-gray-300 text-lg">Memorize estas cartas antes de começar!</p>
             </div>

             {/* Trump Display in Modal */}
             <div className="mb-8 flex flex-col items-center bg-white/5 p-4 rounded-xl border border-white/10">
                <span className="text-yellow-400 font-bold uppercase tracking-widest text-sm mb-2">Trunfo</span>
                {gameState.trumpCard && (
                    <div className="transform scale-110">
                        <Card card={gameState.trumpCard} size="md" className="shadow-[0_0_20px_rgba(234,179,8,0.4)] border-2 border-yellow-500/50" />
                    </div>
                )}
             </div>

             {/* Large Cards Display */}
             <div className="flex flex-wrap justify-center gap-4 mb-12 max-w-4xl">
                {gameState.players[2]?.hand?.map((card, i) => (
                    <div key={`partner-modal-${i}`} className="animate-in zoom-in slide-in-from-bottom-5 fade-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <Card 
                            card={card} 
                            size="lg"
                            className="shadow-2xl hover:scale-110 transition-transform duration-300 w-32 h-48 md:w-40 md:h-60 text-xl border-2 border-blue-400/50"
                        />
                    </div>
                ))}
             </div>

             <button 
                onClick={() => setShowPartnerHand(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl py-4 px-12 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] transform transition hover:scale-105 active:scale-95 flex items-center gap-3 ring-4 ring-blue-600/30"
            >
                <EyeOff size={24} /> 
                Ocultar e Jogar
            </button>
        </div>
      )}

      {/* Intro / Mode Selection Modal */}
      {gameState.phase === 'betting' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm px-4">
             <div className="bg-white text-gray-900 p-6 md:p-8 rounded-2xl max-w-md text-center shadow-2xl border-4 border-yellow-500 w-full animate-in zoom-in">
                <div className="mx-auto mb-4 bg-green-100 p-4 rounded-full w-24 h-24 flex items-center justify-center">
                    <Trophy size={48} className="text-green-600" />
                </div>
                <h2 className="text-3xl font-bold mb-2">Bisca BR AI</h2>
                <p className="text-gray-600 mb-8 text-lg">
                    Escolha o modo de jogo:
                </p>
                
                <div className="space-y-4">
                    <button 
                        onClick={() => startNewGame('1v1')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <User size={24} />
                            <span className="text-xl">1 x 1</span>
                        </div>
                        <span className="text-blue-200 text-sm group-hover:text-white transition-colors">Duelo Rápido</span>
                    </button>

                    <button 
                        onClick={() => startNewGame('2v2')}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transform transition hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
                    >
                         <div className="flex items-center gap-3">
                            <Users size={24} />
                            <span className="text-xl">2 x 2</span>
                        </div>
                        <span className="text-green-200 text-sm group-hover:text-white transition-colors">Com Parceiro</span>
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.phase === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm px-4">
             <div className="bg-white text-gray-900 p-8 rounded-2xl max-w-md text-center shadow-2xl animate-in zoom-in w-full">
                <div className="mb-4 flex justify-center">
                    {gameState.winnerTeam === 0 ? (
                        <Trophy size={80} className="text-yellow-500 drop-shadow-lg" />
                    ) : (
                        <div className="text-6xl">🤖</div>
                    )}
                </div>
                <h2 className="text-3xl font-bold mb-2">
                    {gameState.winnerTeam === 0 ? 'Vitória!' : gameState.winnerTeam === 1 ? 'Derrota...' : 'Empate!'}
                </h2>
                <div className="bg-gray-100 p-4 rounded-lg mb-6 flex justify-between font-mono font-bold text-lg">
                    <span className="text-green-700">Você: {gameState.scores.team0}</span>
                    <span className="text-red-700">Rival: {gameState.scores.team1}</span>
                </div>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => startNewGame(gameState.mode)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto justify-center w-full"
                    >
                        <RefreshCw size={20} /> Jogar Novamente
                    </button>
                    <button 
                        onClick={() => setGameState(prev => ({...prev, phase: 'betting'}))}
                        className="text-gray-500 hover:text-gray-800 text-sm font-semibold py-2"
                    >
                        Voltar ao Menu
                    </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default App;