'use client';

import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import styles from './OtpInput.module.css';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function OtpInput({ length = 6, value, onChange, disabled }: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputsRef.current[index]?.focus();
      // Move cursor to end if there's a value
      setTimeout(() => {
        inputsRef.current[index]?.setSelectionRange(1, 1);
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const currentVal = value.split('');
      
      // If there is a value in the current box, clear it but don't jump back yet
      if (currentVal[index]) {
        currentVal[index] = '';
        onChange(currentVal.join(''));
      } 
      // If it's already empty, jump to the previous box and clear it
      else if (index > 0) {
        currentVal[index - 1] = '';
        onChange(currentVal.join(''));
        focusInput(index - 1);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusInput(index + 1);
    }
  };

  const handleChange = (val: string, index: number) => {
    // Only accept numeric inputs
    if (!/^\d*$/.test(val)) return;

    // Take the last char in case they type fast or it's a mobile autocomplete
    const char = val.slice(-1);
    
    const newArr = value.split('');
    newArr[index] = char;
    
    // Ensure we don't end up with gaps or over-length
    const joined = newArr.join('').slice(0, length);
    onChange(joined);

    // If they typed a char, jump to next box
    if (char && index < length - 1) {
      focusInput(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pastedData) return;

    onChange(pastedData);
    
    // Focus the next empty box, or the last box if full
    const nextIndex = Math.min(pastedData.length, length - 1);
    focusInput(nextIndex);
  };

  // Ensure value array matches length
  const digits = value.padEnd(length, ' ').split('');

  return (
    <div className={styles.container}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={2} // allow 2 so onChange can catch the latest char
          className={styles.box}
          value={digit.trim()}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          aria-label={`Digit ${index + 1}`}
        />
      ))}
      <input type="hidden" name="otp" value={value} />
    </div>
  );
}
