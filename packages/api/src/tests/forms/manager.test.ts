import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FormConnectionMapping,
  FormResponseCallbackMap,
} from "../../utils/forms/manager";
import { createResponse, updateResponse } from "../../utils/forms/manager";

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

function createForm(overrides: Partial<typeof form> = {}) {
  return {
    ...form,
    ...overrides,
  };
}

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

function createUpdateMock(responseId = "response-id") {
  const setValues: unknown[] = [];
  const returning = vi.fn().mockResolvedValue([{ id: responseId }]);
  const where = vi.fn(() => ({ returning }));
  const set = vi.fn((values: unknown) => {
    setValues.push(values);

    return { where };
  });
  const update = vi.fn(() => ({ set }));

  return { returning, set, setValues, update, where };
}

function createTransactionMock({
  connections = [
    {
      formField: " firstName ",
      procField: "firstName",
    },
  ],
  existingResponse = null,
  formOverrides = {},
}: {
  connections?: FormConnectionMapping[];
  existingResponse?: { id: string } | null;
  formOverrides?: Partial<typeof form>;
} = {}) {
  const insertMock = createInsertMock();
  const updateMock = createUpdateMock();
  const tx = {
    insert: insertMock.insert,
    query: {
      FormResponse: {
        findFirst: vi.fn().mockResolvedValue(existingResponse),
      },
      FormsSchemas: {
        findFirst: vi.fn().mockResolvedValue(createForm(formOverrides)),
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
    update: updateMock.update,
  };

  mocks.db.transaction.mockImplementation(
    (callback: (txHandle: typeof tx) => unknown) =>
      Promise.resolve(callback(tx)),
  );

  return {
    ...insertMock,
    tx,
    update: updateMock.update,
    updateReturning: updateMock.returning,
    updateSet: updateMock.set,
    updateSetValues: updateMock.setValues,
    updateWhere: updateMock.where,
  };
}

function asUpdateResponseDatabase(
  database: ReturnType<typeof createTransactionMock>["tx"],
) {
  return database as unknown as Parameters<
    typeof updateResponse
  >[0]["database"];
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
    createTransactionMock({
      connections: [
        {
          formField: "lastName",
          procField: "lastName",
        },
      ],
    });
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

describe("forms updateResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the current user's existing response and edited timestamp", async () => {
    const transaction = createTransactionMock({
      existingResponse: { id: "existing-response-id" },
      formOverrides: { allowEdit: true },
    });

    const result = await updateResponse({
      codeOwnedForms: [],
      database: asUpdateResponseDatabase(transaction.tx),
      input: {
        form: formId,
        responseData: {
          firstName: "Lenny",
        },
        upsert: false,
      },
      session,
    });

    expect(result).toEqual({
      formResponseId: "response-id",
      responseData: {
        firstName: "Lenny",
      },
    });
    const updateValues = transaction.updateSetValues[0] as
      | { editedAt: Date; responseData: Record<string, unknown> }
      | undefined;

    expect(updateValues?.editedAt).toBeInstanceOf(Date);
    expect(updateValues?.responseData).toEqual({
      firstName: "Lenny",
    });
    expect(transaction.values).not.toHaveBeenCalled();
  });

  it("honors allowEdit for generic self-service response updates", async () => {
    const transaction = createTransactionMock({
      existingResponse: { id: "existing-response-id" },
    });

    await expect(
      updateResponse({
        codeOwnedForms: [],
        database: asUpdateResponseDatabase(transaction.tx),
        input: {
          form: formId,
          responseData: {
            firstName: "Lenny",
          },
          upsert: false,
        },
        session,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "This form response cannot be edited.",
    });
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("backfills a missing response only when upsert is requested", async () => {
    const transaction = createTransactionMock({
      formOverrides: { allowEdit: false },
    });

    const result = await updateResponse({
      codeOwnedForms: [],
      database: asUpdateResponseDatabase(transaction.tx),
      enforceAllowEdit: false,
      input: {
        form: formId,
        responseData: {
          firstName: "Lenny",
        },
        upsert: true,
      },
      session,
    });

    expect(result.formResponseId).toBe("response-id");
    expect(transaction.values).toHaveBeenCalledWith({
      form: formId,
      responseData: {
        firstName: "Lenny",
      },
      userId,
    });
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("rejects missing or cross-user responses without upsert", async () => {
    const transaction = createTransactionMock({
      formOverrides: { allowEdit: true },
    });

    await expect(
      updateResponse({
        codeOwnedForms: [],
        database: asUpdateResponseDatabase(transaction.tx),
        input: {
          form: formId,
          responseData: {
            firstName: "Lenny",
          },
          upsert: false,
        },
        session,
      }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Form response does not exist.",
    });
    expect(transaction.values).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });

  it("rejects invalid response data before writing", async () => {
    const transaction = createTransactionMock({
      existingResponse: { id: "existing-response-id" },
      formOverrides: { allowEdit: true },
    });

    await expect(
      updateResponse({
        codeOwnedForms: [],
        database: asUpdateResponseDatabase(transaction.tx),
        input: {
          form: formId,
          responseData: {},
          upsert: false,
        },
        session,
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(transaction.values).not.toHaveBeenCalled();
    expect(transaction.update).not.toHaveBeenCalled();
  });
});
