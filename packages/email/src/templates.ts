import ts from "typescript";

import type { EmailTemplateDomain, PersonalizationField } from "./fields";
import {
  assertFieldsAllowedForDomain,
  EmailTemplateValidationError,
  PERSONALIZATION_FIELDS,
  scalarText,
} from "./fields";

export * from "./fields";

export interface ResolvedEmailTemplateLimits {
  maxAstNodes: number;
  maxEachItems: number;
  maxHtmlBytes: number;
  maxNesting: number;
  maxSourceBytes: number;
  maxTextBytes: number;
}

export const EMAIL_TEMPLATE_LIMITS: ResolvedEmailTemplateLimits = {
  maxAstNodes: 4_000,
  maxEachItems: 100,
  maxHtmlBytes: 400_000,
  maxNesting: 40,
  maxSourceBytes: 200_000,
  maxTextBytes: 200_000,
};

export type EmailTemplateLimits = Partial<ResolvedEmailTemplateLimits>;

export interface VisualEmailDocument {
  root: {
    children: VisualEmailNode[];
    type: "root";
  };
  version: 1;
}

export type VisualEmailNode =
  | {
      children: (VisualEmailNode | { text: string })[];
      type: "text";
    }
  | {
      text: string;
      type: "text";
    }
  | {
      fallback?: string;
      field: string;
      required?: boolean;
      type: "merge";
    }
  | {
      columns: { children: VisualEmailNode[] }[];
      type: "columns";
    }
  | {
      href: string;
      label: string;
      type: "button";
    };

const ALLOWED_COMPONENTS = new Set([
  "Body",
  "Button",
  "Column",
  "Container",
  "Each",
  "Head",
  "Heading",
  "Hr",
  "Html",
  "Img",
  "Link",
  "Merge",
  "Preview",
  "Row",
  "Section",
  "Text",
  "When",
]);

const COMPONENT_TAGS: Record<string, string> = {
  Body: "body",
  Button: "a",
  Column: "td",
  Container: "div",
  Head: "head",
  Heading: "h2",
  Hr: "hr",
  Html: "html",
  Img: "img",
  Link: "a",
  Preview: "span",
  Row: "tr",
  Section: "section",
  Text: "p",
};

