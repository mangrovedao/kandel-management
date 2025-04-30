import {
  kandelActions,
  type KandelSteps,
  type MangroveActionsDefaultParams,
  type MarketParams,
} from "@mangrovedao/mgv";
import type { Logger } from "pino";
import {
  ContractFunctionExecutionError,
  type Address,
  type Client,
} from "viem";
import { logger } from "../utils/logger";
import { checkClient } from "../utils/check-client";
import { giveMaxApprovalTo } from "./approval";
import type { PopulateFromOffsetParams } from "@mangrovedao/mgv/builder";
import { waitForTransactionReceipt, writeContract } from "viem/actions";

async function checkApprovals(
  client: Client,
  steps: KandelSteps,
  _logger: Logger = logger
): Promise<boolean> {
  const baseApproval = steps[1];
  const quoteApproval = steps[2];
  // first approval
  if (!baseApproval.done) {
    const success = await giveMaxApprovalTo(
      client,
      baseApproval.params.spender,
      baseApproval.params.token.address,
      _logger
    );
    if (!success) {
      _logger.error("Failed to approve base token");
      return false;
    }
  }
  if (!quoteApproval.done) {
    const success = await giveMaxApprovalTo(
      client,
      quoteApproval.params.spender,
      quoteApproval.params.token.address,
      _logger
    );
    if (!success) {
      _logger.error("Failed to approve quote token");
      return false;
    }
  }
  return true;
}

export async function populateKandel(
  client: Client,
  user: Address,
  kandel: Address,
  populateParams: PopulateFromOffsetParams,
  mangrove: MangroveActionsDefaultParams,
  market: MarketParams,
  value: bigint,
  _logger: Logger = logger
): Promise<boolean> {
  if (!checkClient(client)) {
    _logger.error("Client has no account");
    return false;
  }
  const kandelClient = client.extend(kandelActions(mangrove, market, kandel));
  try {
    if (populateParams.baseAmount || populateParams.quoteAmount) {
      const steps = await kandelClient.getKandelSteps({ user });
      const success = await checkApprovals(client, steps, _logger);
      if (!success) {
        return false;
      }
    }
    const { request } = await kandelClient.simulatePopulate({
      ...populateParams,
      value,
    });
    const tx = await writeContract(client, {
      ...request,
      account: client.account,
      chain: client.chain,
    });
    _logger.info(`Populating kandel in tx ${tx}, waiting for receipt...`);
    const receipt = await waitForTransactionReceipt(client, { hash: tx });
    if (receipt.status === "success") {
      _logger.info(`Populated kandel in tx ${tx}`);
      return true;
    } else {
      _logger.error(`Failed to populate kandel in tx ${tx}`);
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
