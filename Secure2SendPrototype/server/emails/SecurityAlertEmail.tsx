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
  Link,
} from "@react-email/components";

interface SecurityAlertEmailProps {
  adminName: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
  ipAddress: string;
  userEmail: string;
  userName: string;
  details: string;
  appUrl: string;
}

export function SecurityAlertEmail({
  adminName,
  alertType,
  severity,
  timestamp,
  ipAddress,
  userEmail,
  userName,
  details,
  appUrl,
}: SecurityAlertEmailProps) {
  const severityColors = {
    LOW: '#10B981',      // Green
    MEDIUM: '#F59E0B',   // Yellow
    HIGH: '#EF4444',     // Red
    CRITICAL: '#DC2626'  // Dark Red
  };

  const severityColor = severityColors[severity];

  return (
    <Html>
      <Head />
      <Preview>🚨 Security Alert: {alertType} - {severity} Priority</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>🔒 Secure2Send Security Alert</Heading>
          </Section>

          {/* Alert Badge */}
          <Section style={alertBadge}>
            <div style={{
              ...badge,
              backgroundColor: severityColor,
            }}>
              🚨 {severity} PRIORITY ALERT
            </div>
          </Section>

          {/* Greeting */}
          <Section style={section}>
            <Text style={text}>
              Hello {adminName},
            </Text>
            <Text style={text}>
              A security event has been detected on the Secure2Send platform that requires your attention.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Alert Details */}
          <Section style={section}>
            <Heading style={h2}>Alert Details</Heading>
            
            <div style={detailsContainer}>
              <div style={detailRow}>
                <strong>Alert Type:</strong> {alertType.replace(/_/g, ' ')}
              </div>
              <div style={detailRow}>
                <strong>Severity:</strong> <span style={{ color: severityColor }}>{severity}</span>
              </div>
              <div style={detailRow}>
                <strong>Timestamp:</strong> {new Date(timestamp).toLocaleString()}
              </div>
              <div style={detailRow}>
                <strong>IP Address:</strong> {ipAddress}
              </div>
              <div style={detailRow}>
                <strong>User:</strong> {userName} ({userEmail})
              </div>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Technical Details */}
          <Section style={section}>
            <Heading style={h2}>Technical Details</Heading>
            <div style={codeBlock}>
              <pre style={preStyle}>{details}</pre>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Recommended Actions */}
          <Section style={section}>
            <Heading style={h2}>Recommended Actions</Heading>
            <div style={actionsList}>
              {severity === 'CRITICAL' && (
                <>
                  <div style={actionItem}>🔴 <strong>Immediate:</strong> Review user account and consider temporary suspension</div>
                  <div style={actionItem}>🔴 <strong>Immediate:</strong> Check for any unauthorized data access or changes</div>
                  <div style={actionItem}>🔴 <strong>Immediate:</strong> Consider blocking the source IP address</div>
                </>
              )}
              {(severity === 'HIGH' || severity === 'CRITICAL') && (
                <>
                  <div style={actionItem}>🟠 <strong>Urgent:</strong> Investigate the user's recent activity</div>
                  <div style={actionItem}>🟠 <strong>Urgent:</strong> Review audit logs for related events</div>
                  <div style={actionItem}>🟠 <strong>Urgent:</strong> Contact the user to verify legitimate activity</div>
                </>
              )}
              <div style={actionItem}>🟡 <strong>Standard:</strong> Document the incident for compliance reporting</div>
              <div style={actionItem}>🟡 <strong>Standard:</strong> Monitor for similar patterns</div>
              <div style={actionItem}>🟡 <strong>Standard:</strong> Update security policies if needed</div>
            </div>
          </Section>

          <Hr style={hr} />

          {/* Action Buttons */}
          <Section style={section}>
            <div style={buttonContainer}>
              <Link
                href={`${appUrl}/admin`}
                style={{
                  ...button,
                  backgroundColor: '#DC2626',
                }}
              >
                View Admin Dashboard
              </Link>
              <Link
                href={`${appUrl}/admin/audit-logs`}
                style={{
                  ...button,
                  backgroundColor: '#1F2937',
                }}
              >
                Review Audit Logs
              </Link>
            </div>
          </Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated security alert from Secure2Send Enterprise.
              Please do not reply to this email.
            </Text>
            <Text style={footerText}>
              If you believe this alert was triggered in error, please contact your system administrator.
            </Text>
            <Text style={footerText}>
              <strong>Security Tip:</strong> Always verify suspicious activity through multiple channels before taking action.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const header = {
  padding: '32px 24px',
  backgroundColor: '#1F2937',
  borderRadius: '8px 8px 0 0',
};

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const h2 = {
  color: '#1F2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
};

const section = {
  padding: '0 24px',
  marginBottom: '24px',
};

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
};

const alertBadge = {
  textAlign: 'center' as const,
  padding: '16px 24px',
};

const badge = {
  display: 'inline-block',
  padding: '8px 16px',
  borderRadius: '20px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
};

const detailsContainer = {
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '16px',
};

const detailRow = {
  margin: '8px 0',
  fontSize: '14px',
  color: '#374151',
};

const codeBlock = {
  backgroundColor: '#1F2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  padding: '16px',
  overflow: 'auto',
};

const preStyle = {
  color: '#E5E7EB',
  fontSize: '12px',
  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
};

const actionsList = {
  backgroundColor: '#FEF3C7',
  border: '1px solid #F59E0B',
  borderRadius: '8px',
  padding: '16px',
};

const actionItem = {
  margin: '8px 0',
  fontSize: '14px',
  color: '#92400E',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  display: 'inline-block',
  padding: '12px 24px',
  margin: '0 8px',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const hr = {
  borderColor: '#E5E7EB',
  margin: '32px 0',
};

const footer = {
  padding: '0 24px',
};

const footerText = {
  color: '#6B7280',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '0 0 8px 0',
};

export default SecurityAlertEmail;