const VOID_TAGS = new Set(["hr", "img"]);
const SAFE_STYLE_KEY = /^[a-zA-Z][a-zA-Z0-9]*$/;
const SAFE_URL = /^(https?:|mailto:|#|\/)/;

interface RenderContext {
  contract: Map<string, PersonalizationField>;
  limits: ResolvedEmailTemplateLimits;
  locals: Record<string, unknown>;
  providerNamespace?: string;
  sample: Record<string, unknown>;
}

interface RenderedNode {
  html: string;
  text: string;
}

function fail(message: string, node?: ts.Node): never {
  if (!node) throw new EmailTemplateValidationError(message);
  const source = node.getSourceFile();
  const location = source.getLineAndCharacterOfPosition(node.getStart(source));
  throw new EmailTemplateValidationError(
    `${message} at ${location.line + 1}:${location.character + 1}.`,
  );
}

function byteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

function resolveLimits(limits: EmailTemplateLimits | undefined) {
  return { ...EMAIL_TEMPLATE_LIMITS, ...limits };
}

function escapeHtml(value: unknown): string {
  return scalarText(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resolvePath(
  path: string,
  sample: Record<string, unknown>,
  locals: Record<string, unknown>,
): unknown {
  if (path in locals) return locals[path];
  const segments = path.split(".");
  let current: unknown = sample;
  for (const segment of segments) {
    if (
      typeof current !== "object" ||
      current === null ||
      !(segment in current)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function providerFieldAccessor(namespace: string, field: string) {
  const path = field
    .split(".")
    .map((segment) => `"${segment.replaceAll('"', '\\"')}"`)
    .join(" ");
  return `(index .Subscriber.Attribs "forge" "${namespace.replaceAll('"', '\\"')}" ${path})`;
}

/**
 * Rewrites `{{namespace.field}}` in a subject line into the provider's accessor.
 *
 * Subjects are plain strings, not template nodes, so the compiler that handles
 * the body never touched them — they reached Listmonk with the merge tags
 * intact, and Go rejected the campaign with `function "hacker" not defined`.
 * The campaign was created but could never start, so the send sat at "running"
 * and nobody was ever mailed. The hackathon configuration screen advertises
 * exactly this syntax, so every status email whose subject used one was
 * silently undeliverable.
 */
export function compileSubjectForProvider(
  subject: string,
  providerNamespace: string,
) {
  return subject.replace(
    /\{\{\s*([A-Za-z0-9_.]+)\s*\}\}/g,
    (_match, field: string) =>
      `{{ ${providerFieldAccessor(providerNamespace, field)} }}`,
  );
}

function providerLocal(value: unknown): string | undefined {
  if (
    typeof value === "object" &&
    value !== null &&
    "goVariable" in value &&
    typeof (value as { goVariable?: unknown }).goVariable === "string"
  ) {
    return (value as { goVariable: string }).goVariable;
  }
  return undefined;
}

function parseJsxName(name: ts.JsxTagNameExpression): string {
  if (!ts.isIdentifier(name)) {
    fail("Namespaced or dotted template components are not allowed", name);
  }
  const component = name.text;
  if (!ALLOWED_COMPONENTS.has(component)) {
    fail(`Unsupported template component "${component}"`, name);
  }
  return component;
}

function staticExpressionValue(expression: ts.Expression): unknown {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression)
  ) {
    return expression.text;
  }
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (
    expression.kind === ts.SyntaxKind.TrueKeyword ||
    expression.kind === ts.SyntaxKind.FalseKeyword
  ) {
    return expression.kind === ts.SyntaxKind.TrueKeyword;
  }
  if (ts.isObjectLiteralExpression(expression)) {
    const value: Record<string, string | number> = {};
    for (const property of expression.properties) {
      if (
        !ts.isPropertyAssignment(property) ||
        (!ts.isIdentifier(property.name) && !ts.isStringLiteral(property.name))
      ) {
        fail("Style objects may contain only static properties", property);
      }
      const key = property.name.text;
      if (!SAFE_STYLE_KEY.test(key)) fail("Unsafe style property", property);
      const item = staticExpressionValue(property.initializer);
      if (typeof item !== "string" && typeof item !== "number") {
        fail("Style values must be strings or numbers", property.initializer);
      }
      value[key] = item;
    }
    return value;
  }
  fail("Only static literal template expressions are allowed", expression);
}

function parseAttributes(
  attributes: ts.JsxAttributes,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const property of attributes.properties) {
    if (ts.isJsxSpreadAttribute(property)) {
      fail("Spread attributes are not allowed", property);
    }
    const name = property.name.getText();
    if (/^on[A-Z]/.test(name) || name === "dangerouslySetInnerHTML") {
      fail(`Unsafe template property "${name}"`, property);
    }
    if (!property.initializer) {
      result[name] = true;
    } else if (ts.isStringLiteral(property.initializer)) {
      result[name] = property.initializer.text;
    } else if (ts.isJsxExpression(property.initializer)) {
      if (!property.initializer.expression) {
        fail("Empty attribute expressions are not allowed", property);
      }
      result[name] = staticExpressionValue(property.initializer.expression);
    } else {
      fail("Unsupported attribute value", property);
    }
  }
  return result;
}

function requireStringAttribute(
  attributes: Record<string, unknown>,
  key: string,
  node: ts.Node,
): string {
  const value = attributes[key];
  if (typeof value !== "string" || value.length === 0) {
    fail(`"${key}" must be a nonempty string`, node);
  }
  return value;
}

function fieldType(
  field: string,
  locals: Record<string, unknown>,
  node: ts.Node,
): PersonalizationField["type"] | null {
  if (field in locals) return null;
  const type = (
    PERSONALIZATION_FIELDS as Record<
      string,
      PersonalizationField["type"] | undefined
    >
  )[field];
  if (!type) fail(`Unknown personalization field "${field}"`, node);
  return type;
}

function registerField(
  context: RenderContext,
  field: string,
  node: ts.Node,
  options: { fallback?: string; required?: boolean } = {},
) {
  const type = fieldType(field, context.locals, node);
  if (!type) return;
  const prior = context.contract.get(field);
  context.contract.set(field, {
    fallback: options.fallback ?? prior?.fallback,
    field,
    required: options.required === true || prior?.required === true,
    type,
  });
}

/**
 * CSS properties whose numeric values are ratios/counts rather than lengths.
 *
 * React's style API adds `px` to other non-zero numeric declarations. The safe
 * compiler accepts the same TSX dialect, so mirroring that behavior prevents
 * valid React Email source from becoming invalid CSS such as `max-width:660`.
 */
const UNITLESS_CSS_PROPERTIES = new Set([
  "animationIterationCount",
  "borderImageOutset",
  "borderImageSlice",
  "borderImageWidth",
  "boxFlex",
  "boxFlexGroup",
  "boxOrdinalGroup",
  "columnCount",
  "columns",
  "flex",
  "flexGrow",
  "flexPositive",
  "flexShrink",
  "flexNegative",
  "flexOrder",
  "fontWeight",
  "gridArea",
  "gridColumn",
  "gridColumnEnd",
  "gridColumnSpan",
  "gridColumnStart",
  "gridRow",
  "gridRowEnd",
  "gridRowSpan",
  "gridRowStart",
  "lineClamp",
  "lineHeight",
  "opacity",
  "order",
  "orphans",
  "scale",
  "tabSize",
  "widows",
  "zIndex",
  "zoom",
]);

function cssValue(key: string, value: number | string) {
  if (typeof value === "string" || value === 0) return String(value);
  return UNITLESS_CSS_PROPERTIES.has(key) ? String(value) : `${value}px`;
}

function styleToString(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const declarations: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "string" && typeof item !== "number") continue;
    const cssKey = key.replace(
      /[A-Z]/g,
      (letter) => `-${letter.toLowerCase()}`,
    );
    declarations.push(`${cssKey}:${cssValue(key, item)}`);
  }
  return declarations.join(";");
}

function htmlAttributes(
  component: string,
  attributes: Record<string, unknown>,
  node: ts.Node,
): string {
  const allowedByComponent: Record<string, Set<string>> = {
    Button: new Set(["href", "style", "target"]),
    Img: new Set(["alt", "height", "src", "style", "width"]),
    Link: new Set(["href", "style", "target"]),
  };
  const common = new Set(["className", "id", "style", "title"]);
  const allowed = allowedByComponent[component] ?? new Set<string>();
  const output: string[] = [];
  for (const [name, value] of Object.entries(attributes)) {
    if (!common.has(name) && !allowed.has(name)) {
      fail(`Unsupported "${name}" property on ${component}`, node);
    }
    if (
      (name === "href" || name === "src") &&
      (typeof value !== "string" || !SAFE_URL.test(value))
    ) {
      fail(`Unsafe ${name} value`, node);
    }
    if (name === "style") {
      const style = styleToString(value);
      if (style) output.push(`style="${escapeHtml(style)}"`);
      continue;
    }
    if (typeof value === "boolean") {
      if (value) output.push(name);
      continue;
    }
    const htmlName = name === "className" ? "class" : name;
    output.push(`${htmlName}="${escapeHtml(value)}"`);
  }
  return output.length > 0 ? ` ${output.join(" ")}` : "";
}

function legacyBackgroundAttribute(attributes: Record<string, unknown>) {
  const style = attributes.style;
  if (typeof style !== "object" || style === null || Array.isArray(style)) {
    return "";
  }
  const backgroundColor = (style as Record<string, unknown>).backgroundColor;
  return typeof backgroundColor === "string"
    ? ` bgcolor="${escapeHtml(backgroundColor)}"`
    : "";
}

function legacyAlignmentAttribute(attributes: Record<string, unknown>) {
  const style = attributes.style;
  if (typeof style !== "object" || style === null || Array.isArray(style)) {
    return "";
  }
  const textAlign = (style as Record<string, unknown>).textAlign;
  return textAlign === "center" || textAlign === "left" || textAlign === "right"
    ? ` align="${textAlign}"`
    : "";
}

function renderChildren(
  children: readonly ts.JsxChild[],
  context: RenderContext,
  depth: number,
): RenderedNode {
  const rendered = children.map((child) => renderChild(child, context, depth));
  return {
    html: rendered.map(({ html }) => html).join(""),
    text: rendered
      .map(({ text }) => text)
      .filter(Boolean)
      .join(" "),
  };
}

function renderElement(
  component: string,
  attributes: Record<string, unknown>,
  children: readonly ts.JsxChild[],
  context: RenderContext,
  depth: number,
  node: ts.Node,
): RenderedNode {
  if (depth > context.limits.maxNesting) {
    fail("Template nesting limit exceeded", node);
  }

  if (component === "Merge") {
    const field = requireStringAttribute(attributes, "field", node);
    const fallback =
      typeof attributes.fallback === "string" ? attributes.fallback : undefined;
    registerField(context, field, node, {
      fallback,
      required: attributes.required === true,
    });
    if (context.providerNamespace) {
      const local = providerLocal(context.locals[field]);
      const accessor =
        local ?? providerFieldAccessor(context.providerNamespace, field);
      const output = fallback
        ? `{{ with ${accessor} }}{{ . }}{{ else }}${escapeHtml(fallback)}{{ end }}`
        : `{{ ${accessor} }}`;
      return { html: output, text: output };
    }
    const resolved = resolvePath(field, context.sample, context.locals);
    const value =
      resolved === undefined || resolved === null || resolved === ""
        ? (fallback ?? "")
        : resolved;
    return { html: escapeHtml(value), text: scalarText(value) };
  }

  if (component === "When") {
    const field = requireStringAttribute(attributes, "field", node);
    const expected = attributes.equals;
    registerField(context, field, node);
    if (context.providerNamespace) {
      if (typeof expected !== "string" && typeof expected !== "number") {
        fail("When equals must be a string or number", node);
      }
      const rendered = renderChildren(children, context, depth + 1);
      const accessor = providerFieldAccessor(context.providerNamespace, field);
      const literal =
        typeof expected === "number"
          ? String(expected)
          : `"${expected.replaceAll('"', '\\"')}"`;
      return {
        html: `{{ if eq ${accessor} ${literal} }}${rendered.html}{{ end }}`,
        text: `{{ if eq ${accessor} ${literal} }}${rendered.text}{{ end }}`,
      };
    }
    const value = resolvePath(field, context.sample, context.locals);
    if (value !== expected) {
      // Rendered and discarded rather than skipped.
      //
      // `registerField` only runs while rendering, so returning early here left
      // every field inside a non-matching branch out of the contract — on the
      // *sample* path only. The provider path above always renders children into
      // a Go `{{ if }}`, so its contract is complete. That asymmetry means a
      // template can pass `saveTemplateDraft` and then fail at send with a field
      // error the officer never saw, and it also means the stored
      // `personalization_contract` under-reports what the template references.
      // The children are the same nodes either way; only the output is dropped.
      renderChildren(children, context, depth + 1);
      return { html: "", text: "" };
    }
    return renderChildren(children, context, depth + 1);
  }

  if (component === "Each") {
    const field = requireStringAttribute(attributes, "field", node);
    const alias = requireStringAttribute(attributes, "as", node);
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(alias)) {
      fail("Each alias must be a simple identifier", node);
    }
    registerField(context, field, node);
    if (context.providerNamespace) {
      const rendered = renderChildren(
        children,
        {
          ...context,
          locals: {
            ...context.locals,
            [alias]: { goVariable: `$${alias}` },
          },
        },
        depth + 1,
      );
      const accessor = providerFieldAccessor(context.providerNamespace, field);
      return {
        html: `{{ range $${alias} := ${accessor} }}${rendered.html}{{ end }}`,
        text: `{{ range $${alias} := ${accessor} }}${rendered.text}{{ end }}`,
      };
    }
    const value = resolvePath(field, context.sample, context.locals);

    // The alias has to be bound even when there is nothing to iterate.
    // `resolvePath` and `fieldType` both test `field in locals`, so binding it
    // to `undefined` is what makes `<Merge field="role" />` inside the loop
    // resolve to an empty string instead of being reported as an unknown
    // personalization field. Omitting this turned a template that previously
    // compiled to nothing into a hard failure.
    const emptyContext = {
      ...context,
      locals: { ...context.locals, [alias]: undefined },
    };

    if (value === undefined || value === null) {
      // Same reason as the `When` miss above: a collection absent from the
      // sample must still contribute its children's fields to the contract, or
      // the sample and provider paths disagree about what this template
      // references. Output is discarded; only the contract survives.
      renderChildren(children, emptyContext, depth + 1);
      return { html: "", text: "" };
    }
    if (!Array.isArray(value))
      fail("Each field must resolve to an array", node);
    if (value.length > context.limits.maxEachItems) {
      fail("Repeated-content limit exceeded", node);
    }
    const items = value as unknown[];
    if (items.length === 0) {
      // An empty array is the realistic case, not the absent one: `roleNames`
      // defaults to `[]`. Without this the two compile paths still disagree for
      // every template whose sample happens to have no rows.
      renderChildren(children, emptyContext, depth + 1);
      return { html: "", text: "" };
    }
    const rendered = items.map((item) =>
      renderChildren(
        children,
        { ...context, locals: { ...context.locals, [alias]: item } },
        depth + 1,
      ),
    );
    return {
      html: rendered.map(({ html }) => html).join(""),
      text: rendered.map(({ text }) => text).join(" "),
    };
  }

  const tag = COMPONENT_TAGS[component];
  if (!tag) fail(`Unsupported template component "${component}"`, node);
  const childResult = renderChildren(children, context, depth + 1);
  const attrs = htmlAttributes(component, attributes, node);

  // React Email's layout primitives are tables because Outlook and several
  // mobile clients do not consistently honor layout, alignment, or padding on
  // HTML5 section/div elements. Keep the authoring dialect pleasant while
  // emitting the deliberately old-fashioned structure email clients agree on.
  if (component === "Container") {
    const background = legacyBackgroundAttribute(attributes);
    return {
      html: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" align="center"${background}${attrs}><tbody><tr><td${background}>${childResult.html}</td></tr></tbody></table>`,
      text: `${childResult.text}\n`.trim(),
    };
  }
  if (component === "Section") {
    const background = legacyBackgroundAttribute(attributes);
    const alignment = legacyAlignmentAttribute(attributes);
    return {
      html: `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"${background}><tbody><tr><td${background}${alignment}${attrs}>${childResult.html}</td></tr></tbody></table>`,
      text: `${childResult.text}\n`.trim(),
    };
  }
  if (component === "Body") {
    const background = legacyBackgroundAttribute(attributes);
    return {
      html: `<body${background}${attrs}>${childResult.html}</body>`,
      text: `${childResult.text}\n`.trim(),
    };
  }
  if (VOID_TAGS.has(tag)) {
    return { html: `<${tag}${attrs} />`, text: childResult.text };
  }
  const html = `<${tag}${attrs}>${childResult.html}</${tag}>`;
  const textSuffix = ["a", "div", "h2", "p", "section", "td", "tr"].includes(
    tag,
  )
    ? "\n"
    : "";
  return { html, text: `${childResult.text}${textSuffix}`.trim() };
}

