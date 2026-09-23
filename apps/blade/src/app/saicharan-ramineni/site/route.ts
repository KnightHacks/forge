const PERSONAL_SITE = "https://saicharanramineni.com/";

const frameBridge = /* html */ `
  <script>
    (() => {
      for (const methodName of ["pushState", "replaceState"]) {
        const method = history[methodName].bind(history);
        history[methodName] = (state, unused, url) => {
          try {
            method(state, unused, url);
          } catch (error) {
            if (!(error instanceof DOMException) || error.name !== "SecurityError") {
              throw error;
            }
            method(state, unused);
          }
        };
      }

      document.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const link = target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        const destination = new URL(link.href, "${PERSONAL_SITE}");
        if (destination.origin === new URL("${PERSONAL_SITE}").origin) {
          event.preventDefault();
          window.open(destination.href, "_blank", "noopener,noreferrer");
        }
      }, true);
    })();
  </script>
  <base href="${PERSONAL_SITE}">
`;

function injectFrameBridge(document: string) {
  const executableDocument = document
    .replace(
      /<script[^>]*src="\/cdn-cgi\/scripts\/[^"]*rocket-loader[^"]*"[^>]*><\/script>/gi,
      "",
    )
    .replace(
      /<script>\(function\(\)\{function c\(\)\{[\s\S]*?__CF\$cv\$params[\s\S]*?<\/script>/gi,
      "",
    )
    .replace(
      /\s+type="[a-z0-9]+-text\/javascript"/gi,
      ' type="text/javascript"',
    )
    .replace(/\s+data-cf-settings="[^"]*"/gi, "");
  return executableDocument.replace(/<head([^>]*)>/i, `<head$1>${frameBridge}`);
}

function unavailableResponse() {
  return new Response(
    `<!doctype html><html><head><title>Portfolio unavailable</title></head><body style="margin:0;display:grid;min-height:100vh;place-items:center;background:#02040d;color:white;font:16px system-ui"><a style="color:#8de5ee" href="${PERSONAL_SITE}" target="_blank" rel="noreferrer">Open saicharanramineni.com</a></body></html>`,
    {
      status: 502,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

export async function GET() {
  try {
    const response = await fetch(PERSONAL_SITE, {
      headers: { Accept: "text/html" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) return unavailableResponse();
    const document = injectFrameBridge(await response.text());
    return new Response(document, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch {
    return unavailableResponse();
  }
}
