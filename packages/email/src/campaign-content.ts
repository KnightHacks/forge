/** Keep provider controls inside the authored document, without a second page. */
export function campaignHtmlWithFooter(html: string) {
  const links = [
    ...(/\{\{\s*UnsubscribeURL\b/.test(html)
      ? []
      : [
          '<a href="{{ UnsubscribeURL }}" style="color:#f8f2c6;text-decoration:underline">{{ L.T "email.unsub" }}</a>',
        ]),
    ...(/\{\{\s*MessageURL\b/.test(html)
      ? []
      : [
          '<a href="{{ MessageURL }}" style="color:#f8f2c6;text-decoration:underline">{{ L.T "email.viewInBrowser" }}</a>',
        ]),
  ];
  const tracking = /\{\{\s*TrackView\b/.test(html)
    ? ""
    : '<div style="height:0;line-height:0;font-size:0;overflow:hidden">{{ TrackView }}</div>';
  const footer = links.length
    ? `<div style="box-sizing:border-box;width:100%;max-width:660px;margin:0 auto;padding:16px;background-color:#071522;color:#f8f2c6;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:20px;text-align:center">${links.join(" &middot; ")}${tracking}</div>`
    : tracking;

  // Code templates are complete documents; visual templates can be fragments.
  return /<\/(?:body|html)\s*>/i.test(html)
    ? html.replace(/<\/(?:body|html)\s*>/i, (closingTag) => footer + closingTag)
    : html + footer;
}