function renderChild(
  node: ts.Node,
  context: RenderContext,
  depth: number,
): RenderedNode {
  if (ts.isJsxText(node)) {
    const text = node.text.replace(/\s+/g, " ");
    return { html: escapeHtml(text), text: text.trim() };
  }
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return { html: "", text: "" };
    const value = staticExpressionValue(node.expression);
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    ) {
      fail("JSX text expressions must be scalar literals", node);
    }
    return { html: escapeHtml(value), text: scalarText(value) };
  }
  if (ts.isJsxSelfClosingElement(node)) {
    return renderElement(
      parseJsxName(node.tagName),
      parseAttributes(node.attributes),
      [],
      context,
      depth,
      node,
    );
  }
  if (ts.isJsxElement(node)) {
    const open = parseJsxName(node.openingElement.tagName);
    const close = parseJsxName(node.closingElement.tagName);
    if (open !== close) fail("Mismatched template component", node);
    return renderElement(
      open,
      parseAttributes(node.openingElement.attributes),
      node.children,
      context,
      depth,
      node,
    );
  }
  fail("Unsupported JSX fragment", node);
}

function findRootExpression(sourceFile: ts.SourceFile): ts.Expression {
  let root: ts.Expression | undefined;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "@react-email/components"
      ) {
        fail(
          'Only imports from "@react-email/components" are allowed',
          statement,
        );
      }
      const imports = statement.importClause?.namedBindings;
      if (!imports || !ts.isNamedImports(imports)) {
        fail("Only named React Email imports are allowed", statement);
      }
      for (const element of imports.elements) {
        if (!ALLOWED_COMPONENTS.has(element.name.text)) {
          fail(
            `Unsupported React Email import "${element.name.text}"`,
            element,
          );
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      root = statement.expression;
      continue;
    }
    if (statement.kind === ts.SyntaxKind.EmptyStatement) continue;
    fail(
      "Template source may contain only supported imports and one default JSX export",
      statement,
    );
  }
  if (!root) fail("Template source requires a default JSX export");
  while (ts.isParenthesizedExpression(root)) root = root.expression;
  if (!ts.isJsxElement(root) && !ts.isJsxSelfClosingElement(root)) {
    fail("The default template export must be JSX", root);
  }
  return root;
}

