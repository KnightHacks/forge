"use client"

import { HACKER_CLASSES, HACKER_TEAMS, HackerClass } from "@forge/db/schemas/knight-hacks";
import { Crown, Dot, Loader } from "lucide-react";
import { useEffect, useState } from "react";
import { getClassTeam } from "~/lib/utils";
import { api } from "~/trpc/react";
import type { api as serverCall } from "~/trpc/server";

interface LeaderboardEntry {
    firstName: string;
    lastName: string;
    points: number;
    class: "Operators" | "Machinist" | "Sentinels" | "Harbinger" | "Monstologist" | "Alchemist" | "VIP" | null;
    id: string;
}

export function PointLeaderboard({hacker, hId}:{hacker:Awaited<ReturnType<(typeof serverCall.hacker)["getHacker"]>>, hId:string})
{
    const dummy:HackerClass[] = ["Operators", "Harbinger", "Machinist", "Sentinels", "Monstologist"]

    const {data: data} = api.hacker.getTopHackers.useQuery({hackathonName: hId, hPoints: hacker?.points || 0, hClass: hacker?.class || "Alchemist"})
    const team = getClassTeam(hacker?.class || "Alchemist")

    const [overall, setOverall] = useState<LeaderboardEntry[]>()
    const [showYours, setShowYours] = useState(false)

    const [activeInd, setInd] = useState(-1)
    const [activeTop, setTop] = useState(overall)

    useEffect(()=>{
        console.log(data)
        if(data) {
            setOverall(data.topA.concat(data.topB).sort((a,b)=>b.points-a.points).splice(0,5))
            setInd(1)
        }
            
    }, [data])

    useEffect(()=>{
        switch(activeInd) {
            case 0:
                setTop(data?.topA ?? [])
                break;
            case 1:
                setTop(overall ?? [])
                break;
            case 2:
                setTop(data?.topB ?? [])
                break;
        }
    },[activeInd])

    useEffect(()=>{
        if(activeTop)
            setShowYours(!activeTop.find((v)=>v.id == hacker?.id) && ((data?.place[activeInd] ?? -1) != -1))
    },[activeTop])

    return(
    <>
        <div className="w-full grid grid-cols-3 gap-2">
            <button type="button" onClick={()=>setInd(0)} className={`uppercase font-semibold text-xs sm:text-sm cursor-pointer duration-200 text-center py-1 px-2 border rounded-lg ${activeInd == 0 ? "bg-[#228be690]" : "hover:bg-[#228be650]"}`}>{HACKER_TEAMS[0]}</button>
            <button type="button" onClick={()=>setInd(1)} className={`uppercase font-semibold text-xs sm:text-sm cursor-pointer duration-200 text-center py-1 px-2 border rounded-lg ${activeInd == 1 ? "bg-[#6C26D990]" : "hover:bg-[#6C26D950]"}`}>Overall</button>
            <button type="button" onClick={()=>setInd(2)} className={`uppercase font-semibold text-xs sm:text-sm cursor-pointer duration-200 text-center py-1 px-2 border rounded-lg ${activeInd == 2 ? "bg-[#e0313190]" : "hover:bg-[#e0313150]"}`}>{HACKER_TEAMS[1]}</button>
        </div>
        <div className="flex flex-col w-full gap-1 border rounded-xl p-1">
            {!activeTop ? 
                dummy.map((v, i)=>{
                    const t = getClassTeam(v)
                    return(
                    <div className={`flex flex-row justify-between border p-1.5 px-2 ${i==0 ? "rounded-t-lg font-semibold" : i==dummy.length-1 ? "rounded-b-lg" : ""}`}
                    style={{
                        backgroundColor: t.teamColor+`${i == 0 ? "30" : "30"}`,
                        borderColor: t.teamColor+'50'
                    }}>
                        <Loader className="my-auto size-5 animate-spin"/>
                        <Loader className="my-auto size-5 animate-spin"/>
                    </div>
                )})
                :
                <>
                {activeTop.map((v, i)=>{
                    const t = getClassTeam(v.class || "Alchemist")
                    return(
                    <div className={`flex flex-row justify-between border p-1 px-2 ${i==0 ? "rounded-t-lg font-semibold" : i==activeTop.length-1 && !showYours ? "rounded-b-lg" : ""}`}
                    style={{
                        backgroundColor: t.teamColor+`${i == 0 ? "30" : "30"}`,
                        borderColor: t.teamColor+'50'
                    }}>
                        <div className={`flex flex-row gap-1 ${v.id == hacker?.id ? "underline" : ""}`}>
                            {`${i + 1}. ${v.firstName} ${v.lastName}`}
                            <div className="rounded-lg bg-card/50 text-sm my-auto px-1 py-0.5 hidden" 
                            style={{
                                color: t.teamColor
                            }}>{v.class}</div>
                        </div>
                        <div className="text-sm my-auto">{`${v.points} pts.`}</div>
                    </div>
                )})}
                {
                showYours && (
                    <>
                        <div className="w-full flex flex-row justify-center p-1 px-2">
                            <Dot/>
                            <Dot/>
                            <Dot/>
                        </div>
                        <div className={`flex flex-row justify-between border border-dashed p-1 px-2 rounded-b-lg`}
                        style={{
                            backgroundColor: team.teamColor+`30`,
                            borderColor: team.teamColor+'50'
                        }}>
                            <div>{`${(data?.place[activeInd] ?? 0) + 1}. ${hacker?.firstName} ${hacker?.lastName}`}</div>
                            <div className="text-sm my-auto">{`${hacker?.points} pts.`}</div>
                        </div>
                    </>
                )
                }
                </>
            }
        </div>
    </>)
}