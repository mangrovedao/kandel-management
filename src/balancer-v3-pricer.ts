import {
  type PublicClient,
  type Address,
  type Hex,
  parseAbiItem,
  formatUnits,
  parseUnits,
} from "viem";

// Configuration Constants
const BALANCER_ROUTER_ADDRESS_BASE: Address =
  "0x3f170631ed9821Ca51A59D996aB095162438DC10"; // <-- NEW ROUTER ADDRESS
// const BALANCER_VAULT_ADDRESS_BASE: Address =
//   "0xbA1333333333a1BA1108E8412f11850A5C319bA9"; // Vault address no longer primary for queries

const WETH_ADDRESS_BASE: Address = "0x4200000000000000000000000000000000000006";
const PRL_ADDRESS_BASE: Address = "0xfD28f108e95f4D41daAE9dbfFf707D677985998E";

export const WETH_PRL_POOL_ADDRESS: Address = // This is the Pool Contract address, needed for Router calls
  "0x19e3e19945e7fd2a7856824c595981c7fe450bb5";

// WETH_PRL_POOL_ID might not be directly used if all interactions are via Router with pool address
// export const WETH_PRL_POOL_ID: Hex =
//   "0x19e3e19945e7fd2a7856824c595981c7fe450bb5000000000000000000000000";

// ABIs

