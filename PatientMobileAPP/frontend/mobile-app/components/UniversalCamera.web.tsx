import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface CameraHandle {
  capture: () => void;
}

interface UniversalCameraProps {
  onCapture: (uri: string) => void;
  isActive: boolean;
}

const PAGE_BG = "#030712";
const ACCENT = "#22C55E";

const panelStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: PAGE_BG,
  padding: "24px",
};

const titleStyle: React.CSSProperties = {
  color: "#FFFFFF",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: 1.2,
  textAlign: "center",
  margin: "0 0 8px",
  letterSpacing: "-0.02em",
};

const bodyStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.74)",
  fontSize: "15px",
  lineHeight: 1.5,
  textAlign: "center",
  margin: 0,
  maxWidth: "320px",
};

const primaryButtonStyle: React.CSSProperties = {
  minWidth: "220px",
  minHeight: "54px",
  padding: "0 24px",
  backgroundColor: ACCENT,
  color: "#FFFFFF",
  border: "none",
  borderRadius: "16px",
  fontSize: "15px",
  fontWeight: 600,
  cursor: "pointer",
  marginTop: "24px",
  boxShadow: "0 8px 24px rgba(34,197,94,0.18)",
};

const iconWrapStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "28px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(34, 197, 94, 0.20)",
  marginBottom: "18px",
};

type FacingMode = "user" | "environment";

export const UniversalCamera = forwardRef<CameraHandle, UniversalCameraProps>(
  function UniversalCamera({ onCapture, isActive }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [status, setStatus] = useState<
      "initial" | "pending" | "granted" | "denied"
    >("initial");
    const [errorMsg, setErrorMsg] = useState<string>("");
    const [facing, setFacing] = useState<FacingMode>("environment");

    useImperativeHandle(
      ref,
      () => ({
        capture() {
          const video = videoRef.current;
          if (!video) return;

          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;

          ctx.drawImage(video, 0, 0);
          onCapture(canvas.toDataURL("image/jpeg", 0.85));
        },
      }),
      [onCapture],
    );

    const startStream = async (facingMode: FacingMode, isFlip = false) => {
      if (!isFlip) {
        setStatus("pending");
        setErrorMsg("");
      }
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error("Camera API is not supported in this browser.");
        }
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus("granted");
      } catch (err: any) {
        console.error("Camera access error:", err);
        setErrorMsg(err.message || String(err));
        setStatus("denied");
      }
    };

    const requestAccess = () => startStream(facing);

    const handleFlip = async () => {
      if (status !== "granted") return;
      const next: FacingMode = facing === "environment" ? "user" : "environment";
      setFacing(next);
      await startStream(next, true);
    };

    useEffect(() => {
      if (!isActive) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      return () => {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
    }, [isActive]);

    if (status === "initial" || status === "pending") {
      return (
        <div style={panelStyle}>
          <div style={iconWrapStyle}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14.5 4h-5L8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
          </div>
          <p style={titleStyle}>Camera permission is required</p>
          <p style={bodyStyle}>
            Enable camera access to scan documents inside the frame.
          </p>
          <button onClick={requestAccess} style={primaryButtonStyle}>
            Grant Permission
          </button>
        </div>
      );
    }

    if (status === "denied") {
      return (
        <div style={panelStyle}>
          <div style={iconWrapStyle}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 21 3 3" />
              <path d="M10 4h4l1.5 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9" />
              <path d="M5 6h.5L7 4h1.6" />
            </svg>
          </div>
          <p style={titleStyle}>Camera permission is required</p>
          <p style={bodyStyle}>
            {errorMsg || "Please allow camera permissions in your browser settings."}
          </p>
          <button onClick={requestAccess} style={primaryButtonStyle}>
            Grant Permission
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          backgroundColor: "#000000",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <button
          type="button"
          onClick={handleFlip}
          style={{
            position: "absolute",
            top: 48,
            right: 20,
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(0,0,0,0.45)",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Flip camera"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 3h4l2 3h-2v11H4V6H2l2-3h4" />
            <path d="M8 21H4l-2-3h2V7h12v11h-2l-2 3" />
          </svg>
        </button>
      </div>
    );
  },
);
