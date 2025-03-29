
import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  color?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  isActive, 
  color = '#10b981' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastBarsRef = useRef<number[]>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Initialize bars with random heights if not set
    if (lastBarsRef.current.length === 0) {
      const barCount = 5;
      for (let i = 0; i < barCount; i++) {
        // All bars start at middle position when inactive
        lastBarsRef.current[i] = 0.5;
      }
    }
    
    const drawBars = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (!isActive) {
        // When not active, draw flat line in the middle
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Reset bars to middle position
        lastBarsRef.current = lastBarsRef.current.map(() => 0.5);
        return;
      }
      
      const barCount = lastBarsRef.current.length;
      const barWidth = width / (barCount * 2 - 1);
      
      // Update bar heights with smooth transitions and more realistic voice pattern
      lastBarsRef.current = lastBarsRef.current.map((height, index) => {
        // Create more realistic voice pattern with higher values in middle bars
        let targetFactor = 0;
        const middleIndex = Math.floor(barCount / 2);
        const distanceFromMiddle = Math.abs(index - middleIndex);
        
        if (distanceFromMiddle === 0) {
          targetFactor = 0.9; // Middle bar highest
        } else if (distanceFromMiddle === 1) {
          targetFactor = 0.7; // Adjacent bars slightly lower
        } else {
          targetFactor = 0.5; // Outer bars lowest
        }
        
        // Add randomness
        const randomFactor = Math.random() * 0.3;
        const target = targetFactor + randomFactor;
        
        // Smooth transition for more natural movement
        return height + (target - height) * 0.3;
      });
      
      // Draw bars
      ctx.fillStyle = color;
      
      for (let i = 0; i < barCount; i++) {
        const barHeight = lastBarsRef.current[i] * height;
        const x = i * barWidth * 2;
        const y = (height - barHeight) / 2;
        
        // Round the corners with rounded rectangle
        const radius = Math.min(barWidth / 2, barHeight / 2, 4);
        
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + radius, radius);
        ctx.arcTo(x + barWidth, y + barHeight, x + barWidth - radius, y + barHeight, radius);
        ctx.arcTo(x, y + barHeight, x, y + barHeight - radius, radius);
        ctx.arcTo(x, y, x + radius, y, radius);
        ctx.closePath();
        ctx.fill();
      }
    };
    
    const animate = () => {
      drawBars();
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, color]);
  
  return (
    <canvas 
      ref={canvasRef} 
      width={40} 
      height={20} 
      className="inline-block" 
    />
  );
};

export default AudioWaveform;
