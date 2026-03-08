"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { CreditCard, Crown, Heart, Info, Trophy } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";

import { DASHBOARD_ICON_SIZE } from "~/consts";

interface DonationOption {
  icon: LucideIcon;
  name: string;
  priceLabel: string;
  href: string;
  description: string;
}

const DONATION_OPTIONS: DonationOption[] = [
  {
    icon: Heart,
    name: "Supporter Alumni",
    priceLabel: "$20",
    href: "https://buy.stripe.com/6oU28q3Hm8Rm2rd5aOcfK0d",
    description:
      "Priority for panels & mentorships. Personalized thank you email from the board. Name listed on Alumni Supporters page.",
  },
  {
    icon: Trophy,
    name: "Contributor Alumni",
    priceLabel: "$30",
    href: "https://buy.stripe.com/bJe14m3Hmd7CfdZbzccfK0e",
    description: "All Supporter benefits. KH9 swag box included.",
  },
  {
    icon: Crown,
    name: "Partner Alumni",
    priceLabel: "$50",
    href: "https://buy.stripe.com/7sYcN4dhW6Jegi35aOcfK0f",
    description:
      "All previous benefits. Listed on KH Foundation materials. Personalized note in KH9 swag box. Reserved KH9 mentor invitation.",
  },
  {
    icon: CreditCard,
    name: "Custom Amount",
    priceLabel: "Any",
    href: "https://buy.stripe.com/8x228qa5K1oUe9VdHkcfK0c",
    description: "Choose your own donation amount to support Knight Hacks.",
  },
];

function DonationDetailsModal({ options }: { options: DonationOption[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mt-4 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Info size={14} />
          More details
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-center">
            Alumni Donation Tiers
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <div
                key={o.name}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center"
              >
                <Icon size={18} className="text-[hsl(263.4_70%_50.4%)]" />

                <div>
                  <p className="text-sm font-medium">{o.name}</p>
                  <p className="text-sm font-semibold text-[hsl(263.4_70%_50.4%)]">
                    {o.priceLabel}
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">{o.description}</p>

                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href={o.href} target="_blank" rel="noopener noreferrer">
                    Donate
                  </Link>
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function Donate() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-sm font-medium">
          Donate
        </CardTitle>
      </CardHeader>

      <CardContent>
        <p className="mb-4 text-center text-[12px] text-muted-foreground">
          Support the next generation of hackers at UCF
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DONATION_OPTIONS.map((opt) => {
            const Icon = opt.icon;

            return (
              <Button
                key={opt.name}
                asChild
                variant="outline"
                className="flex min-h-[88px] w-full flex-col items-center justify-center text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <Link
                  href={opt.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full min-w-0 flex-col items-center justify-center text-center"
                >
                  <Icon
                    size={DASHBOARD_ICON_SIZE}
                    className="mb-2 text-[hsl(263.4_70%_50.4%)]"
                  />

                  <span className="w-full whitespace-normal break-words text-center text-xs font-semibold leading-snug">
                    {opt.name}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="flex justify-center">
          <DonationDetailsModal options={DONATION_OPTIONS} />
        </div>
      </CardContent>
    </Card>
  );
}
