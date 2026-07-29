interface RecipientIdentity {
  email: string;
  name: string;
}

const recipientNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function recipientFirstName(name: string, email: string) {
  return name.trim().split(/\s+/)[0] || email;
}

export function compareRecipientsByFirstName(
  left: RecipientIdentity,
  right: RecipientIdentity,
) {
  return (
    recipientNameCollator.compare(
      recipientFirstName(left.name, left.email),
      recipientFirstName(right.name, right.email),
    ) ||
    recipientNameCollator.compare(
      left.name || left.email,
      right.name || right.email,
    ) ||
    recipientNameCollator.compare(left.email, right.email)
  );
}

/**
 * Recipients matching the search box, ordered the way the compose list shows
 * them. An empty search keeps every recipient.
 */
export function visibleRecipients<Recipient extends RecipientIdentity>(
  recipients: readonly Recipient[],
  search: string,
) {
  const query = search.trim().toLowerCase();
  return recipients
    .filter(
      ({ email, name }) =>
        !query ||
        email.toLowerCase().includes(query) ||
        name.toLowerCase().includes(query),
    )
    .sort(compareRecipientsByFirstName);
}