function validateTree(
  sourceFile: ts.SourceFile,
  limits: ResolvedEmailTemplateLimits,
) {
  let nodes = 0;
  let deepest = 0;
  const visit = (node: ts.Node, depth: number) => {
    nodes += 1;
    deepest = Math.max(deepest, depth);
    if (nodes > limits.maxAstNodes) {
      fail("Template AST complexity limit exceeded", node);
    }
    if (deepest > limits.maxNesting * 4) {
      fail("Template nesting limit exceeded", node);
    }
    ts.forEachChild(node, (child) => visit(child, depth + 1));
  };
  visit(sourceFile, 0);
}

function finalize(
  kind: "code" | "visual",
  rendered: RenderedNode,
  contract: Map<string, PersonalizationField>,
  limits: ResolvedEmailTemplateLimits,
  domain?: EmailTemplateDomain,
) {
  // Both compile paths pass through here with a complete contract, so this is
  // the one place the domain rule has to hold.
  if (domain) assertFieldsAllowedForDomain(contract, domain);
  const emailHead =
    '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
    '<meta name="x-apple-disable-message-reformatting" />' +
    '<meta name="color-scheme" content="light only" />' +
    '<meta name="supported-color-schemes" content="light only" />' +
    "<style>:root{color-scheme:light only;supported-color-schemes:light only}</style>";
  const documentHtml = rendered.html.includes("<head>")
    ? rendered.html.replace("<head>", `<head>${emailHead}`)
    : rendered.html.replace("<html>", `<html><head>${emailHead}</head>`);
  const html = `<!doctype html>${documentHtml}`.trim();
  const text = rendered.text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (byteLength(html) > limits.maxHtmlBytes) {
    throw new EmailTemplateValidationError(
      "Compiled HTML output size limit exceeded.",
    );
  }
  if (byteLength(text) > limits.maxTextBytes) {
    throw new EmailTemplateValidationError(
      "Compiled text output size limit exceeded.",
    );
  }
  if (!html || !text) {
    throw new EmailTemplateValidationError(
      "Template must compile to nonempty HTML and text.",
    );
  }
  return {
    contract: [...contract.values()].sort((a, b) =>
      a.field.localeCompare(b.field),
    ),
    html,
    kind,
    text,
  };
}

