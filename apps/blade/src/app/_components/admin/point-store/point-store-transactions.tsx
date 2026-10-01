"use client";

import { useDeferredValue, useState } from "react";
import { ShoppingBag } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Switch } from "@forge/ui/switch";
import { Textarea } from "@forge/ui/textarea";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Item = RouterOutputs["pointStore"]["workspace"]["items"][number];
type Hacker = RouterOutputs["pointStore"]["searchHackers"][number];
type Receipt = RouterOutputs["pointStore"]["history"]["rows"][number];

export function PointStoreTransactions({
  hackathonId,
  items,
}: {
  hackathonId: string;
  items: Item[];
}) {
  const [offset, setOffset] = useState(0);
  const [voiding, setVoiding] = useState<Receipt | null>(null);
  const history = api.pointStore.history.useQuery({ hackathonId, offset });
  return (
    <div className="space-y-6">
      <Checkout
        hackathonId={hackathonId}
        items={items}
        onPurchased={() => setOffset(0)}
      />
      <Card>
        <CardHeader>
          <CardTitle>Transaction history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <p role="status">Loading transactions…</p>
          ) : history.isError ? (
            <div role="alert">
              <p>{history.error.message}</p>
              <Button onClick={() => void history.refetch()}>Retry</Button>
            </div>
          ) : (
            <>
              {!history.data.rows.length && (
                <p className="py-6 text-muted-foreground">
                  No transactions yet.
                </p>
              )}
              <ul className="divide-y divide-border">
                {history.data.rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-col justify-between gap-3 py-4 sm:flex-row"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="break-words font-medium">
                        {row.hackerName}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {row.quantity} × {row.itemName}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {row.unitPrice} pts each · {row.total} pts total
                      </p>
                      <p className="break-words text-xs text-muted-foreground">
                        {row.createdAt.toLocaleString()} · {row.actorName}
                      </p>
                      {row.voidedAt && (
                        <p className="break-words text-sm text-muted-foreground">
                          Voided by {row.voidedByName}: {row.voidReason}
                          {row.restocked ? " · Restocked" : " · Not restocked"}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                      {row.voidedAt ? (
                        <Badge variant="secondary">Voided</Badge>
                      ) : (
                        <Button
                          className="min-h-11"
                          variant="outline"
                          aria-label={`Void ${row.itemName} purchase for ${row.hackerName}`}
                          onClick={() => setVoiding(row)}
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-2 pt-4">
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={!offset}
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {offset / 50 + 1}
                </span>
                <Button
                  variant="outline"
                  className="min-h-11"
                  disabled={!history.data.hasMore}
                  onClick={() => setOffset(offset + 50)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      {voiding && (
        <VoidPurchase
          hackathonId={hackathonId}
          receipt={voiding}
          onClose={() => setVoiding(null)}
        />
      )}
    </div>
  );
}

function Checkout({
  hackathonId,
  items,
  onPurchased,
}: {
  hackathonId: string;
  items: Item[];
  onPurchased: () => void;
}) {
  const [search, setSearch] = useState("");
  const query = useDeferredValue(search);
  const [hacker, setHacker] = useState<Hacker | null>(null);
  const [checkout, setCheckout] = useState({
    id: crypto.randomUUID(),
    itemId: "",
    quantity: "1",
  });
  const hackers = api.pointStore.searchHackers.useQuery(
    { hackathonId, query },
    { enabled: query.trim().length > 0 },
  );
  const balance = api.pointStore.balance.useQuery(
    { hackathonId, attendeeId: hacker?.id ?? "" },
    { enabled: !!hacker },
  );
  const utils = api.useUtils();
  const purchase = api.pointStore.purchase.useMutation({
    onSuccess: async () => {
      setCheckout({ id: crypto.randomUUID(), itemId: "", quantity: "1" });
      await utils.pointStore.invalidate();
      toast.success("Purchase recorded. Earned points are unchanged.");
      onPurchased();
    },
    onError: async (error) => {
      toast.error(error.message);
      await utils.pointStore.invalidate();
    },
  });
  const item = items.find(
    (entry) => entry.id === checkout.itemId && !entry.archived,
  );
  const quantity = Number(checkout.quantity);
  const total = item ? item.price * quantity : 0;
  const validQuantity =
    Number.isInteger(quantity) && quantity >= 1 && quantity <= 1000;
  const available = balance.data?.available ?? 0;
  const insufficientStock =
    item && (item.soldOut || (item.stock !== null && item.stock < quantity));
  const canPurchase =
    hacker &&
    item &&
    validQuantity &&
    balance.isSuccess &&
    !balance.isFetching &&
    !insufficientStock &&
    total <= available;
  const options = hacker
    ? [
        hacker,
        ...(hackers.data ?? []).filter((entry) => entry.id !== hacker.id),
      ]
    : (hackers.data ?? []);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Record a purchase</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (canPurchase)
              purchase.mutate({
                hackathonId,
                attendeeId: hacker.id,
                id: checkout.id,
                itemId: item.id,
                quantity,
                unitPrice: item.price,
              });
          }}
        >
          <fieldset disabled={purchase.isPending} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="purchase-hacker">Hacker</Label>
              <ResponsiveComboBox
                triggerId="purchase-hacker"
                ariaLabel="Choose a checked-in hacker"
                triggerClassName="min-h-11 w-full"
                items={options}
                value={hacker?.id ?? null}
                filterItems={false}
                isDisabled={purchase.isPending}
                isLoading={hackers.isFetching}
                buttonPlaceholder="Find a checked-in hacker"
                inputPlaceholder="Search name or email"
                emptyMessage={
                  query
                    ? "No checked-in hackers found."
                    : "Type a name or email."
                }
                getItemValue={(entry) => entry.id}
                getItemLabel={(entry) => `${entry.firstName} ${entry.lastName}`}
                renderItem={(entry) => (
                  <span className="min-w-0 break-words">
                    {entry.firstName} {entry.lastName}
                    <span className="block text-xs text-muted-foreground">
                      {entry.email}
                    </span>
                  </span>
                )}
                onSearchValueChange={setSearch}
                onItemSelect={(selected) => {
                  setHacker(selected);
                  setCheckout({ ...checkout, id: crypto.randomUUID() });
                }}
              />
              {hackers.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {hackers.error.message}
                </p>
              )}
            </div>
            {hacker && (
              <div
                className="rounded-lg border border-border/60 bg-background/60 p-4"
                aria-live="polite"
              >
                {balance.isPending ? (
                  <p role="status">Loading points…</p>
                ) : balance.isError ? (
                  <p role="alert">{balance.error.message}</p>
                ) : (
                  <dl className="grid grid-cols-3 gap-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Earned points
                      </dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {balance.data.earned}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Spent</dt>
                      <dd className="mt-1 text-xl font-semibold">
                        {balance.data.spent}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        Spending power
                      </dt>
                      <dd className="mt-1 text-xl font-semibold text-primary">
                        {available}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="purchase-item">Item</Label>
                <ResponsiveComboBox
                  triggerId="purchase-item"
                  ariaLabel="Choose an item"
                  triggerClassName="min-h-11 w-full"
                  items={items.filter((entry) => !entry.archived)}
                  value={checkout.itemId}
                  isDisabled={purchase.isPending}
                  buttonPlaceholder="Choose an item"
                  inputPlaceholder="Search items"
                  getItemValue={(entry) => entry.id}
                  getItemLabel={(entry) => `${entry.name} · ${entry.price} pts`}
                  renderItem={(entry) => (
                    <span className="break-words">
                      {entry.name} · {entry.price} pts
                      <span className="block text-xs text-muted-foreground">
                        {entry.soldOut
                          ? "Sold out"
                          : entry.stock === null
                            ? "Available · untracked"
                            : `${entry.stock} in stock`}
                      </span>
                    </span>
                  )}
                  onItemSelect={(selected) =>
                    setCheckout({
                      ...checkout,
                      itemId: selected.id,
                      id: crypto.randomUUID(),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-quantity">Quantity</Label>
                <Input
                  className="min-h-11"
                  id="purchase-quantity"
                  type="number"
                  min={1}
                  max={1000}
                  step={1}
                  required
                  value={checkout.quantity}
                  onChange={(event) =>
                    setCheckout({
                      ...checkout,
                      quantity: event.target.value,
                      id: crypto.randomUUID(),
                    })
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
              <div aria-live="polite">
                <p className="font-semibold">
                  Total: {validQuantity ? total : 0} pts
                </p>
                {hacker && item && validQuantity && (
                  <p className="text-sm text-muted-foreground">
                    {Math.max(0, available - total)} spending power after
                    purchase
                  </p>
                )}
                {insufficientStock && (
                  <p className="text-sm text-destructive">Not enough stock.</p>
                )}
                {total > available && hacker && (
                  <p className="text-sm text-destructive">
                    Not enough spending power.
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="min-h-11"
                disabled={!canPurchase || purchase.isPending}
              >
                <ShoppingBag className="mr-2 size-4" />
                {purchase.isPending ? "Recording…" : "Record purchase"}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

function VoidPurchase({
  hackathonId,
  receipt,
  onClose,
}: {
  hackathonId: string;
  receipt: Receipt;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(false);
  const utils = api.useUtils();
  const mutation = api.pointStore.voidPurchase.useMutation({
    onSuccess: async () => {
      await utils.pointStore.invalidate();
      toast.success("Purchase voided. Spending power restored.");
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
          <DialogTitle>Void purchase</DialogTitle>
          <DialogDescription>
            Restore {receipt.total} points of spending power to{" "}
            {receipt.hackerName}. This purchase will remain in history.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate({ hackathonId, id: receipt.id, reason, restock });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="void-reason">Reason</Label>
            <Textarea
              id="void-reason"
              required
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {receipt.canRestock && (
            <label className="flex min-h-11 items-center justify-between gap-3">
              Return {receipt.quantity} to inventory
              <Switch checked={restock} onCheckedChange={setRestock} />
            </label>
          )}
          <Button
            type="submit"
            variant="destructive"
            className="min-h-11"
            disabled={!reason.trim() || mutation.isPending}
          >
            {mutation.isPending ? "Voiding…" : "Void purchase"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
