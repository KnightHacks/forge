import { TRPCError } from "@trpc/server";
import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { env } from "../env";
import { DEV_KNIGHTHACKS_GUILD_ID, PermissionKey, PERMISSIONS, PROD_KNIGHTHACKS_GUILD_ID } from "@forge/consts/knight-hacks";
import { Routes } from "discord-api-types/v10";
import type { APIRole } from "discord-api-types/v10";
import { permProcedure, protectedProcedure } from "../trpc";
import {
  discord,
  log,
  getPermsAsList,
  hasPermission,
  controlPerms,
} from "../utils";
import { db } from "@forge/db/client";
import { Permissions, Roles } from "@forge/db/schemas/auth";
import { eq, sql } from "@forge/db";
import { User } from "@forge/db/schemas/auth";

const KNIGHTHACKS_GUILD_ID =
  env.NODE_ENV === "production"
    ? (PROD_KNIGHTHACKS_GUILD_ID as string)
    : (DEV_KNIGHTHACKS_GUILD_ID as string);

export const rolesRouter = {
    // ROLES

    createRoleLink: permProcedure
        .input(z.object({ name: z.string(), roleId: z.string(), permissions: z.string()}))
        .mutation(async ({ctx, input}) => {
            controlPerms.and(["CONFIGURE_ROLES"], ctx);

            // check for duplicate discord role
            const dupe = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.discordRoleId, input.roleId)})
            if(dupe) throw new TRPCError({message: "This role is already linked.", code: "CONFLICT"})

            await db.insert(Roles).values({
                name: input.name,
                discordRoleId: input.roleId,
                permissions: input.permissions
            })

            await log({
                title: `Created Role`,
                message: `The **${input.name}** role has been created, linked to <@&${input.roleId}>.
                \n**Permissions:**\n${getPermsAsList(input.permissions).join("\n")}`,
                color: "blade_purple",
                userId: ctx.session.user.discordUserId,
            });
    }),

    updateRoleLink: permProcedure
        .input(z.object({ name: z.string(), id: z.string(), roleId: z.string(), permissions: z.string()}))
        .mutation(async ({ctx, input}) => {
            controlPerms.and(["CONFIGURE_ROLES"], ctx);

            // check for existing role
            const exist = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.id, input.id)})
            if(!exist) throw new TRPCError({message: "Tried to edit a role link that does not exist.", code: "BAD_REQUEST"})

            // check for duplicate discord role
            const dupe = await db.query.Roles.findFirst({where: (t, {and, eq, not}) => and(not(eq(t.id, input.id)), eq(t.discordRoleId, input.roleId))})
            if(dupe) throw new TRPCError({message: "This role is already linked.", code: "CONFLICT"})

            await db.update(Roles).set({name: input.name, discordRoleId: input.roleId, permissions: input.permissions}).where(eq(Roles.id, input.id))

            await log({
                title: `Updated Role`,
                message: `The **${exist.name}** Role (<@&${input.roleId}>) role has been updated.
                \n**Name:** ${exist.name} -> ${input.name}
                \n**Original Perms:**\n${getPermsAsList(exist.permissions).join("\n")}
                \n**New Perms:**\n${getPermsAsList(input.permissions).join("\n")}`,
                color: "blade_purple",
                userId: ctx.session.user.discordUserId,
            });
    }),

    deleteRoleLink: permProcedure
        .input(z.object({id: z.string()}))
        .mutation(async ({ctx, input}) => {
            controlPerms.and(["CONFIGURE_ROLES"], ctx);

            // check for existing role
            const exist = await db.query.Roles.findFirst({where: (t, {eq}) => eq(t.id, input.id)})
            if(!exist) throw new TRPCError({message: "Tried to delete a role link that does not exist.", code: "BAD_REQUEST"})
            
            await db.delete(Roles).where(eq(Roles.id, input.id))

            await log({
                title: `Deleted Role`,
                message: `The **${exist.name}** Role (<@&${exist.discordRoleId}>) role has been deleted.`,
                color: "uhoh_red",
                userId: ctx.session.user.discordUserId,
            });
        }),

    getRoleLink: protectedProcedure
        .input(z.object({id: z.string()}))
        .query(async ({input})=>{
            return await db.query.Roles.findFirst({where: (t, {eq})=>eq(t.id, input.id)})
    }),

    getAllLinks: protectedProcedure
        .query(async ()=>{
            return await db.select().from(Roles)
    }),

    getDiscordRole: protectedProcedure
        .input(z.object({ roleId: z.string() }))
        .query(async ({input}): Promise<APIRole|null> =>{
            try {
                return (await discord.get(Routes.guildRole(KNIGHTHACKS_GUILD_ID, input.roleId)) as APIRole | null)
            } catch {
                return null
            }
    }),

    getDiscordRoles: protectedProcedure
        .input(z.object({ roles: z.array(z.object({discordRoleId: z.string()})) }))
        .query(async ({input}): Promise<(APIRole|null)[]> =>{
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
            
    getDiscordRoleCounts: protectedProcedure
        .query(async (): Promise<Record<string, number>|null> =>{
            return (await discord.get(`/guilds/${KNIGHTHACKS_GUILD_ID}/roles/member-counts`) as Record<string, number>)
    }),

    // PERMS

    // returnes the bitwise OR'd permissions for the given user
    // if no user is passed, get the current context user
    getPermissions: protectedProcedure
        .input(z.optional(z.object({userId: z.string()})))
        .query(async ({ctx, input}) => {
            const permRows = await db.select({
                permissions: Roles.permissions
            })
            .from(Roles)
            .innerJoin(Permissions, eq(Roles.id, Permissions.roleId))
            .where(sql`cast(${Permissions.userId} as text) = ${input ? input.userId : ctx.session.user.id}`)
            
            const permissionsBits = new Array(Object.keys(PERMISSIONS).length).fill(false) as boolean[];

            permRows.forEach((v) => {
                for (let i = 0; i < v.permissions.length; i++) {
                    if(v.permissions.at(i) == "1")
                        permissionsBits[i] = true
                }
            })

            const permissionsMap = Object.keys(PERMISSIONS).reduce((accumulator, key) => {  
                const index = PERMISSIONS[key as PermissionKey];
        
                accumulator[key as PermissionKey] = permissionsBits[index] ?? false;
        
                return accumulator;
            }, {} as Record<PermissionKey, boolean>)

            return permissionsMap
        }),

    hasPermission: permProcedure
        .input(z.object({and: z.optional(z.array(z.string())), or: z.optional(z.array(z.string()))}))
        .query(({input, ctx}) => {
            try {
                if(input.or) controlPerms.or(input.or as PermissionKey[], ctx)
                if(input.and) controlPerms.and(input.and as PermissionKey[], ctx)
            } catch {
                return false
            }

            return true
        }),

    grantPermission: permProcedure
        .input(z.object({roleId: z.string(), userId: z.string()}))
        .mutation(async ({input, ctx}) => {
            controlPerms.or(["ASSIGN_ROLES"], ctx)

            const exists = await db.query.Permissions.findFirst({
                where: (t, {eq, and}) => and(eq(t.userId, input.userId), eq(t.roleId, input.roleId))
            })

            if(exists) throw new TRPCError({code: "CONFLICT", message: "This permission relation already exists."})

            await db.insert(Permissions).values({
                roleId: input.roleId,
                userId: input.userId
            })

            const user = await db.query.User.findFirst({
                where: (t, {eq}) => eq(t.id, input.userId)
            })

            const role = await db.query.Roles.findFirst({
                where: (t, {eq}) => eq(t.id, input.roleId)
            })

            if(role && user)
            await log({
                title: `Granted Role`,
                message: `The **${role.name}** role (<@&${role.discordRoleId}>) has granted to <@${user.discordUserId}>.`,
                color: "success_green",
                userId: ctx.session.user.discordUserId,
            });
        }),

    revokePermission: permProcedure
        .input(z.object({roleId: z.string(), userId: z.string()}))
        .mutation(async ({input, ctx}) => {
            controlPerms.or(["ASSIGN_ROLES"], ctx)

            const perm = await db.query.Permissions.findFirst({
                where: (t, {eq, and}) => and(eq(t.userId, input.userId), eq(t.roleId, input.roleId))
            })

            if(!perm) throw new TRPCError({code: "BAD_REQUEST", message: "The permission relation you are trying to revoke does not exist."})

            await db.delete(Permissions).where(eq(Permissions.id, perm.id))

            const user = await db.query.User.findFirst({
                where: (t, {eq}) => eq(t.id, input.userId)
            })

            const role = await db.query.Roles.findFirst({
                where: (t, {eq}) => eq(t.id, input.roleId)
            })

            if(role && user)
            await log({
                title: `Revoked Role`,
                message: `The **${role.name}** role (<@&${role.discordRoleId}>) has revoked from <@${user.discordUserId}>.`,
                color: "uhoh_red",
                userId: ctx.session.user.discordUserId,
            });
        })
        

} satisfies TRPCRouterRecord