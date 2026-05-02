import {
  Body, Button, Container, Head, Heading, Html,
  Preview, Section, Text,
} from '@react-email/components'

interface MentionNotificationProps {
  mentionedByName: string
  issueKey: string
  issueTitle: string
  commentBody: string
  issueUrl: string
}

export function MentionNotificationEmail({
  mentionedByName,
  issueKey,
  issueTitle,
  commentBody,
  issueUrl,
}: MentionNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>{mentionedByName} mentioned you in {issueKey}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f9fafb' }}>
        <Container style={{ maxWidth: '560px', margin: '40px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px' }}>
          <Heading style={{ color: '#1e3a5f', fontSize: '20px' }}>
            You were mentioned in {issueKey}
          </Heading>
          <Text style={{ color: '#374151' }}>
            <strong>{mentionedByName}</strong> mentioned you in a comment on{' '}
            <strong>{issueTitle}</strong>:
          </Text>
          <Section style={{ backgroundColor: '#f3f4f6', padding: '12px 16px', borderRadius: '6px', borderLeft: '4px solid #1e3a5f' }}>
            <Text style={{ color: '#374151', margin: 0 }}>{commentBody}</Text>
          </Section>
          <Button
            href={issueUrl}
            style={{ backgroundColor: '#1e3a5f', color: '#fff', padding: '12px 24px', borderRadius: '6px', marginTop: '24px', display: 'inline-block', textDecoration: 'none' }}
          >
            View Issue
          </Button>
          <Text style={{ color: '#9ca3af', fontSize: '12px', marginTop: '32px' }}>
            Tech Plus Consulting · University of Michigan
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
