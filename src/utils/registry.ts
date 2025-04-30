import { baseMangrove } from "@mangrovedao/mgv/addresses";
import type { Address } from "viem";
import { base } from "viem/chains";

export const registry = {
  base: {
    mangrove: baseMangrove,
    seeder: "0x808bC04030bC558C99E6844e877bb22D166A089A" as Address,
    chain: base
  },
};


export const cashnesses = {
  PRL: 1,
  WETH: 300,
} as const;
