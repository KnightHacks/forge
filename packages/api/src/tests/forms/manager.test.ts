import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FormConnectionMapping,
  FormResponseCallbackMap,
} from "../../utils/forms/manager";
import { createResponse } from "../../utils/forms/manager";

const mocks = vi.hoisted(() => ({
  db: {
    transaction: vi.fn(),
  },
}));

vi.mock("@forge/db/client", () => ({
  db: mocks.db,
}));

const userId = "00000000-0000-4000-8000-000000000001";
const formId = "10000000-0000-4000-8000-000000000001";
const session = {
  user: {
    id: userId,
  },
} as Parameters<typeof createResponse>[0]["session"];

const form = {
  allowEdit: false,
  allowResubmission: false,
  duesOnly: false,
  formData: {
    description: "Test form",
    instructions: [],
    name: "Test form",
    questions: [],
  },
  formValidatorJson: {
    additionalProperties: false,
    properties: {
      firstName: { type: "string" },
    },
    required: ["firstName"],
    type: "object",
  },
  id: formId,
  isClosed: false,
  name: "Test form",
  section: "Membership",
  slugName: "test-form",
};

function createSelectMock() {
  return vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([]),
    })),
  }));
}

function createInsertMock(responseId = "response-id") {
  const returning = vi.fn().mockResolvedValue([{ id: responseId }]);
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));

  return { insert, returning, values };
}

function createTransactionMock(
  connections: FormConnectionMapping[] = [
    {
      formField: " firstName ",
      procField: "firstName",
    },
  ],
) {
  const insertMock = createInsertMock();
  const tx = {
    insert: insertMock.insert,
    query: {
      FormResponse: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      FormsSchemas: {
        findFirst: vi.fn().mockResolvedValue(form),
      },
      TrpcFormConnection: {
        findMany: vi.fn().mockResolvedValue([
          {
            connections,
            proc: "member.createMember",
          },
        ]),
      },
    },
    select: createSelectMock(),
  };

  mocks.db.transaction.mockImplementation(
    (callback: (txHandle: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  );

  return {
    ...insertMock,
    tx,
  };
}

describe("forms createResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps validated response fields into registered callbacks inside the transaction", async () => {
    const transaction = createTransactionMock();
    const callback = vi.fn().mockResolvedValue({ id: "member-id" });
    const callbacks: FormResponseCallbackMap = {
      "member.createMember": callback,
    };

    const result = await createResponse({
      callbacks,
      codeOwnedForms: [],
      input: {
        form: formId,
        responseData: {
          firstName: "Lenny",
        },
      },
      session,
    });

    expect(result).toEqual({
      callbackResults: [{ id: "member-id" }],
      formResponseId: "response-id",
    });
    expect(transaction.values).toHaveBeenCalledWith({
      form: formId,
      responseData: {
        firstName: "Lenny",
      },
      userId,
    });
    expect(callback).toHaveBeenCalledWith({
      data: {
        firstName: "Lenny",
      },
      database: transaction.tx,
      session,
    });
  });

  it("bubbles callback failures so the surrounding DB transaction can roll back", async () => {
    createTransactionMock();
    const callbacks: FormResponseCallbackMap = {
      "member.createMember": vi
        .fn()
        .mockRejectedValue(new Error("member callback failed")),
    };

    await expect(
      createResponse({
        callbacks,
        codeOwnedForms: [],
        input: {
          form: formId,
          responseData: {
            firstName: "Lenny",
          },
        },
        session,
      }),
    ).rejects.toThrow("member callback failed");
  });

  it("rejects missing callback fields before invoking the callback", async () => {
    createTransactionMock([
      {
        formField: "lastName",
        procField: "lastName",
      },
    ]);
    const callback = vi.fn();
    const callbacks: FormResponseCallbackMap = {
      "member.createMember": callback,
    };

    await expect(
      createResponse({
        callbacks,
        codeOwnedForms: [],
        input: {
          form: formId,
          responseData: {
            firstName: "Lenny",
          },
        },
        session,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(callback).not.toHaveBeenCalled();
  });
});
