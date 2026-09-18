import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { recognizeAccountImage, type RecognizeResult } from './services/api';

type UIState = 'capture' | 'processing' | 'success' | 'error';

function App() {
  const [uiState, setUiState] = useState<UIState>('capture');
  const [result, setResult] = useState<RecognizeResult | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      console.error("Camera access denied or unavailable");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const processImageBlob = async (blob: Blob) => {
    setUiState('processing');
    try {
      const apiResult = await recognizeAccountImage(blob);
      setResult(apiResult);
      if (apiResult.success) {
        setUiState('success');
      } else {
        setUiState('error');
      }
    } catch {
      setResult({ success: false, error: { code: 'CLIENT_ERROR', message: 'An unexpected error occurred.' } });
      setUiState('error');
    }
  };

  React.useEffect(() => {
    if (uiState === 'capture') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [uiState]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) processImageBlob(blob);
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageBlob(file);
    }
  };

  const bankName = result?.data?.bank_name || result?.data?.bank?.name || 'Unknown Bank';
  const accountName = result?.data?.account_name || result?.data?.account_holder?.name || 'N/A';
  const accountNameVerified = Boolean(accountName && accountName !== 'N/A');
  const bankOptions = [
    ...(bankName !== 'Unknown Bank' && result?.data?.bank_code
      ? [{ code: result.data.bank_code, name: bankName }]
      : []),
    ...(result?.data?.alternatives || []).map((alternative) => ({
      code: alternative.bank_code,
      name: alternative.bank_name,
    })),
  ].filter((bank, index, banks) => banks.findIndex((candidate) => candidate.code === bank.code) === index);

  return (
    <div className="app-container">
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      {uiState === 'capture' && (
        <main className="capture-screen">
          <div className="intro">
            <p className="eyebrow">PAYLENS · FINTECH PROOF OF CONCEPT</p>
            <h1>Find the right account</h1>
            <p>Snap an account number and get the account details without typing the number, selecting a bank, or entering a sort code.</p>
          </div>
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <div className="camera-overlay">
              <div className="camera-mask" style={{ flex: 1 }}></div>
              <div className="scan-box-wrapper">
                <div className="scan-box">
                  <div className="scan-box-inner"></div>
                </div>
              </div>
              <div className="camera-mask" style={{ flex: 1.5 }}>
                <p className="instruction-text">Fit the 10-digit number inside the frame</p>
              </div>
            </div>
            <div className="camera-controls">
              <button className="icon-btn" onClick={() => fileInputRef.current?.click()} aria-label="Upload an image">
                <ImageIcon size={20} />
              </button>
              <button className="shutter-btn" onClick={handleCapture} aria-label="Take photo">
                <div className="shutter-inner"></div>
              </button>
              <div className="camera-control-spacer" />
            </div>
          </div>
          <p className="capture-note">Your image is used only to identify the account details.</p>
        </main>
      )}

      {uiState === 'processing' && (
        <div className="processing-container">
          <div className="scanner-animation">
            <Camera size={28} />
            <div className="scanner-beam"></div>
          </div>
          <h3 style={{ marginBottom: '8px' }}>Scanning account details...</h3>
          <p className="text-secondary text-sm">Checking the account across matching banks...</p>
        </div>
      )}

      {uiState === 'success' && (
        <div className="processing-container result-screen">
          <div className="bottom-sheet">
            <div className="status-icon success">
              <CheckCircle2 size={32} />
            </div>
            <h3>{accountNameVerified ? 'Account Verified' : 'Confirm Account Details'}</h3>
            {!accountNameVerified && (
              <p className="text-secondary text-sm" style={{ marginBottom: '16px' }}>
                We could not verify the account name. Please retake the photo and confirm the account details before continuing.
              </p>
            )}
            
            <div className="result-card">
              <div className="result-row">
                <label>Account Name</label>
                <div className="value">{accountName}</div>
              </div>
              <div className="result-row">
                <label>Account Number</label>
                <div className="value">{result?.data?.account_number}</div>
              </div>
              <div className="bank-row">
                <div className="bank-icon">
                   <CheckCircle2 size={16} />
                </div>
                <div className="value" style={{ fontSize: '0.875rem' }}>{bankName}</div>
              </div>
              {bankOptions.length > 1 && (
                <div className="result-row">
                  <label>Other matching banks</label>
                  <div className="value">
                    {bankOptions.slice(1).map((bank) => (
                      <div key={bank.code}>{bank.name} ({bank.code})</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary" disabled={!accountNameVerified}>
              Confirm account
            </button>
            <button className="btn-ghost" onClick={() => setUiState('capture')}>
              <RefreshCw size={14} style={{ display: 'inline', marginRight: '4px' }} /> Retake Photo
            </button>
          </div>
        </div>
      )}

      {uiState === 'error' && (
        <div className="processing-container">
          <div className="status-icon error">
            <AlertCircle size={32} />
          </div>
          <h3 style={{ marginBottom: '12px', fontSize: '1.2rem' }}>
            {result?.error?.code === 'OCR_NO_NUMBER_FOUND' ? "We couldn't find a number." :
             result?.error?.code === 'NETWORK_ERROR' ? "Connection Error" : 
             (result?.error?.code || 'Error')}
          </h3>
          <p className="text-secondary text-sm" style={{ marginBottom: '32px', maxWidth: '280px' }}>
            {(typeof result?.error?.details?.suggestion === 'string'
              ? result.error.details.suggestion
              : result?.error?.message) ||
              'Retake the photo with better lighting or crop the image to show only the number.'}
          </p>
          
          <button className="btn btn-primary" onClick={() => setUiState('capture')} style={{ marginBottom: '12px' }}>
            <Camera size={18} /> Try Again
          </button>
          <button className="btn btn-outline">
            Enter manually
          </button>

          <p className="text-secondary text-xs" style={{ marginTop: '24px' }}>
             Tips for scanning documents
          </p>
        </div>
      )}

    </div>
  );
}

export default App;
