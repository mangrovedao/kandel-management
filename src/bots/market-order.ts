import { baseMangrove } from "@mangrovedao/mgv/addresses";
import {
  erc20Abi,
  http,
  isAddress,
  maxUint128,
  maxUint256,
  parseEther,
  publicActions,
  type Address,
  type Hex,
} from "viem";
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
  }).extend(publicActions);

  const kandel = process.env.KANDEL as Address;

  if (!isAddress(kandel, { strict: true })) throw new Error("not an address");

  const market = await getKandelMarket(client, kandel, baseMangrove);

  if (!market) throw new Error("market not found");

  const { asksMarket, bidsMarket } = getSemibooksOLKeys(market);

  const marketToConsume = asksMarket;

  const approval = await client.readContract({
    abi: erc20Abi,
    address: marketToConsume.inbound_tkn,
    functionName: "allowance",
    args: [client.account.address, baseMangrove.mgv],
  });

  if (approval < maxUint128) {
    const { request } = await client.simulateContract({
      abi: erc20Abi,
      address: marketToConsume.inbound_tkn,
      functionName: "approve",
      args: [baseMangrove.mgv, maxUint256],
    });
    console.log("Approving");
    const tx = await client.writeContract(request);
    const receipt = await waitForTransactionReceipt(client, { hash: tx });
    if (receipt.status !== "success") throw new Error("Approval failed");
    console.log("Approved");
  }

  const { request, takerGave, takerGot } = await simulateMarketOrderByTick(
    client,
    baseMangrove,
    {
      olKey: marketToConsume,
      maxTick: MAX_TICK,
      fillVolume: parseEther("0.01"),
      fillWants: true,
    }
  );

  const tx = await client.writeContract(request);
  console.log(tx);
  const receipt = await waitForTransactionReceipt(client, { hash: tx });
  console.log(receipt);
}
