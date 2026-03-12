import React from "react";

const qrSrc =
  "https://quickchart.io/qr?text=[PASTE_YOUR_ICLOUD_LINK_HERE]&size=200&margin=2";

const styles = {
  wrapper: {
    minHeight: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "radial-gradient(circle at 20% 20%, rgba(35, 42, 92, 0.55), rgba(10, 12, 24, 0.95))",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    borderRadius: "22px",
    padding: "28px 24px",
    color: "#f5f8ff",
    textAlign: "center",
    background: "linear-gradient(160deg, #101a3a 0%, #0b1022 100%)",
    border: "1px solid rgba(133, 164, 255, 0.35)",
    boxShadow:
      "0 26px 50px rgba(2, 7, 23, 0.65), 0 10px 24px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(8px)",
  },
  badge: {
    display: "inline-block",
    marginBottom: "14px",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    fontWeight: 700,
    color: "#a5b4fc",
    background: "rgba(99, 102, 241, 0.16)",
    border: "1px solid rgba(129, 140, 248, 0.45)",
  },
  title: {
    margin: "0 0 10px",
    fontSize: "30px",
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: "-0.01em",
  },
  subtitle: {
    margin: "0 auto 22px",
    maxWidth: "340px",
    color: "#d7def5",
    fontSize: "14px",
    lineHeight: 1.6,
  },
  qrFrame: {
    display: "inline-flex",
    padding: "12px",
    borderRadius: "18px",
    background: "linear-gradient(145deg, #ffffff, #e7ebff)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.18)",
  },
  qrImage: {
    width: "200px",
    height: "200px",
    borderRadius: "12px",
    display: "block",
  },
};

export default function AppleWatchConnector() {
  return (
    <section style={styles.wrapper}>
      <div style={styles.card}>
        <span style={styles.badge}>Web3 Health Bridge</span>
        <h2 style={styles.title}>Sync Apple Health</h2>
        <p style={styles.subtitle}>
          Scan this QR code with your iPhone to install the DiagnosticSync
          shortcut. Once added, tap it to securely extract your biometric data
          to our Web3 backend.
        </p>
        <div style={styles.qrFrame}>
          <img src={qrSrc} alt="Apple Health sync shortcut QR code" style={styles.qrImage} />
        </div>
      </div>
    </section>
  );
}
