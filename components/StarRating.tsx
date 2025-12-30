
import React, { useState } from 'react';

interface StarRatingProps {
    rating: number;
    maxStars?: number;
    size?: number;
    interactive?: boolean;
    onRatingChange?: (rating: number) => void;
    color?: string;
    className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
    rating,
    maxStars = 5,
    size = 20,
    interactive = false,
    onRatingChange,
    color = 'text-yellow-500',
    className = ''
}) => {
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const displayRating = hoverRating !== null ? hoverRating : rating;

    const handleMouseEnter = (index: number) => {
        if (interactive) {
            setHoverRating(index + 1);
        }
    };

    const handleMouseLeave = () => {
        if (interactive) {
            setHoverRating(null);
        }
    };

    const handleClick = (index: number) => {
        if (interactive && onRatingChange) {
            onRatingChange(index + 1);
        }
    };

    return (
        <div className={`flex items-center gap-0.5 ${className}`} onMouseLeave={handleMouseLeave}>
            {[...Array(maxStars)].map((_, index) => {
                const starValue = index + 1;
                const isFilled = starValue <= Math.floor(displayRating);
                const isHalf = !isFilled && starValue === Math.ceil(displayRating) && displayRating % 1 >= 0.5;

                // Custom logic for interactive hover (always full stars)
                const showFilled = interactive ? starValue <= Math.ceil(displayRating) : isFilled;

                return (
                    <button
                        key={index}
                        type="button"
                        disabled={!interactive}
                        onMouseEnter={() => handleMouseEnter(index)}
                        onClick={() => handleClick(index)}
                        className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}`}
                        style={{ fontSize: size }}
                    >
                        <span
                            className={`material-symbols-outlined ${color} ${showFilled || isHalf ? 'filled' : ''}`}
                            style={{
                                fontVariationSettings: `'FILL' ${showFilled ? 1 : isHalf ? 0.5 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 24`
                            }}
                        >
                            {isHalf && !interactive ? 'star_half' : 'star'}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

export default StarRating;
