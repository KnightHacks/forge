"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";

export default function DuesPercent({numMembers, numDuesPaying} : {numMembers: number, numDuesPaying: number}) {
    const percentDuesPaying = numDuesPaying / numMembers * 100;

    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle className="text-xl">Dues</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-row gap-4">
                    <p>
                        <span className="text-xl text-green-600 font-bold">{percentDuesPaying}% </span>
                        <span className="text-muted-foreground">paid dues.</span>
                    </p>
                    <p>
                        <span className="text-xl text-red-600 font-bold">{100-percentDuesPaying}% </span>
                        <span className="text-muted-foreground">haven't paid dues.</span>
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}