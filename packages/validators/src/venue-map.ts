import { z } from "zod";

import { VENUE_MAP } from "@forge/consts";

export const mapRoomSchema = z
  .object({
    buildingId: z.enum(VENUE_MAP.BUILDINGS.map((building) => building.id)),
    roomNumber: z
      .string()
      .trim()
      .min(1)
      .max(24)
      .transform((room) => room.toUpperCase()),
    name: z
      .string()
      .trim()
      .max(120)
      .nullable()
      .optional()
      .transform((name) => (name === "" || name === undefined ? null : name)),
  })
  .strict();

export const mapConfigurationSchema = z
  .object({
    restrictionsEnabled: z.boolean(),
    rooms: z
      .array(mapRoomSchema)
      .max(1000)
      .superRefine((rooms, ctx) => {
        const seen = new Set<string>();
        rooms.forEach((room, index) => {
          const key = `${room.buildingId}:${room.roomNumber}`;
          if (seen.has(key))
            ctx.addIssue({
              code: "custom",
              message: "Each building and room may appear only once.",
              path: [index, "roomNumber"],
            });
          seen.add(key);
        });
      }),
  })
  .strict();

export const saveMapConfigurationSchema = mapConfigurationSchema.extend({
  hackathonId: z.string().uuid(),
});

export type MapConfiguration = z.output<typeof mapConfigurationSchema>;
