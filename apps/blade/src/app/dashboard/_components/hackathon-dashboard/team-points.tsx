"use client";

import { HACKER_TEAMS, HackerClass } from "@forge/db/schemas/knight-hacks";
import { Card, CardContent, CardHeader } from "@forge/ui/card";
import { Crown, Dot, Loader, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { getClassTeam } from "~/lib/utils";
import { api } from "~/trpc/react";

export function TeamPoints({hId, hClass}:{hId:string, hClass:HackerClass})
{
    
    const {data: classPoints} = api.hacker.getPointsByClass.useQuery({hackathonName: hId})
    const [byTeam, setByTeam] = useState<number[]>([0,0])
    const team = getClassTeam(hClass)

    function updateByTeam() {
        if(!classPoints) return
        console.log(classPoints)
        let a = 0
        let b = 0
        for (let i = 0; i < classPoints.length; i++)
        {
            if(i < classPoints.length/2)
                a += (classPoints.at(i) || 0)
            else
                b += (classPoints.at(i) || 0)
        }

        setByTeam([a,b])
    }

    function formatPts(pt:number) {
        const fmt = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1})
        if(pt >= 1000)
            return `${fmt.format(pt/1000)}k`
        
        return `${pt}`
    }

    function clamp(value:number, min:number, max:number) {
        return Math.max(min, Math.min(value, max));
    }

    useEffect(()=>{
        if(classPoints)
            updateByTeam()
    },[classPoints])
    
    return(
        <Card className="bg-gradient-to-tr from-background/50 to-primary/5 shadow-lg backdrop-blur-sm">
            <CardHeader className="py-4">
                <div className="text-sm sm:text-lg flex flex-row w-full justify-between">
                    <div className="font-semibold tracking-wider" style={{
                        color: "#4075b7",
                        textShadow: team.team == HACKER_TEAMS[0] ? `0 0 10px ${"#4075b7"}, 0 0 20px ${"#4075b7"}` : "",
                    }}>{`${team.team == HACKER_TEAMS[0] ? "> " : ""}${HACKER_TEAMS[0].toUpperCase()}`}</div>
                    <div className="font-semibold tracking-wider" style={{
                        color: "#c04b3d",
                        textShadow: team.team == HACKER_TEAMS[1] ? `0 0 10px ${"#c04b3d"}, 0 0 20px ${"#c04b3d"}` : "",
                    }}>{`${HACKER_TEAMS[1].toUpperCase()}${team.team == HACKER_TEAMS[1] ? " <" : ""}`}</div>
                </div>
            </CardHeader>
            <CardContent className="pb-2">                
                <div className="border rounded-xl p-1 flex flex-row justify-between gap-1">
                    <div className="border border-[#4075b7] p-2 px-1 sm:px-2 rounded-l-lg flex flex-row justify-end transition-all duration-200" style={{
                        width: !classPoints ? "50%" : `${clamp(Math.floor((byTeam.at(0)||0)/byTeam.reduce((p,c)=>p+c)*100),15,85)}%`,
                        backgroundColor: team.team == HACKER_TEAMS[0] ? "#223e61" : "#4075b7"
                    }}>
                        {
                        !classPoints ? 
                        <Loader className="size-5 my-auto animate-spin"/>
                        :
                        <div className="text-xs sm:text-base flex flex-row gap-0.5">
                            <div className="hidden sm:block text-muted-foreground text-center pr-2">{team.team != HACKER_TEAMS[0] ? "" : (byTeam.at(0) || 0) >= (byTeam.at(1) || 0) ? "You're in the lead!" : "You're falling behind!"}</div>
                            {(byTeam.at(0) || 0) >= (byTeam.at(1) || 0) && <Crown className="size-4 sm:size-5 my-auto"/>}
                            <div className="my-auto">{formatPts(byTeam.at(0)||0)}</div>
                        </div>
                        }
                        
                    </div>
                    <div className="border border-[#c04b3d] p-2 px-1 sm:px-2 rounded-r-lg flex flex-row justify-start transition-all duration-200" style={{
                        width: !classPoints ? "50%" : `${clamp(Math.ceil((byTeam.at(1)||0)/byTeam.reduce((p,c)=>p+c)*100),15,85)}%`,
                        backgroundColor: team.team == HACKER_TEAMS[1] ? "#451c17" : "#c04b3d"
                    }}>
                        {
                        !classPoints ? 
                        <Loader className="size-5 my-auto animate-spin"/>
                        :
                        <div className="text-xs sm:text-base flex flex-row gap-0.5 my-auto">
                            {(byTeam.at(1) || 0) >= (byTeam.at(0) || 0) && <Crown className="size-4 sm:size-5 my-auto"/>}
                            <div className="my-auto">{formatPts(byTeam.at(1)||0)}</div>
                            <div className="hidden sm:block text-muted-foreground text-center pl-2">{team.team != HACKER_TEAMS[1] ? "" : (byTeam.at(1) || 0) >= (byTeam.at(0) || 0) ? "You're in the lead!" : "You're falling behind!"}</div>
                        </div>
                        }
                    </div>
                </div>
                <div className="flex flex-row justify-between">
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="size-8 my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                    <Dot className="text-muted-foreground my-auto"/>
                </div>
            </CardContent>
        </Card>
    )
}