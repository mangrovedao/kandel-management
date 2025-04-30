import {
  kandelActions,
  type MangroveActionsDefaultParams,
  type MarketParams,
} from "@mangrovedao/mgv";
import {
  ContractFunctionExecutionError,
  maxUint256,
  type Address,
  type Client,
} from "viem";
import { logger } from "../utils/logger";
import type { Logger } from "pino";
import { checkClient } from "../utils/check-client";
import { readContract, writeContract } from "viem/actions";
import { waitForTransactionReceipt } from "viem/actions";
import { kandelParamsParams } from "@mangrovedao/mgv/builder";

export type RetractParams = {
  withdrawFunds?: boolean;
  withdrawProvision?: boolean;
};

export async function retractKandel(
  client: Client,
  mangrove: MangroveActionsDefaultParams,
  market: MarketParams,
  kandel: Address,
  user: Address,
  retractParams: RetractParams,
  _logger: Logger = logger
) {
  if (!checkClient(client)) {
    _logger.error("Client has no account");
    return false;
  }
  const { withdrawFunds = true, withdrawProvision = true } = retractParams;

  const kandelClient = client.extend(kandelActions(mangrove, market, kandel));

  try {
    _logger.info("Getting kandel params for retracting...");
    const params = await readContract(client, {
      ...kandelParamsParams,
      address: kandel,
    });

    const { request } = await kandelClient.simulateRetract({
      toIndex: BigInt(params.pricePoints),
      recipient: user,
      baseAmount: withdrawFunds ? maxUint256 : 0n,
      quoteAmount: withdrawFunds ? maxUint256 : 0n,
      freeWei: withdrawProvision ? maxUint256 : 0n,
    });
    const tx = await writeContract(client, {
      ...request,
      account: client.account,
      chain: client.chain,
    });
    _logger.info(`Retracting kandel in tx ${tx}, waiting for receipt...`);
    const receipt = await waitForTransactionReceipt(client, { hash: tx });
    if (receipt.status === "success") {
      _logger.info(`Retracted kandel in tx ${tx}`);
      return true;
    } else {
      _logger.error(`Failed to retract kandel in tx ${tx}`);
      return false;
    }
  } catch (error) {
    if (error instanceof ContractFunctionExecutionError) {
      _logger.error(error.message);
    } else {
      _logger.error(error);
    }
    return false;
  }
}