export function compileCodeEmailTemplate({
  domain,
  limits: limitOverrides,
  providerNamespace,
  sample,
  source,
}: {
  domain?: EmailTemplateDomain;
  limits?: EmailTemplateLimits;
  providerNamespace?: string;
  sample: Record<string, unknown>;
  source: string;
}) {
  const limits = resolveLimits(limitOverrides);
  if (byteLength(source) > limits.maxSourceBytes) {
    throw new EmailTemplateValidationError(
      "Template source size limit exceeded.",
    );
  }
  const sourceFile = ts.createSourceFile(
    "email-template.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const diagnostics = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.Latest,
    },
    fileName: "email-template.tsx",
    reportDiagnostics: true,
  }).diagnostics;
  if (diagnostics && diagnostics.length > 0) {
    const diagnostic = diagnostics[0];
    throw new EmailTemplateValidationError(
      `Template source could not be parsed: ${diagnostic ? ts.flattenDiagnosticMessageText(diagnostic.messageText, " ") : "unknown syntax error"}.`,
    );
  }
  validateTree(sourceFile, limits);
  const root = findRootExpression(sourceFile);
  const context: RenderContext = {
    contract: new Map(),
    limits,
    locals: {},
    providerNamespace,
    sample,
  };
  const rendered = renderChild(root, context, 0);
  return finalize("code", rendered, context.contract, limits, domain);
}

