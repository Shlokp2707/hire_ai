import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

const WebcamMonitor = forwardRef(({
  active = true,
  onFrameCaptured,
  onFrame,
  onCapture,
  enableAutoCapture,
  autoCapture
}, ref) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);
  const shouldStopCameraRef = useRef(false);

  const autoCaptureEnabled = enableAutoCapture !== undefined 
    ? enableAutoCapture 
    : (autoCapture !== undefined ? autoCapture : true);

  const callbackRef = useRef(null);
  callbackRef.current = onFrameCaptured || onFrame || onCapture;

  useImperativeHandle(ref, () => ({
    capture: () => {
      return captureFrame();
    }
  }));

  useEffect(() => {
    isMountedRef.current = true;
    shouldStopCameraRef.current = false;
    if (active) {
      if (!streamRef.current || !streamRef.current.active) {
        startCamera();
      }
    } else {
      stopCamera();
    }

    return () => {
      isMountedRef.current = false;
      shouldStopCameraRef.current = true;
      stopCamera();
    };
  }, [active]);

  const startCamera = async () => {
    shouldStopCameraRef.current = false;
    let stream = null;
    try {
      setError(null);
      const constraints = {
        video: { width: 640, height: 480 },
        audio: false
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isMountedRef.current || !active || shouldStopCameraRef.current) {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Start frame capture loop (every 5 seconds) if auto-capture is enabled
      if (autoCaptureEnabled) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(captureFrame, 5000);
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setError("Webcam access denied. Please allow camera permissions to start the interview.");
    }
  };

  const stopCamera = () => {
    shouldStopCameraRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    if (!videoRef.current || !streamRef.current) return null;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality compression
      const base64Str = dataUrl.split(',')[1];
      if (callbackRef.current) {
        callbackRef.current(base64Str);
      }
      return base64Str;
    }
    return null;
  };

  return (
    <div className="video-container" style={{ width: '100%', height: '100%', minHeight: '240px', position: 'relative', borderRadius: '12px', overflow: 'hidden', backgroundColor: '#0f172a' }}>
      {error ? (
        <div style={{ padding: '2rem', color: 'var(--danger)', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '0.9rem' }}>
          {error}
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="webcam-feed"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)', minHeight: '240px' }}
          />
          <div className="video-overlay" style={{ position: 'absolute', top: '10px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
            <div className="video-badge badge-live" style={{ backgroundColor: 'rgba(16, 185, 129, 0.9)', color: 'white', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', backdropFilter: 'blur(4px)' }}>
              🟢 AI CAMERA MONITOR
            </div>
          </div>

        </>
      )}
    </div>
  );
});

export default WebcamMonitor;
