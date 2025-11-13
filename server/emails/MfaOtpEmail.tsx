import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface MfaOtpEmailProps {
  userName?: string;
  userEmail: string;
  otpCode: string;
  expiryMinutes: number;
}

export default function MfaOtpEmail({
  userName,
  userEmail,
  otpCode,
  expiryMinutes,
}: MfaOtpEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your Secure2Send verification code: {otpCode}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>🔒 Secure2Send</Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={h2}>
              Your Verification Code
            </Heading>
            
            <Text style={text}>
              Hi {userName || userEmail},
            </Text>

            <Text style={text}>
              You requested a verification code to access your Secure2Send account.
              Use the code below to complete your sign-in:
            </Text>

            <Section style={otpContainer}>
              <Text style={otpText}>{otpCode}</Text>
            </Section>

            <Text style={text}>
              This code will expire in <strong>{expiryMinutes} minutes</strong>.
            </Text>

            <Hr style={hr} />

            <Section style={warningSection}>
              <Text style={warningText}>
                ⚠️ <strong>Security Notice</strong>
              </Text>
              <Text style={text}>
                • Never share this code with anyone, including Secure2Send staff
              </Text>
              <Text style={text}>
                • If you didn't request this code, please ignore this email and secure your account
              </Text>
              <Text style={text}>
                • This code can only be used once
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              If you have any questions or concerns, please contact our support team.
            </Text>

            <Text style={footer}>
              © {new Date().getFullYear()} Secure2Send Enterprise. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 32px 0",
  textAlign: "center" as const,
};

const h1 = {
  color: "#1a1a1a",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  padding: "0",
};

const h2 = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  margin: "30px 0 15px",
};

const content = {
  padding: "0 32px",
};

const text = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const otpContainer = {
  background: "#f4f4f5",
  borderRadius: "8px",
  margin: "32px 0",
  padding: "24px",
  textAlign: "center" as const,
  border: "2px dashed #d4d4d8",
};

const otpText = {
  color: "#18181b",
  fontSize: "42px",
  fontWeight: "700",
  letterSpacing: "8px",
  margin: "0",
  fontFamily: "'Courier New', monospace",
};

const hr = {
  borderColor: "#e6e6e6",
  margin: "32px 0",
};

const warningSection = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "24px 0",
  border: "1px solid #fbbf24",
};

const warningText = {
  color: "#92400e",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  marginTop: "12px",
  textAlign: "center" as const,
};
