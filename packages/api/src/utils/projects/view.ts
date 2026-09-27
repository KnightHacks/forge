/** Removes participant contact and school data from a judge-facing project. */
export function projectForJudge<
  TProject extends {
    members: readonly { name: string }[];
    universities: readonly string[];
  },
>(project: TProject) {
  const { members, universities: _universities, ...publicProject } = project;

  return {
    ...publicProject,
    members: members.map(({ name }) => ({ name })),
  };
}