// ABI for the Balancer Router (provided by user)
const balancerRouterAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "vault",
        type: "address",
        internalType: "contract IVault",
      },
      {
        name: "weth",
        type: "address",
        internalType: "contract IWETH",
      },
      {
        name: "permit2",
        type: "address",
        internalType: "contract IPermit2",
      },
    ],
    stateMutability: "nonpayable",
  },
  { type: "receive", stateMutability: "payable" },
  {
    type: "function",
    name: "addLiquidityCustom",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "minBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "addLiquidityHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.AddLiquidityHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "maxAmountsIn",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "minBptAmountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum AddLiquidityKind",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "addLiquidityProportional",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "exactBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "addLiquiditySingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "maxAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "exactBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "amountIn", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "addLiquidityUnbalanced",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "minBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokens",
        type: "address[]",
        internalType: "contract IERC20[]",
      },
      {
        name: "exactAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "minBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "initializeHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.InitializeHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "tokens",
            type: "address[]",
            internalType: "contract IERC20[]",
          },
          {
            name: "exactAmountsIn",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "minBptAmountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "multicall",
    inputs: [{ name: "data", type: "bytes[]", internalType: "bytes[]" }],
    outputs: [{ name: "results", type: "bytes[]", internalType: "bytes[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "permitBatchAndCall",
    inputs: [
      {
        name: "permitBatch",
        type: "tuple[]",
        internalType: "struct IRouter.PermitApproval[]",
        components: [
          {
            name: "token",
            type: "address",
            internalType: "address",
          },
          {
            name: "owner",
            type: "address",
            internalType: "address",
          },
          {
            name: "spender",
            type: "address",
            internalType: "address",
          },
          {
            name: "amount",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "permitSignatures",
        type: "bytes[]",
        internalType: "bytes[]",
      },
      {
        name: "permit2Batch",
        type: "tuple",
        internalType: "struct IAllowanceTransfer.PermitBatch",
        components: [
          {
            name: "details",
            type: "tuple[]",
            internalType: "struct IAllowanceTransfer.PermitDetails[]",
            components: [
              {
                name: "token",
                type: "address",
                internalType: "address",
              },
              {
                name: "amount",
                type: "uint160",
                internalType: "uint160",
              },
              {
                name: "expiration",
                type: "uint48",
                internalType: "uint48",
              },
              {
                name: "nonce",
                type: "uint48",
                internalType: "uint48",
              },
            ],
          },
          {
            name: "spender",
            type: "address",
            internalType: "address",
          },
          {
            name: "sigDeadline",
            type: "uint256",
            internalType: "uint256",
          },
        ],
      },
      {
        name: "permit2Signature",
        type: "bytes",
        internalType: "bytes",
      },
      {
        name: "multicallData",
        type: "bytes[]",
        internalType: "bytes[]",
      },
    ],
    outputs: [{ name: "results", type: "bytes[]", internalType: "bytes[]" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryAddLiquidityCustom",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "minBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryAddLiquidityHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.AddLiquidityHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "maxAmountsIn",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "minBptAmountOut",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum AddLiquidityKind",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "queryAddLiquidityProportional",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      {
        name: "exactBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryAddLiquiditySingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactBptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "amountIn", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryAddLiquidityUnbalanced",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactAmountsIn",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquidityCustom",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minAmountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquidityHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.RemoveLiquidityHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "minAmountsOut",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "maxBptAmountIn",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum RemoveLiquidityKind",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquidityProportional",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquidityRecovery",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquidityRecoveryHook",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      { name: "sender", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquiditySingleTokenExactIn",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "queryRemoveLiquiditySingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "querySwapHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.SwapSingleTokenHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum SwapKind",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "tokenIn",
            type: "address",
            internalType: "contract IERC20",
          },
          {
            name: "tokenOut",
            type: "address",
            internalType: "contract IERC20",
          },
          {
            name: "amountGiven",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "limit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "querySwapSingleTokenExactIn",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "sender", type: "address", internalType: "address" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountCalculated",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "querySwapSingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountCalculated",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquidityCustom",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minAmountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquidityHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.RemoveLiquidityHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "minAmountsOut",
            type: "uint256[]",
            internalType: "uint256[]",
          },
          {
            name: "maxBptAmountIn",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum RemoveLiquidityKind",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "returnData", type: "bytes", internalType: "bytes" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquidityProportional",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minAmountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "removeLiquidityRecovery",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquidityRecoveryHook",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      { name: "sender", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    outputs: [
      {
        name: "amountsOut",
        type: "uint256[]",
        internalType: "uint256[]",
      },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquiditySingleTokenExactIn",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "exactBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "minAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "amountOut",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "removeLiquiditySingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "maxBptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [
      {
        name: "bptAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
    ],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "swapSingleTokenExactIn",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "minAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "swapSingleTokenExactOut",
    inputs: [
      { name: "pool", type: "address", internalType: "address" },
      {
        name: "tokenIn",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "tokenOut",
        type: "address",
        internalType: "contract IERC20",
      },
      {
        name: "exactAmountOut",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "maxAmountIn",
        type: "uint256",
        internalType: "uint256",
      },
      {
        name: "deadline",
        type: "uint256",
        internalType: "uint256",
      },
      { name: "wethIsEth", type: "bool", internalType: "bool" },
      { name: "userData", type: "bytes", internalType: "bytes" },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "swapSingleTokenHook",
    inputs: [
      {
        name: "params",
        type: "tuple",
        internalType: "struct IRouter.SwapSingleTokenHookParams",
        components: [
          {
            name: "sender",
            type: "address",
            internalType: "address",
          },
          {
            name: "kind",
            type: "uint8",
            internalType: "enum SwapKind",
          },
          {
            name: "pool",
            type: "address",
            internalType: "address",
          },
          {
            name: "tokenIn",
            type: "address",
            internalType: "contract IERC20",
          },
          {
            name: "tokenOut",
            type: "address",
            internalType: "contract IERC20",
          },
          {
            name: "amountGiven",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "limit",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
            internalType: "uint256",
          },
          {
            name: "wethIsEth",
            type: "bool",
            internalType: "bool",
          },
          {
            name: "userData",
            type: "bytes",
            internalType: "bytes",
          },
        ],
      },
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable",
  },
  {
    type: "error",
    name: "AddressEmptyCode",
    inputs: [{ name: "target", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "AddressInsufficientBalance",
    inputs: [{ name: "account", type: "address", internalType: "address" }],
  },
  { type: "error", name: "EthTransfer", inputs: [] },
  {
    type: "error",
    name: "ExitBelowMin",
    inputs: [
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "limit", type: "uint256", internalType: "uint256" },
    ],
  },
  { type: "error", name: "FailedInnerCall", inputs: [] },
  { type: "error", name: "InsufficientEth", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address", internalType: "address" }],
  },
  {
    type: "error",
    name: "SenderIsNotVault",
    inputs: [{ name: "sender", type: "address", internalType: "address" }],
  },
  { type: "error", name: "SwapDeadline", inputs: [] },
] as const; // <-- Add 'as const' for better type inference by Viem

// Default FundManagement is not directly used by Router query functions, but good to have.
// const defaultFundManagement = {
//   sender: "0x0000000000000000000000000000000000000000" as Address,
//   fromInternalBalance: false,
//   recipient: "0x0000000000000000000000000000000000000000" as Address,
//   toInternalBalance: false,
// };

// Helper to format prices consistently
function formatPriceDisplay(price: number, decimals: number = 10): string {
  const intermediatePrecision = Math.max(decimals, 18);
  let priceString = price.toFixed(intermediatePrecision);
  const displayNumber = parseFloat(priceString);
  priceString = displayNumber.toFixed(decimals);
  if (priceString.includes(".")) {
    priceString = priceString.replace(/0+$/, "");
    priceString = priceString.replace(/\.$/, "");
  }
  return priceString;
}

/**
 * Queries the Balancer Router to simulate a swap and get the output amount.
 */
async function querySwapViaRouter(
  client: PublicClient,
  poolAddress: Address, // The actual WETH_PRL_POOL_ADDRESS
  tokenInAddress: Address,
  tokenOutAddress: Address,
  exactAmountInSmallestUnits: bigint,
  _tokenInSym = "IN",
  _tokenOutSym = "OUT"
): Promise<bigint | null> {
  if (exactAmountInSmallestUnits === 0n) return 0n;

  const zeroAddress: Address = "0x0000000000000000000000000000000000000000";

  try {
    // Note: The Router's querySwapSingleTokenExactIn function in the provided ABI
    // is marked as 'nonpayable'. However, query functions are typically 'view'.
    // Viem's readContract should handle this if the node allows static calls to non-view functions.
    // If this fails due to state mutability, the ABI might be slightly off for a pure query version,
    // or this specific router requires a different approach for "dry runs".
    const amountCalculated = await client.readContract({
      address: BALANCER_ROUTER_ADDRESS_BASE,
      abi: balancerRouterAbi,
      functionName: "querySwapSingleTokenExactIn",
      args: [
        poolAddress,
        tokenInAddress,
        tokenOutAddress,
        exactAmountInSmallestUnits,
        zeroAddress,
        "0x", // userData, typically 0x for simple swaps via Router
      ],
    });
    return amountCalculated as bigint;
  } catch (error) {
    console.error(
      `Error in querySwapViaRouter for pool ${poolAddress} (${_tokenInSym} -> ${_tokenOutSym}):`,
      error
    );
    return null;
  }
}

export interface BalancerPriceInfo {
  balancerMarginalPrice_QuotePerBase?: string;
  balancerBidPrice_BaseToken_QuotePerBase?: string;
  balancerAskPrice_BaseToken_QuotePerBase?: string;
  error?: string;
  priceMethod?: "RouterQuerySwap";
}

export async function getBalancerPriceData(
  client: PublicClient,
  kandelMarket: {
    base: { address: Address; decimals: number; symbol: string };
    quote: { address: Address; decimals: number; symbol: string };
  },
  kandelBestAskGivesBaseQtySmallestUnits?: bigint,
  kandelBestBidGivesQuoteQtySmallestUnits?: bigint
): Promise<BalancerPriceInfo> {
  try {
    const isKandelBaseWETH =
      kandelMarket.base.address.toLowerCase() ===
      WETH_ADDRESS_BASE.toLowerCase();
    const isKandelQuotePRL =
      kandelMarket.quote.address.toLowerCase() ===
      PRL_ADDRESS_BASE.toLowerCase();
    const isKandelBasePRL =
      kandelMarket.base.address.toLowerCase() ===
      PRL_ADDRESS_BASE.toLowerCase();
    const isKandelQuoteWETH =
      kandelMarket.quote.address.toLowerCase() ===
      WETH_ADDRESS_BASE.toLowerCase();

    if (
      !(
        (isKandelBaseWETH && isKandelQuotePRL) ||
        (isKandelBasePRL && isKandelQuoteWETH)
      )
    ) {
      return {
        error: `Kandel market tokens (${kandelMarket.base.symbol}, ${kandelMarket.quote.symbol}) do not match configured WETH/PRL Balancer pair. WETH: ${WETH_ADDRESS_BASE}, PRL: ${PRL_ADDRESS_BASE}`,
      };
    }

    const results: BalancerPriceInfo = {};
    const displayPriceDecimals = 10;

    // 1. Marginal Price on Balancer (Quote/Base) using Router
    console.log(
      "Attempting to get marginal price via Router's querySwapSingleTokenExactIn."
    );
    const smallUnitAmountForMarginalPrice = parseUnits(
      "0.000001",
      kandelMarket.base.decimals
    );

    const amountQuoteOutForMarginal = await querySwapViaRouter(
      client,
      WETH_PRL_POOL_ADDRESS, // Pass the specific pool address
      kandelMarket.base.address, // Token In is Kandel's Base
      kandelMarket.quote.address, // Token Out is Kandel's Quote
      smallUnitAmountForMarginalPrice,
      kandelMarket.base.symbol,
      kandelMarket.quote.symbol
    );

    if (amountQuoteOutForMarginal !== null && amountQuoteOutForMarginal > 0n) {
      const amountQuoteHuman = parseFloat(
        formatUnits(amountQuoteOutForMarginal, kandelMarket.quote.decimals)
      );
      const amountBaseHuman = parseFloat(
        formatUnits(smallUnitAmountForMarginalPrice, kandelMarket.base.decimals)
      );
      if (amountBaseHuman > 0) {
        const marginalPriceNum = amountQuoteHuman / amountBaseHuman;
        results.balancerMarginalPrice_QuotePerBase = formatPriceDisplay(
          marginalPriceNum,
          displayPriceDecimals
        );
        results.priceMethod = "RouterQuerySwap";
      } else {
        console.warn(
          "Amount base human was zero in marginal price calculation via Router."
        );
      }
    } else {
      console.warn(
        "Router querySwap for marginal price returned null or zero."
      );
    }

    // 2. Balancer Execution Price for Kandel's BEST ASK
    if (
      kandelBestAskGivesBaseQtySmallestUnits &&
      kandelBestAskGivesBaseQtySmallestUnits > 0n
    ) {
      console.log(
        "Attempting to find Balancer's BID price for Kandel's base token (simulating Kandel's Ask)."
      );
      const quoteOutFromAskSwapSmallestUnits = await querySwapViaRouter(
        client,
        WETH_PRL_POOL_ADDRESS,
        kandelMarket.base.address, // Kandel sells Base
        kandelMarket.quote.address, // Kandel wants Quote
        kandelBestAskGivesBaseQtySmallestUnits,
        kandelMarket.base.symbol,
        kandelMarket.quote.symbol
      );

      if (
        quoteOutFromAskSwapSmallestUnits !== null &&
        quoteOutFromAskSwapSmallestUnits > 0n
      ) {
        const baseInNum = parseFloat(
          formatUnits(
            kandelBestAskGivesBaseQtySmallestUnits,
            kandelMarket.base.decimals
          )
        );
        const quoteOutNum = parseFloat(
          formatUnits(
            quoteOutFromAskSwapSmallestUnits,
            kandelMarket.quote.decimals
          )
        );
        if (baseInNum > 0) {
          results.balancerBidPrice_BaseToken_QuotePerBase = formatPriceDisplay(
            quoteOutNum / baseInNum,
            displayPriceDecimals
          );
        }
      } else {
        console.warn(
          "Router querySwap for Balancer's Bid (simulating Kandel Ask) returned null or zero."
        );
      }
    }

    // 3. Balancer Execution Price for Kandel's BEST BID
    if (
      kandelBestBidGivesQuoteQtySmallestUnits &&
      kandelBestBidGivesQuoteQtySmallestUnits > 0n
    ) {
      console.log(
        "Attempting to find Balancer's ASK price for Kandel's base token (simulating Kandel's Bid)."
      );
      // For Kandel Bid: Kandel sells Quote (tokenIn for Balancer swap), gets Base (tokenOut for Balancer swap)
      const baseOutFromBidSwapSmallestUnits = await querySwapViaRouter(
        client,
        WETH_PRL_POOL_ADDRESS,
        kandelMarket.quote.address, // Kandel sells Quote
        kandelMarket.base.address, // Kandel wants Base
        kandelBestBidGivesQuoteQtySmallestUnits,
        kandelMarket.quote.symbol,
        kandelMarket.base.symbol
      );

      if (
        baseOutFromBidSwapSmallestUnits !== null &&
        baseOutFromBidSwapSmallestUnits > 0n
      ) {
        const quoteInNum = parseFloat(
          formatUnits(
            kandelBestBidGivesQuoteQtySmallestUnits,
            kandelMarket.quote.decimals
          )
        );
        const baseOutNum = parseFloat(
          formatUnits(
            baseOutFromBidSwapSmallestUnits,
            kandelMarket.base.decimals
          )
        );
        if (baseOutNum > 0) {
          results.balancerAskPrice_BaseToken_QuotePerBase = formatPriceDisplay(
            quoteInNum / baseOutNum,
            displayPriceDecimals
          );
        }
      } else {
        console.warn(
          "Router querySwap for Balancer's Ask (simulating Kandel Bid) returned null or zero."
        );
      }
    }
    return results;
  } catch (error) {
    console.error("getBalancerPriceData failed with Router approach:", error);
    return {
      error: `Failed to fetch Balancer price data via Router: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    };
  }
}

// --- Example Usage ---
// (Make sure to replace "YOUR_BASE_RPC_URL" with an actual Base RPC endpoint)
//
// async function main() {
//   const { createPublicClient, http } = await import('viem');
//   const { base } = await import('viem/chains');
//
//   const client = createPublicClient({
//     chain: base,
//     transport: http("YOUR_BASE_RPC_URL"),
//   });
//
//   const kandelMarketPRLBase = { // Kandel sells PRL (base) for WETH (quote)
//     base: { address: PRL_ADDRESS_BASE, decimals: 18, symbol: "PRL" }, // Assuming PRL is 18 decimals
//     quote: { address: WETH_ADDRESS_BASE, decimals: 18, symbol: "WETH" },
//   };
//
//   // Example: Kandel's best ask is to sell 100 PRL
//   const kandelAskAmountPRL = parseUnits("100", kandelMarketPRLBase.base.decimals);
//   // Example: Kandel's best bid is to sell 0.1 WETH (to buy PRL)
//   const kandelBidAmountWETH = parseUnits("0.1", kandelMarketPRLBase.quote.decimals);
//
//   console.log(`Fetching Balancer price data for Kandel market: ${kandelMarketPRLBase.base.symbol}/${kandelMarketPRLBase.quote.symbol}`);
//   const priceInfo = await getBalancerPriceData(
//     client,
//     kandelMarketPRLBase,
//     kandelAskAmountPRL,
//     kandelBidAmountWETH
//   );
//
//   console.log("Balancer Price Info (PRL/WETH):", JSON.stringify(priceInfo, null, 2));
//
//   // --- Test with WETH as base ---
//   const kandelMarketWETHBase = { // Kandel sells WETH (base) for PRL (quote)
//     base: { address: WETH_ADDRESS_BASE, decimals: 18, symbol: "WETH" },
//     quote: { address: PRL_ADDRESS_BASE, decimals: 18, symbol: "PRL" },
//   };
//
//   const kandelAskAmountWETH = parseUnits("0.05", kandelMarketWETHBase.base.decimals); // Kandel sells 0.05 WETH
//   const kandelBidAmountPRL = parseUnits("50000", kandelMarketWETHBase.quote.decimals); // Kandel sells 50000 PRL (to buy WETH)
//
//   console.log(`\nFetching Balancer price data for Kandel market: ${kandelMarketWETHBase.base.symbol}/${kandelMarketWETHBase.quote.symbol}`);
//   const priceInfoWETHBase = await getBalancerPriceData(
//     client,
//     kandelMarketWETHBase,
//     kandelAskAmountWETH,
//     kandelBidAmountPRL
//   );
//   console.log("Balancer Price Info (WETH/PRL):", JSON.stringify(priceInfoWETHBase, null, 2));
//
// }
//
// main().catch(console.error);
