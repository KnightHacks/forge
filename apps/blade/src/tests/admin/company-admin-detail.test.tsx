/** @vitest-environment jsdom */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { RouterOutputs } from "@forge/api";

import { CompanyAdminDetail } from "~/app/_components/admin/companies/company-admin-detail";
import { getGuildCompanyUrl } from "~/lib/guild-urls";

type CompanyDetail = RouterOutputs["career"]["getAdminCompany"];

interface MutationOptions {
  onError?: (error: { message: string }) => void;
  onSuccess?: (result: CompanyDetail["company"]) => void;
}

interface UploadMutationOptions {
  onSuccess?: (result: {
    logoObjectName: string;
    logoUrl: string | null;
  }) => void;
}

const mocks = vi.hoisted(() => ({
  approveMutate: vi.fn(),
  approveOptions: null as MutationOptions | null,
  refresh: vi.fn(),
  uploadOptions: null as UploadMutationOptions | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: vi.fn(),
  }),
}));

vi.mock("@forge/ui/toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("~/trpc/react", () => ({
  api: {
    career: {
      approveCompany: {
        useMutation: (options: MutationOptions) => {
          mocks.approveOptions = options;
          return { isPending: false, mutate: mocks.approveMutate };
        },
      },
      mergeCompanies: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      rejectCompany: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      removeCompanyImage: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      updateCompany: {
        useMutation: () => ({ isPending: false, mutate: vi.fn() }),
      },
      uploadCompanyImage: {
        useMutation: (options: UploadMutationOptions) => {
          mocks.uploadOptions = options;
          return { isPending: false, mutateAsync: vi.fn() };
        },
      },
    },
  },
}));

const detail = {
  company: {
    aliases: [],
    displayName: "Antithesis",
    domain: "antithesis.com",
    id: "5ede7bf3-8138-4da8-aad5-27a764b17d4a",
    legalName: null,
    logoUrl: null,
    reviewState: "pending",
  },
  employment: [],
} as unknown as CompanyDetail;

describe("CompanyAdminDetail", () => {
  beforeEach(() => {
    mocks.approveMutate.mockReset();
    mocks.approveOptions = null;
    mocks.refresh.mockReset();
    mocks.uploadOptions = null;
  });

  it("reflects a successful approval immediately", async () => {
    const user = userEvent.setup();
    render(<CompanyAdminDetail allCompanies={[]} canEdit detail={detail} />);

    await user.click(screen.getByRole("button", { name: "Approve company" }));
    expect(mocks.approveMutate).toHaveBeenCalledWith({
      companyId: detail.company.id,
    });

    act(() => {
      mocks.approveOptions?.onSuccess?.({
        ...detail.company,
        reviewState: "approved",
      });
    });

    expect(screen.queryByText("Review this company")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove from public Guild" }),
    ).toBeInTheDocument();
    expect(screen.getByText("approved")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Public page" })).toHaveAttribute(
      "href",
      getGuildCompanyUrl(detail.company.id),
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("reflects an uploaded company image without a stale page refresh", () => {
    const { container } = render(
      <CompanyAdminDetail allCompanies={[]} canEdit detail={detail} />,
    );

    act(() => {
      mocks.uploadOptions?.onSuccess?.({
        logoObjectName: `companies/${detail.company.id}/company-image.png`,
        logoUrl: "https://objects.example.test/company-image.png",
      });
    });

    expect(
      container.querySelector(
        'img[src="https://objects.example.test/company-image.png"]',
      ),
    ).not.toBeNull();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
