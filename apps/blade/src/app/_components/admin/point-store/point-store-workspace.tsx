"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MapPin, Package, Plus, Settings, ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";
import { toast } from "@forge/ui/toast";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { api } from "~/trpc/react";
import { PointStoreItemDialog } from "./point-store-item-dialog";
import { PointStoreTransactions } from "./point-store-transactions";

type Workspace = RouterOutputs["pointStore"]["workspace"];

export function PointStoreWorkspace({
  hackathons,
  hackathonId,
}: {
  hackathons: RouterOutputs["pointStore"]["hackathons"];
  hackathonId?: string;
}) {
  const router = useRouter();
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        title="Point Store"
        eyebrow="Hacks"
        icon={ShoppingBag}
        description="Trade points for merch. Purchases use spending power and leave earned points intact."
      />
      <div className="max-w-sm">
        <Label htmlFor="store-hackathon">Hackathon</Label>
        <Select
          value={hackathonId ?? ""}
          onValueChange={(id) =>
            router.push(`/admin/point-store?hackathonId=${id}`)
          }
        >
          <SelectTrigger id="store-hackathon" className="mt-2 min-h-11">
            <SelectValue placeholder="Select a hackathon" />
          </SelectTrigger>
          <SelectContent>
            {hackathons.map((hack) => (
              <SelectItem key={hack.id} value={hack.id}>
                {hack.name || "Untitled hackathon"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hackathonId ? (
        <StoreContent hackathonId={hackathonId} />
      ) : (
        <p className="text-muted-foreground">
          Create a hackathon before adding store items.
        </p>
      )}
    </main>
  );
}

function StoreContent({ hackathonId }: { hackathonId: string }) {
  const workspace = api.pointStore.workspace.useQuery({ hackathonId });
  const [editing, setEditing] = useState<
    Workspace["items"][number] | "new" | null
  >(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  if (workspace.isPending) return <p role="status">Loading store…</p>;
  if (workspace.isError)
    return (
      <div role="alert">
        <p>{workspace.error.message}</p>
        <Button onClick={() => void workspace.refetch()}>Retry</Button>
      </div>
    );
  const { items, settings } = workspace.data;
  return (
    <>
      <Card className="py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Badge variant={settings.open ? "default" : "secondary"}>
              {settings.open ? "Store open" : "Store closed"}
            </Badge>
            <Badge variant="outline">
              {settings.catalogVisible ? "Catalog visible" : "Catalog hidden"}
            </Badge>
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="size-4 shrink-0" />
              <span className="break-words">
                {settings.location || "Pickup location not set"}
              </span>
            </span>
          </div>
          <Button
            className="min-h-11"
            variant="outline"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="mr-2 size-4" />
            Store settings
          </Button>
        </CardContent>
      </Card>
      <Tabs defaultValue="items">
        <TabsList className="h-auto min-h-11">
          <TabsTrigger className="min-h-11" value="items">
            Items
          </TabsTrigger>
          <TabsTrigger className="min-h-11" value="transactions">
            Transactions
          </TabsTrigger>
        </TabsList>
        <TabsContent value="items" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Switch
                checked={showArchived}
                onCheckedChange={setShowArchived}
              />
              Show archived
            </label>
            <Button className="min-h-11" onClick={() => setEditing("new")}>
              <Plus className="mr-2 size-4" />
              Add item
            </Button>
          </div>
          {items.filter((item) => showArchived || !item.archived).length ===
          0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Add your first item to start building the catalog.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items
                .filter((item) => showArchived || !item.archived)
                .map((item) => (
                  <Card key={item.id} className="py-0">
                    <CardContent className="flex h-full flex-col gap-4 p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background/60">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              unoptimized
                              className="object-contain p-1"
                            />
                          ) : (
                            <Package
                              aria-hidden="true"
                              className="size-6 text-muted-foreground/50"
                            />
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <h2 className="break-words font-semibold">
                            {item.name}
                          </h2>
                          <p className="text-xl font-semibold tabular-nums text-primary">
                            {item.price}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              pts
                            </span>
                          </p>
                        </div>
                      </div>
                      {item.description && (
                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant={
                            item.archived || item.soldOut || item.stock === 0
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {item.archived
                            ? "Archived"
                            : item.soldOut || item.stock === 0
                              ? "Sold out"
                              : item.stock === null
                                ? "Available · untracked"
                                : `${item.stock} in stock`}
                        </Badge>
                        <Button
                          variant="outline"
                          className="min-h-11"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => setEditing(item)}
                        >
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="transactions" className="pt-4">
          <PointStoreTransactions hackathonId={hackathonId} items={items} />
        </TabsContent>
      </Tabs>
      {editing && (
        <PointStoreItemDialog
          hackathonId={hackathonId}
          item={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {settingsOpen && (
        <StoreSettings
          hackathonId={hackathonId}
          settings={settings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </>
  );
}

function StoreSettings({
  hackathonId,
  settings,
  onClose,
}: {
  hackathonId: string;
  settings: Workspace["settings"];
  onClose: () => void;
}) {
  const [value, setValue] = useState(settings);
  const utils = api.useUtils();
  const mutation = api.pointStore.saveSettings.useMutation({
    onSuccess: async () => {
      await utils.pointStore.workspace.invalidate({ hackathonId });
      toast.success("Store settings saved.");
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Store settings</DialogTitle>
          <DialogDescription>
            Choose what hackers can see and where they should pick up merch.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ hackathonId, ...value });
          }}
        >
          <label className="flex min-h-11 items-center justify-between gap-3">
            Reveal catalog
            <Switch
              checked={value.catalogVisible}
              onCheckedChange={(catalogVisible) =>
                setValue({ ...value, catalogVisible })
              }
            />
          </label>
          <label className="flex min-h-11 items-center justify-between gap-3">
            Store open
            <Switch
              checked={value.open}
              onCheckedChange={(open) => setValue({ ...value, open })}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            Closed tells hackers to wait before coming over. Organizers can
            still record purchases.
          </p>
          <div className="space-y-2">
            <Label htmlFor="pickup-location">Pickup location</Label>
            <Input
              id="pickup-location"
              maxLength={240}
              value={value.location}
              onChange={(event) =>
                setValue({ ...value, location: event.target.value })
              }
              placeholder="Student Union, room 221"
            />
          </div>
          <Button
            type="submit"
            className="min-h-11"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Saving…" : "Save settings"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
