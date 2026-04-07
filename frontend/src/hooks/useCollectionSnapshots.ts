import { useState } from "react";
import type {
  CollectionItemSnapshot,
  CollectionSnapshot,
  ConnectedAccount,
} from "../lib/types";

export function useCollectionSnapshots(accounts: ConnectedAccount[]) {
  const [sourceSnapshot, setSourceSnapshot] =
    useState<CollectionSnapshot | null>(null);
  const [sourceItems, setSourceItems] = useState<CollectionItemSnapshot[]>([]);
  const [destinationSnapshot, setDestinationSnapshot] =
    useState<CollectionSnapshot | null>(null);
  const [destinationItems, setDestinationItems] = useState<
    CollectionItemSnapshot[]
  >([]);

  const sourceAccount = accounts.find((a) => a.role === "source");
  const destinationAccount = accounts.find((a) => a.role === "destination");

  return {
    sourceSnapshot,
    setSourceSnapshot,
    sourceItems,
    setSourceItems,
    destinationSnapshot,
    setDestinationSnapshot,
    destinationItems,
    setDestinationItems,
    sourceAccount,
    destinationAccount,
  };
}