function renderVisualNodes(
  nodes: VisualEmailNode[],
  sample: Record<string, unknown>,
  contract: Map<string, PersonalizationField>,
  providerNamespace?: string,
): RenderedNode {
  const rendered = nodes.map((node): RenderedNode => {
    if (node.type === "merge") {
      const type = (
        PERSONALIZATION_FIELDS as Record<
          string,
          PersonalizationField["type"] | undefined
        >
      )[node.field];
      if (!type) {
        throw new EmailTemplateValidationError(
          `Unknown personalization field "${node.field}".`,
        );
      }
      contract.set(node.field, {
        fallback: node.fallback,
        field: node.field,
        required: node.required === true,
        type,
      });
      const value = providerNamespace
        ? undefined
        : resolvePath(node.field, sample, {});
      const output: unknown = providerNamespace
        ? node.fallback
          ? `{{ with ${providerFieldAccessor(providerNamespace, node.field)} }}{{ . }}{{ else }}${escapeHtml(node.fallback)}{{ end }}`
          : `{{ ${providerFieldAccessor(providerNamespace, node.field)} }}`
        : (value ?? node.fallback ?? "");
      return {
        html: providerNamespace ? scalarText(output) : escapeHtml(output),
        text: scalarText(output),
      };
    }
    if (node.type === "button") {
      if (!SAFE_URL.test(node.href)) {
        throw new EmailTemplateValidationError("Unsafe button URL.");
      }
      return {
        html: `<a href="${escapeHtml(node.href)}">${escapeHtml(node.label)}</a>`,
        text: `${node.label} (${node.href})`,
      };
    }
    if (node.type === "columns") {
      const columns = node.columns.map((column) =>
        renderVisualNodes(column.children, sample, contract, providerNamespace),
      );
      return {
        html: `<table><tbody><tr>${columns.map(({ html }) => `<td>${html}</td>`).join("")}</tr></tbody></table>`,
        text: columns.map(({ text }) => text).join(" "),
      };
    }
    if ("text" in node) {
      return { html: `<p>${escapeHtml(node.text)}</p>`, text: node.text };
    }
    const children = node.children.map((child): RenderedNode => {
      if ("text" in child && !("type" in child)) {
        return { html: escapeHtml(child.text), text: child.text };
      }
      return renderVisualNodes([child], sample, contract, providerNamespace);
    });
    return {
      html: `<p>${children.map(({ html }) => html).join("")}</p>`,
      text: children.map(({ text }) => text).join(""),
    };
  });
  return {
    html: rendered.map(({ html }) => html).join(""),
    text: rendered.map(({ text }) => text).join("\n"),
  };
}

export function compileVisualEmailTemplate({
  document,
  domain,
  limits: limitOverrides,
  providerNamespace,
  sample,
}: {
  document: VisualEmailDocument;
  domain?: EmailTemplateDomain;
  limits?: EmailTemplateLimits;
  providerNamespace?: string;
  sample: Record<string, unknown>;
}) {
  const untrustedDocument = document as unknown as {
    root?: { type?: unknown };
    version?: unknown;
  };
  if (
    untrustedDocument.version !== 1 ||
    untrustedDocument.root?.type !== "root"
  ) {
    throw new EmailTemplateValidationError(
      "Unsupported visual template document.",
    );
  }
  const limits = resolveLimits(limitOverrides);
  const contract = new Map<string, PersonalizationField>();
  const rendered = renderVisualNodes(
    document.root.children,
    sample,
    contract,
    providerNamespace,
  );
  return {
    ...finalize("visual", rendered, contract, limits, domain),
    document,
  };
}
