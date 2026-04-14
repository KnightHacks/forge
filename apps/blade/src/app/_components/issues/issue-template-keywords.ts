const ROOT_INPUT_KEYWORD = "{INPUT}";
const CHILD_PARENT_KEYWORD = "{PARENT}";

export function hasInputKeyword(name: string) {
  return name.includes(ROOT_INPUT_KEYWORD);
}

export function resolveRootTemplateName(name: string, input: string) {
  return name.replaceAll(ROOT_INPUT_KEYWORD, input);
}

export function resolveChildTemplateName(
  name: string,
  parentName: string | undefined,
) {
  if (!parentName) return name;
  return name.replaceAll(CHILD_PARENT_KEYWORD, parentName);
}
