import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface MfaDisabledEmailProps {
  firstName: string;
  appUrl: string;
}

export function MfaDisabledEmail({ firstName, appUrl }: MfaDisabledEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Multi-Factor Authentication Disabled - Secure2Send</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={h1}>⚠️ MFA Disabled</Heading>
          </Section>
          
          <Section style={content}>
            <Text style={text}>Hi {firstName},</Text>
            
            <Text style={text}>
              Multi-Factor Authentication (MFA) has been disabled on your Secure2Send account. 
              Your account now uses only password-based authentication.
            </Text>

            <Section style={warningBox}>
              <Text style={warningText}>
                <strong>Security Notice:</strong>
              </Text>
              <Text style={warningText}>
                Your account is now less secure without MFA enabled. We strongly recommend 
                re-enabling MFA to protect your sensitive business information.
              </Text>
            </Section>

            <Text style={text}>
              If you didn't disable MFA or believe this was done without your authorization, 
              please contact our support team immediately and change your password.
            </Text>

            <Text style={text}>
              <Link href={`${appUrl}/settings`} style={button}>
                Re-enable MFA
              </Link>
            </Text>

            <Text style={text}>
              Best regards,<br />
              The Secure2Send Team
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This is a security notification from Secure2Send Enterprise.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const header = {
  padding: '32px 24px',
  textAlign: 'center' as const,
};

const h1 = {
  color: '#1f2937',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
};

const content = {
  padding: '0 24px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
};

const warningBox = {
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
};

const warningText = {
  color: '#92400e',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 'bold',
  padding: '12px 24px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const footer = {
  borderTop: '1px solid #e5e7eb',
  padding: '24px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0',
};
