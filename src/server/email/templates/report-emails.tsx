import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { emails } from "@/messages/es-MX/emails";

import { EmailLayout, emailStyles } from "./layout";

export function ReportConfirmEmail({
  number,
  confirmUrl,
  trackingUrl,
}: {
  number: number;
  confirmUrl: string;
  trackingUrl: string;
}) {
  const copy = emails.reportConfirm;
  return (
    <EmailLayout preview={copy.preview}>
      <Heading style={emailStyles.heading}>{copy.heading}</Heading>
      <Text style={emailStyles.text}>{copy.body(number)}</Text>
      <Section style={emailStyles.actions}>
        <Button href={confirmUrl} style={emailStyles.button}>
          {copy.confirm}
        </Button>
      </Section>
      <Text style={emailStyles.muted}>{copy.expires}</Text>
      <Text style={emailStyles.text}>{copy.trackingIntro}</Text>
      <Text style={emailStyles.text}>
        <Link href={trackingUrl}>{copy.tracking}</Link>
      </Text>
      <Text style={emailStyles.muted}>{emails.ignore}</Text>
    </EmailLayout>
  );
}

export function ReportStatusEmail({
  number,
  statusLabel,
  note,
  duplicateOfNumber,
}: {
  number: number;
  statusLabel: string;
  note: string | null;
  duplicateOfNumber: number | null;
}) {
  const copy = emails.reportStatus;
  return (
    <EmailLayout preview={copy.preview(statusLabel)}>
      <Heading style={emailStyles.heading}>{copy.heading(number)}</Heading>
      <Text style={emailStyles.text}>{copy.body(statusLabel)}</Text>
      {duplicateOfNumber !== null && (
        <Text style={emailStyles.text}>{copy.duplicate(duplicateOfNumber)}</Text>
      )}
      {note && (
        <>
          <Text style={emailStyles.muted}>{copy.note}</Text>
          <Text style={emailStyles.note}>{note}</Text>
        </>
      )}
      <Text style={emailStyles.muted}>{copy.tracking}</Text>
      <Text style={emailStyles.muted}>{copy.unsubscribe}</Text>
    </EmailLayout>
  );
}

export function StaffDigestEmail({
  newReports,
  backlog,
  inboxUrl,
}: {
  newReports: number;
  backlog: number;
  inboxUrl: string;
}) {
  const copy = emails.staffDigest;
  return (
    <EmailLayout preview={copy.preview}>
      <Heading style={emailStyles.heading}>{copy.heading}</Heading>
      <Text style={emailStyles.text}>{copy.newReports(newReports)}</Text>
      <Text style={emailStyles.text}>{copy.backlog(backlog)}</Text>
      <Section style={emailStyles.actions}>
        <Button href={inboxUrl} style={emailStyles.button}>
          {copy.open}
        </Button>
      </Section>
    </EmailLayout>
  );
}

const noFootnotes: string[] = [];

export function ActionEmail({
  preview,
  heading,
  paragraphs,
  action,
  footnotes = noFootnotes,
  secondary,
  note,
}: {
  preview: string;
  heading: string;
  paragraphs: string[];
  action?: { href: string; label: string };
  footnotes?: string[];
  secondary?: { intro: string; href: string; label: string };
  note?: { label: string; body: string };
}) {
  return (
    <EmailLayout preview={preview}>
      <Heading style={emailStyles.heading}>{heading}</Heading>
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={emailStyles.text}>
          {paragraph}
        </Text>
      ))}
      {note && (
        <>
          <Text style={emailStyles.muted}>{note.label}</Text>
          <Text style={emailStyles.note}>{note.body}</Text>
        </>
      )}
      {action && (
        <Section style={emailStyles.actions}>
          <Button href={action.href} style={emailStyles.button}>
            {action.label}
          </Button>
        </Section>
      )}
      {secondary && (
        <>
          <Text style={emailStyles.text}>{secondary.intro}</Text>
          <Text style={emailStyles.text}>
            <Link href={secondary.href}>{secondary.label}</Link>
          </Text>
        </>
      )}
      {footnotes.map((footnote) => (
        <Text key={footnote} style={emailStyles.muted}>
          {footnote}
        </Text>
      ))}
    </EmailLayout>
  );
}
