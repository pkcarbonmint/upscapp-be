import React from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const StarRating: React.FC<StarRatingProps> = ({ 
  value, 
  onChange, 
  max = 5, 
  size = 'medium',
  disabled = false 
}) => {
  const sizeClasses = {
    small: '16px',
    medium: '20px',
    large: '24px'
  };

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  const handleMouseEnter = (rating: number) => {
    if (!disabled) {
      // Could add hover effects here
    }
  };

  return (
    <div 
      style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center'
      }}
    >
      {Array.from({ length: max }, (_, index) => {
        const rating = index + 1;
        const isFilled = rating <= value;
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(rating)}
            onMouseEnter={() => handleMouseEnter(rating)}
            disabled={disabled}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              padding: '2px',
              fontSize: sizeClasses[size],
              color: isFilled ? '#ffc107' : '#e0e0e0',
              transition: 'color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (!disabled) {
                e.currentTarget.style.color = '#ffc107';
              }
            }}
            onMouseLeave={(e) => {
              if (!disabled) {
                e.currentTarget.style.color = isFilled ? '#ffc107' : '#e0e0e0';
              }
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;