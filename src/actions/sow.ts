import type { Logger } from "pino";
import {
  ContractFunctionExecutionError,
  type Address,
  type Client,
} from "viem";
import { logger } from "../utils/logger";
import { kandelSeederActions, type MarketParams } from "@mangrovedao/mgv";
import { waitForTransactionReceipt, writeContract } from "viem/actions";
import { checkClient } from "../utils/check-client";

export async function sow(
  client: Client,
  seeder: Address,
  market: MarketParams,
  _logger: Logger = logger
): Promise<Address | null> {
  if (!checkClient(client)) {
    _logger.error("Client has no account");
    return null;
  }
  const seederClient = client.extend(kandelSeederActions(market, seeder));
  try {
    const { request, result } = await seederClient.simulateSow({
      liquiditySharing: false,
    });
    _logger.info(`Deployment expected at address ${result}, broadcasting...`);
    const tx = await writeContract(seederClient, request as any);
    _logger.info(`Deployment transaction ${tx}, waiting for confirmation...`);
    const receipt = await waitForTransactionReceipt(seederClient, { hash: tx });
    if (receipt.status === "success") {
      _logger.info(`Deployment successful at address ${result}`);
      return result;
    } else {
      _logger.error(`Deployment failed at address ${result}`);
      return null;
    }
  } catch (error) {
    _logger.error("Error deploying Kandel");
    if (error instanceof ContractFunctionExecutionError) {
      _logger.error(error.cause.message);
    } else {
      _logger.error(error);
    }
    return null;
  }
}
