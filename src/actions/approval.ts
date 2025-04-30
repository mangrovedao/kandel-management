import {
  ContractFunctionExecutionError,
  erc20Abi,
  maxUint256,
  type Address,
  type Client,
} from "viem";
import { logger } from "../utils/logger";
import type { Logger } from "pino";
import { checkClient } from "../utils/check-client";
import {
  simulateContract,
  waitForTransactionReceipt,
  writeContract,
} from "viem/actions";

export async function giveMaxApprovalTo(
  client: Client,
  spender: Address,
  token: Address,
  _logger: Logger = logger
): Promise<boolean> {
  if (!checkClient(client)) {
    _logger.error("Client has no account");
    return false;
  }
  _logger.info(`Giving max approval to ${spender} for ${token}`);
  try {
    const { request } = await simulateContract(client, {
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, maxUint256],
      address: token,
      chain: client.chain,
      account: client.account,
    });
    const tx = await writeContract(client, request);
    _logger.info(`Approval transaction ${tx}, waiting for confirmation...`);
    const receipt = await waitForTransactionReceipt(client, { hash: tx });
    if (receipt.status === "success") {
      _logger.info(`Approval successful`);
      return true;
    } else {
      _logger.error(`Approval failed`);
      return false;
    }
  } catch (error) {
    _logger.error(`Error giving max approval to ${spender} for ${token}`);
    if (error instanceof ContractFunctionExecutionError) {
      _logger.error(error.cause.message);
    } else {
      _logger.error(error);
    }
    return false;
  }
}
