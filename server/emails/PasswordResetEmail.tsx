import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  firstName?: string;
  resetUrl: string;
  expiryMinutes?: number;
}

export const PasswordResetEmail = ({
  firstName = "there",
  resetUrl,
  expiryMinutes = 60,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your Secure2Send password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🔐 Password Reset Request</Heading>
          
          <Text style={text}>Hi {firstName},</Text>
          
          <Text style={text}>
            We received a request to reset your password for your Secure2Send account. 
            Click the button below to choose a new password:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Reset Your Password
            </Button>
          </Section>

          <Text style={text}>
            This password reset link will expire in <strong>{expiryMinutes} minutes</strong> for security purposes.
          </Text>

          <Text style={text}>
            If you didn't request a password reset, you can safely ignore this email. 
            Your password will remain unchanged.
          </Text>

          <Text style={text}>
            For security reasons, this link can only be used once.
          </Text>

          <Section style={footerSection}>
            <Text style={footerText}>
              <strong>Security Tip:</strong> Never share your password with anyone. 
              Secure2Send will never ask you for your password via email.
            </Text>
          </Section>

          <Text style={footer}>
            If you're having trouble with the button above, copy and paste this URL into your browser:
            <br />
            <a href={resetUrl} style={link}>{resetUrl}</a>
          </Text>

          <Text style={footer}>
            © {new Date().getFullYear()} Secure2Send. All rights reserved.
            <br />
            Enterprise Document Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

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

const h1 = {
  color: "#1a1a1a",
  fontSize: "32px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0 40px",
  textAlign: "center" as const,
};

const text = {
  color: "#444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "16px 0",
  padding: "0 40px",
};

const buttonContainer = {
  padding: "27px 40px",
};

const button = {
  backgroundColor: "#2563EB",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  padding: "14px 20px",
};

const footerSection = {
  backgroundColor: "#FEF3C7",
  border: "1px solid #FDE68A",
  borderRadius: "8px",
  margin: "32px 40px",
  padding: "16px 20px",
};

const footerText = {
  color: "#92400E",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
};

const footer = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "16px 0",
  padding: "0 40px",
};

const link = {
  color: "#2563EB",
  wordBreak: "break-all" as const,
};


