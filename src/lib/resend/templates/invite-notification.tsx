import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Text,
} from '@react-email/components'

interface InviteNotificationProps {
  invitedByName: string
  projectName: string | null
  roleLabel: string | null
  isAdmin: boolean
  loginUrl: string
}

export function InviteNotificationEmail({
  invitedByName,
  projectName,
  roleLabel,
  isAdmin,
  loginUrl,
}: InviteNotificationProps) {
  const context = projectName
    ? `to the ${projectName} project`
    : 'to Tech Plus PM'

  return (
    <Html>
      <Head />
      <Preview>{invitedByName} invited you {context}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <Heading style={{ color: '#1e3a5f', fontSize: '20px' }}>
            You&apos;ve been invited {context}
          </Heading>
          <Text style={{ color: '#374151' }}>
            <strong>{invitedByName}</strong> added you {context} on Tech Plus PM.
          </Text>
          {(roleLabel || isAdmin) && (
            <Text style={{ color: '#374151' }}>
              {roleLabel && <>Role: <strong>{roleLabel}</strong></>}
              {roleLabel && isAdmin && ' · '}
              {isAdmin && <strong>Site admin access</strong>}
            </Text>
          )}
          <Text style={{ color: '#374151' }}>
            Sign in with your <strong>@umich.edu</strong> Google account to get access — it applies automatically
            the first time you log in.
          </Text>
          <Button
            href={loginUrl}
            style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '12px 24px', borderRadius: '6px', marginTop: '16px', display: 'inline-block', textDecoration: 'none' }}
          >
            Sign In
          </Button>
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '32px' }}>
            Tech Plus Consulting · University of Michigan
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
