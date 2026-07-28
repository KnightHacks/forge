export const DEFAULT_CODE_TEMPLATE = `import { Container, Heading, Html, Merge, Text } from "@react-email/components";

export default (
  <Html>
    <Container style={{ maxWidth: 560, margin: "0 auto", padding: 32 }}>
      <Heading>Knight Hacks update</Heading>
      <Text>
        Hello <Merge field="recipient.firstName" fallback="friend" />,
      </Text>
      <Text>We have something exciting to share with you.</Text>
    </Container>
  </Html>
);`;

export const DEFAULT_VISUAL_DOCUMENT = {
  root: {
    children: [
      {
        children: [
          { text: "Hello " },
          {
            fallback: "friend",
            field: "recipient.firstName",
            type: "merge",
          },
        ],
        type: "text",
      },
    ],
    type: "root",
  },
  version: 1,
};
