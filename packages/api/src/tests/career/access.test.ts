import { describe, expect, it } from "vitest";

import {
  assertCanEditCompanies,
  assertCanReadCompanies,
} from "../../utils/career/access";
import { createEmptyPermissionMap } from "../../utils/permissions";

function actor(
  ...allowed: (keyof ReturnType<typeof createEmptyPermissionMap>)[]
) {
  const permissions = createEmptyPermissionMap();
  for (const permission of allowed) permissions[permission] = true;
  return { session: { permissions } };
}

describe("company administration access", () => {
  it.each(["READ_COMPANIES", "EDIT_COMPANIES", "IS_OFFICER"] as const)(
    "allows %s to read companies",
    (permission) => {
      expect(() => assertCanReadCompanies(actor(permission))).not.toThrow();
    },
  );

  it.each(["EDIT_COMPANIES", "IS_OFFICER"] as const)(
    "allows %s to edit companies",
    (permission) => {
      expect(() => assertCanEditCompanies(actor(permission))).not.toThrow();
    },
  );

  it("does not inherit company access from member permissions", () => {
    expect(() => assertCanReadCompanies(actor("READ_MEMBERS"))).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
    expect(() => assertCanEditCompanies(actor("EDIT_MEMBERS"))).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });

  it("keeps read-only company access from editing", () => {
    expect(() => assertCanEditCompanies(actor("READ_COMPANIES"))).toThrowError(
      expect.objectContaining({ code: "FORBIDDEN" }),
    );
  });
});
