import { Body, Container, Head, Hr, Html, Preview, Text } from "@react-email/components";

import { common } from "@/messages/es-MX/common";
import { emails } from "@/messages/es-MX/emails";

import type { ReactNode } from "react";

const body = {
  backgroundColor: "#f5f5f5",
  color: "#1c1c1c",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
} as const;

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e3e3e3",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "520px",
  padding: "28px",
} as const;

const brand = { color: "#1f7a46", fontSize: "14px", fontWeight: 700, margin: "0 0 16px" } as const;
const rule = { borderColor: "#e3e3e3", margin: "24px 0 12px" } as const;
const footer = { color: "#6b6b6b", fontSize: "12px", lineHeight: "18px", margin: "4px 0" } as const;

export const emailStyles = {
  heading: { fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 12px" },
  text: { fontSize: "15px", lineHeight: "24px", margin: "0 0 14px" },
  muted: { color: "#6b6b6b", fontSize: "13px", lineHeight: "20px", margin: "0 0 12px" },
  button: {
    backgroundColor: "#1f7a46",
    borderRadius: "999px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "15px",
    fontWeight: 600,
    padding: "12px 22px",
    textDecoration: "none",
  },
  actions: { margin: "8px 0 20px" },
  note: {
    backgroundColor: "#f3f7f4",
    borderRadius: "12px",
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 14px",
    padding: "12px 14px",
    whiteSpace: "pre-wrap",
  },
} as const;

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html lang="es-MX">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={brand}>{common.appName}</Text>
          {children}
          <Hr style={rule} />
          <Text style={footer}>{emails.footer}</Text>
          <Text style={footer}>{emails.automated}</Text>
        </Container>
      </Body>
    </Html>
  );
}
