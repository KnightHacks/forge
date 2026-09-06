import { Suspense } from "react";

import {
  JudgeProjectsLoading as JudgeProjectsLoadingView,
  JudgeProjectsStaticLoading,
} from "~/app/_components/projects/judge-projects-loading";

export default function JudgeProjectsLoading() {
  return (
    <Suspense fallback={<JudgeProjectsStaticLoading />}>
      <JudgeProjectsLoadingView />
    </Suspense>
  );
}
