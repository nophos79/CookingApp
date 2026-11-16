import React from 'react';
import {
  Beef,
  Fish,
  Wheat,
  UtensilsCrossed,
  Carrot,
  Bean,
  Egg,
  Soup,
  CakeSlice,
  Salad,
  Sparkles,
  Utensils,
} from 'lucide-react';

interface CategoryIconProps {
  name?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Beef':
      return <Beef className={className} />;
    case 'Fish':
      return <Fish className={className} />;
    case 'Wheat':
      return <Wheat className={className} />;
    case 'UtensilsCrossed':
      return <UtensilsCrossed className={className} />;
    case 'Carrot':
      return <Carrot className={className} />;
    case 'Bean':
      return <Bean className={className} />;
    case 'Egg':
      return <Egg className={className} />;
    case 'Soup':
      return <Soup className={className} />;
    case 'CakeSlice':
      return <CakeSlice className={className} />;
    case 'Salad':
      return <Salad className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    default:
      return <Utensils className={className} />;
  }
};
