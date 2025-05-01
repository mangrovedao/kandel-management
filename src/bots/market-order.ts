import { baseMangrove } from "@mangrovedao/mgv/addresses";
import { http, isAddress, parseEther, type Address, type Hex } from "viem";
import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getKandelMarket } from "../read/kandel-market";
import { base } from "viem/chains";
import { simulateMarketOrderByTick } from "@mangrovedao/mgv/actions";
import { getSemibooksOLKeys, MAX_TICK } from "@mangrovedao/mgv/lib";
import { waitForTransactionReceipt } from "viem/actions";

export async function marketOrder() {
  const client = createWalletClient({
    account: privateKeyToAccount(process.env.PRIVATE_KEY as Hex),
    transport: http(process.env.RPC_URL),
    chain: base,
  });

  const kandel = process.env.KANDEL as Address;

  if (!isAddress(kandel, { strict: true })) throw new Error("not an address");

  const market = await getKandelMarket(client, kandel, baseMangrove);

  if (!market) throw new Error("market not found");

  const { asksMarket, bidsMarket } = getSemibooksOLKeys(market);

  const test = await simulateMarketOrderByTick(client, baseMangrove, {
    olKey: asksMarket,
    maxTick: MAX_TICK,
    fillVolume: parseEther("0.01"),
    fillWants: true,
  });

  const tx = await client.writeContract(test.request);
  console.log(tx);
  const receipt = await waitForTransactionReceipt(client, { hash: tx });
  console.log(receipt);
}
