'use client';

import React, { useRef, useState, useEffect } from 'react';
import styles from './SignaturePad.module.css';

interface SignaturePadProps {
  initialName?: string;
  /**
   * The consent the tenant agrees to, as the server will store it. Passed in
   * so what is on screen is word for word what is recorded with the signature.
   */
  consentText?: string;
  onSave: (signatureData: { type: 'draw' | 'type'; dataUrl: string; signerName: string }) => void;
  onCancel?: () => void;
}

const DEFAULT_CONSENT =
  'I agree that this electronic signature is the legally binding equivalent of my manual handwritten signature, and I confirm that I have reviewed all terms of this Lease Agreement.';

export function SignaturePad({ initialName = '', consentText = DEFAULT_CONSENT, onSave, onCancel }: SignaturePadProps) {
  const [tab, setTab] = useState<'draw' | 'type'>('draw');
  const [signerName, setSignerName] = useState(initialName);
  const [agreed, setAgreed] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [selectedFont, setSelectedFont] = useState<'font1' | 'font2' | 'font3'>('font1');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#1e3a8a'; // Deep navy signature color
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [tab]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const { x, y } = getCoordinates(e);
    isDrawing.current = true;
    lastX.current = x;
    lastY.current = y;
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(lastX.current, lastY.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastX.current = x;
    lastY.current = y;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    if (!signerName.trim()) {
      alert('Please enter your full legal name.');
      return;
    }
    if (!agreed) {
      alert('Please check the legal acknowledgement checkbox to proceed.');
      return;
    }

    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert('Please draw your signature on the pad.');
        return;
      }
      const dataUrl = canvas.toDataURL('image/png');
      onSave({
        type: 'draw',
        dataUrl,
        signerName: signerName.trim(),
      });
    } else {
      const offscreen = document.createElement('canvas');
      offscreen.width = 600;
      offscreen.height = 160;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, 600, 160);
        ctx.fillStyle = '#1e3a8a';
        const fontMap = {
          font1: 'italic 44px "Brush Script MT", "Caveat", "Dancing Script", cursive',
          font2: 'italic 40px "Segoe Script", "Lucida Handwriting", cursive',
          font3: 'italic 38px "Apple Chancery", "Bickham Script Pro", cursive',
        };
        ctx.font = fontMap[selectedFont];
        ctx.textBaseline = 'middle';
        ctx.fillText(signerName.trim(), 40, 80);
      }
      onSave({
        type: 'type',
        dataUrl: offscreen.toDataURL('image/png'),
        signerName: signerName.trim(),
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Adopt Electronic Signature</h3>
          <p className={styles.subtitle}>
            Sign electronically to complete your Skelton Realty Group Lease Agreement.
          </p>
        </div>
      </div>

      <div className={styles.nameInputGroup}>
        <label htmlFor="signerName" className={styles.label}>
          Full Legal Name of Tenant
        </label>
        <input
          id="signerName"
          type="text"
          value={signerName}
          onChange={(e) => setSignerName(e.target.value)}
          placeholder="e.g. Jeremy Shiner"
          className={styles.nameInput}
        />
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          onClick={() => setTab('draw')}
          className={`${styles.tabBtn} ${tab === 'draw' ? styles.tabActive : ''}`}
        >
          Draw Signature
        </button>
        <button
          type="button"
          onClick={() => setTab('type')}
          className={`${styles.tabBtn} ${tab === 'type' ? styles.tabActive : ''}`}
        >
          Type Signature
        </button>
      </div>

      {tab === 'draw' ? (
        <div className={styles.canvasWrapper}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          <div className={styles.canvasBaseline} />
          <div className={styles.canvasToolbar}>
            <span className={styles.canvasHint}>Use your finger, stylus, or mouse to sign</span>
            <button type="button" onClick={clearCanvas} className={styles.clearBtn}>
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.typeWrapper}>
          <div className={styles.fontSelector}>
            <button
              type="button"
              onClick={() => setSelectedFont('font1')}
              className={`${styles.fontBtn} ${selectedFont === 'font1' ? styles.fontSelected : ''}`}
            >
              Style 1
            </button>
            <button
              type="button"
              onClick={() => setSelectedFont('font2')}
              className={`${styles.fontBtn} ${selectedFont === 'font2' ? styles.fontSelected : ''}`}
            >
              Style 2
            </button>
            <button
              type="button"
              onClick={() => setSelectedFont('font3')}
              className={`${styles.fontBtn} ${selectedFont === 'font3' ? styles.fontSelected : ''}`}
            >
              Style 3
            </button>
          </div>
          <div className={styles.typePreviewBox}>
            <div className={`${styles.typePreview} ${styles[selectedFont]}`}>
              {signerName.trim() || 'Your Signature Here'}
            </div>
            <div className={styles.canvasBaseline} />
          </div>
        </div>
      )}

      <label className={styles.consentRow}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className={styles.checkbox}
        />
        <span className={styles.consentText}>{consentText}</span>
      </label>

      <div className={styles.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={!signerName.trim() || !agreed || (tab === 'draw' && !hasDrawn)}
          className={styles.submitBtn}
        >
          Adopt &amp; Sign Agreement
        </button>
      </div>
    </div>
  );
}
