/** @vitest-environment jsdom */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MemberResumeUpload } from "~/app/_components/member/member-resume-upload";

interface SavedMember {
  resumeUrl: string | null;
}

interface SaveMutationOptions {
  onError?: (error: Error) => void;
  onSuccess?: (member: SavedMember) => void;
}

const mocks = vi.hoisted(() => ({
  getResumeUrl: vi.fn(() => "https://files.example.test/previous-resume.pdf"),
  saveMemberResume:
    vi.fn<(input: { resumeUrl: string }) => Promise<SavedMember>>(),
  uploadResume:
    vi.fn<
      (input: { fileContent: string; fileName: string }) => Promise<string>
    >(),
}));

vi.mock("~/trpc/react", () => ({
  api: {
    resume: {
      getResume: {
        useQuery: () => ({
          data: { url: mocks.getResumeUrl() },
          isError: false,
          isFetching: false,
        }),
      },
      saveMemberResume: {
        useMutation: (options?: SaveMutationOptions) => ({
          isPending: false,
          mutateAsync: async (input: { resumeUrl: string }) => {
            try {
              const member = await mocks.saveMemberResume(input);
              options?.onSuccess?.(member);
              return member;
            } catch (error) {
              const resolvedError =
                error instanceof Error
                  ? error
                  : new Error("Resume could not be saved.");
              options?.onError?.(resolvedError);
              throw resolvedError;
            }
          },
        }),
      },
      uploadResume: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: mocks.uploadResume,
        }),
      },
    },
  },
}));

function resumeFile(name: string) {
  return new File(["%PDF-1.7\n%%EOF\n"], name, {
    type: "application/pdf",
  });
}

function selectResume(label: "Replace" | "Upload", name: string) {
  fireEvent.change(
    screen.getByLabelText(label, { selector: 'input[type="file"]' }),
    {
      target: { files: [resumeFile(name)] },
    },
  );
}

beforeEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.uploadResume.mockResolvedValue("user-id/new-resume.pdf");
  mocks.saveMemberResume.mockResolvedValue({
    resumeUrl: "user-id/new-resume.pdf",
  });

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn((file: File) => `blob:${file.name}`),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

describe("MemberResumeUpload", () => {
  it("confirms a deferred signup upload without opening the viewer", async () => {
    const onChange = vi.fn();
    render(
      <MemberResumeUpload
        initialResumeUrl={null}
        onChange={onChange}
        saveMode="deferred"
      />,
    );

    selectResume("Upload", "signup-resume.pdf");

    expect(
      await screen.findByRole("status", {
        name: "Resume uploaded successfully.",
      }),
    ).toBeVisible();
    expect(onChange).toHaveBeenCalledWith("user-id/new-resume.pdf");
    expect(mocks.saveMemberResume).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("dialog", { name: "Resume" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByRole("dialog", { name: "Resume" })).toBeVisible();
    expect(screen.getByTitle("signup-resume.pdf preview")).toBeVisible();
  });

  it("waits for an existing member's save before confirming replacement", async () => {
    let finishSave: ((member: SavedMember) => void) | undefined;
    mocks.saveMemberResume.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishSave = resolve;
        }),
    );
    render(
      <MemberResumeUpload initialResumeUrl="user-id/previous-resume.pdf" />,
    );

    selectResume("Replace", "replacement.pdf");

    await waitFor(() => expect(mocks.uploadResume).toHaveBeenCalledOnce());
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("dialog", { name: "Resume" }),
    ).not.toBeInTheDocument();

    act(() => {
      finishSave?.({ resumeUrl: "user-id/new-resume.pdf" });
    });

    expect(
      await screen.findByRole("status", {
        name: "Resume replaced successfully.",
      }),
    ).toBeVisible();
    expect(mocks.saveMemberResume).toHaveBeenCalledWith({
      resumeUrl: "user-id/new-resume.pdf",
    });
  });

  it("dismisses confirmation after five seconds without disabling View", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <MemberResumeUpload
        initialResumeUrl={null}
        onChange={vi.fn()}
        saveMode="deferred"
      />,
    );

    selectResume("Upload", "timed-resume.pdf");
    expect(
      await screen.findByRole("status", {
        name: "Resume uploaded successfully.",
      }),
    ).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeEnabled();
  });

  it("preserves the previous resume when replacement fails", async () => {
    mocks.saveMemberResume.mockRejectedValue(
      new Error("Resume could not be saved."),
    );
    render(
      <MemberResumeUpload initialResumeUrl="user-id/previous-resume.pdf" />,
    );

    selectResume("Replace", "failed-replacement.pdf");

    expect(await screen.findByText("Resume could not be saved.")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(screen.getByRole("dialog", { name: "Resume" })).toBeVisible();
    const preview = screen.getByTitle("Resume preview");
    expect(preview).toHaveAttribute(
      "src",
      "https://files.example.test/previous-resume.pdf",
    );
    expect(
      screen.queryByTitle("failed-replacement.pdf preview"),
    ).not.toBeInTheDocument();
  });
});
