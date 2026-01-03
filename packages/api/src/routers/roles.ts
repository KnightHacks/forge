import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { env } from "../env";
import { DEV_KNIGHTHACKS_GUILD_ID, PROD_KNIGHTHACKS_GUILD_ID } from "@forge/consts/knight-hacks";
import { Routes } from "discord-api-types/v10";
import type { APIRole } from "discord-api-types/v10";
import { protectedProcedure, publicProcedure } from "../trpc";
import {
  discord,
  log,
  getPermsAsList
} from "../utils";
import { db } from "@forge/db/client";
import { Roles } from "@forge/db/schemas/knight-hacks";
import { eq } from "@forge/db";

const KNIGHTHACKS_GUILD_ID =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_GUILD_ID as string)
    : (DEV_KNIGHTHACKS_GUILD_ID as string);

export const rolesRouter = {
    createRoleLink: protectedProcedure
        .input(z.object({ roleId: z.string(), permissions: z.string()}))
        .mutation(async ({ctx, input}) => {
            // check for duplicate discord role
            const dupe = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.discordRoleId, input.roleId)})
            if(dupe) throw new TRPCError({message: "This role is already linked.", code: "CONFLICT"})

            await db.insert(Roles).values({
                discordRoleId: input.roleId,
                permissions: input.permissions
            })

            await log({
                title: `Created Role Link`,
                message: `A Role Link for the <@&${input.roleId}> role has been created.
                \n**Permissions:**\n${getPermsAsList(input.permissions).join("\n")}`,
                color: "blade_purple",
                userId: ctx.session.user.discordUserId,
            });
    }),

    updateRoleLink: protectedProcedure
        .input(z.object({ id: z.string(), roleId: z.string(), permissions: z.string()}))
        .mutation(async ({ctx, input}) => {
            // check for existing role
            const exist = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.id, input.id)})
            if(!exist) throw new TRPCError({message: "Tried to edit a role link that does not exist.", code: "BAD_REQUEST"})

            // check for duplicate discord role
            const dupe = await db.query.Roles.findFirst({where: (t, {and, eq, not}) => and(not(eq(t.id, input.id)), eq(t.discordRoleId, input.roleId))})
            if(dupe) throw new TRPCError({message: "This role is already linked.", code: "CONFLICT"})

            await db.update(Roles).set({discordRoleId: input.roleId, permissions: input.permissions}).where(eq(Roles.id, input.id))

            await log({
                title: `Updated Role Link`,
                message: `The Role Link for the <@&${input.roleId}> role has been updated.
                \n**Original Perms:**\n${getPermsAsList(exist.permissions).join("\n")}
                \n**New Perms:**\n${getPermsAsList(input.permissions).join("\n")}`,
                color: "blade_purple",
                userId: ctx.session.user.discordUserId,
            });
    }),

    deleteRoleLink: protectedProcedure
        .input(z.object({id: z.string()}))
        .mutation(async ({ctx, input}) => {
            // check for existing role
            const exist = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.id, input.id)})
            if(!exist) throw new TRPCError({message: "Tried to delete a role link that does not exist.", code: "BAD_REQUEST"})
            
            await db.delete(Roles).where(eq(Roles.id, input.id))

            await log({
                title: `Deleted Role Link`,
                message: `The Role Link for the <@&${exist.discordRoleId}> role has been deleted.`,
                color: "uhoh_red",
                userId: ctx.session.user.discordUserId,
            });
        }),

    getRoleLink: publicProcedure
        .input(z.object({id: z.string()}))
        .query(async ({ctx, input})=>{
            if (!ctx.session) {
                return Promise.resolve(null);
            }
            
            return await db.query.Roles.findFirst({where: (t, {eq})=>eq(t.id, input.id)})
    }),

    getAllLinks: publicProcedure
        .query(async ({ctx})=>{
            if (!ctx.session) {
                return Promise.resolve([]);
            }

            return await db.select().from(Roles)
    }),

    getDiscordRole: publicProcedure
        .input(z.object({ roleId: z.string() }))
        .query(async ({ctx, input}): Promise<APIRole|null> =>{
            if (!ctx.session) {
                return Promise.resolve(null);
            }
            
            try {
                return (await discord.get(Routes.guildRole(KNIGHTHACKS_GUILD_ID, input.roleId)) as APIRole | null)
            } catch {
                return null
            }
    }),

    getDiscordRoles: publicProcedure
        .input(z.object({ roles: z.array(z.object({discordRoleId: z.string()})) }))
        .query(async ({ctx, input}): Promise<(APIRole|null)[]> =>{
            if (!ctx.session) {
                return Promise.resolve([]);
            }
            
            const ret = []

            for(const r of input.roles) {
                try {
                    ret.push(await discord.get(Routes.guildRole(KNIGHTHACKS_GUILD_ID, r.discordRoleId)) as APIRole | null)
                } catch {
                    ret.push(null)
                }
            }

            return ret
        }),
            
    getDiscordRoleCounts: publicProcedure
        .query(async ({ctx}): Promise<Record<string, number>|null> =>{
            if (!ctx.session) {
                return Promise.resolve(null);
            }

            return (await discord.get(`/guilds/${KNIGHTHACKS_GUILD_ID}/roles/member-counts`) as Record<string, number>)
    })
} satisfies TRPCRouterRecord