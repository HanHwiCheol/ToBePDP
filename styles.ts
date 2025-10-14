// styles.ts
import { CSSProperties } from "react";

export const centerWrap: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f7f7f8",
  padding: 16,
};

export const card: CSSProperties = {
  width: 420,
  background: "white",
  borderRadius: 16,
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
  padding: 20,
  textAlign: "center",
};

export const emptyBox: CSSProperties = { ...card, width: 460 };

export const btnPrimary: CSSProperties = {
  padding: "10px 16px",
  borderRadius: 12,
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  background: "#111827",
  color: "white",
};

export const btnDefault: CSSProperties = {
  ...btnPrimary,
  background: "#e5e7eb",
  color: "#111827",
};

export const btnDanger: CSSProperties = {
  ...btnPrimary,
  background: "#dc2626",
  color: "#fff",
};

export const btnGhost: CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "#111827",
  border: "1px solid #e5e7eb",
};

export const selectBox: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "white",
};

export const inputBox: CSSProperties = {
  width: "80%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  marginBottom: 8,
};