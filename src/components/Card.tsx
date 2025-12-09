import React from 'react';
import { Card as CardType } from '../types';
import { getSuitIcon, getSuitColor } from '../constants';
import clsx from 'clsx';

interface CardProps {
  card?: CardType; // If undefined, renders back of card
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  isPlayable?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({ 
  card, 
  onClick, 
  disabled, 
  className,
  isPlayable = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-16 h-24 text-xs',
    md: 'w-24 h-36 text-base',
    lg: 'w-32 h-48 text-lg',
  };

  if (!card) {
    return (
      <div 
        className={clsx(
          "relative rounded-lg shadow-xl border-2 border-white bg-blue-800 bg-opacity-90",
          "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]", 
          sizeClasses[size],
          className
        )}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
           <div className="w-1/2 h-1/2 border-4 border-white rounded-full"></div>
        </div>
      </div>
    );
  }

  const colorClass = getSuitColor(card.suit);
  const icon = getSuitIcon(card.suit);

  return (
    <div
      onClick={!disabled && isPlayable ? onClick : undefined}
      className={clsx(
        "relative bg-white rounded-lg shadow-md select-none transition-transform duration-200 border border-gray-200",
        sizeClasses[size],
        !disabled && isPlayable ? "cursor-pointer hover:-translate-y-4 hover:shadow-xl" : "cursor-default opacity-90",
        !isPlayable && "brightness-75",
        className
      )}
    >
      {/* Top Left */}
      <div className={clsx("absolute top-1 left-2 flex flex-col items-center leading-none", colorClass)}>
        <span className="font-bold text-lg">{card.rank}</span>
        <span className="text-xl">{icon}</span>
      </div>

      {/* Center Big Icon */}
      <div className={clsx("absolute inset-0 flex items-center justify-center text-4xl opacity-20 pointer-events-none", colorClass)}>
        {icon}
      </div>

      {/* Bottom Right */}
      <div className={clsx("absolute bottom-1 right-2 flex flex-col items-center leading-none transform rotate-180", colorClass)}>
        <span className="font-bold text-lg">{card.rank}</span>
        <span className="text-xl">{icon}</span>
      </div>
    </div>
  );
};
