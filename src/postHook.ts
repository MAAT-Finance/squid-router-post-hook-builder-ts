import {
	ChainCall,
	ChainType,
	Hook,
	SquidCallType,
} from "@0xsquid/squid-types";
import {
	Address,
	encodeFunctionData,
	erc20Abi,
	maxUint256,
	parseEther,
} from "viem";
import { aavePoolAbi } from "../abi/aave-pool";

export function getAaveDepositPostHook(
	receiver: Address,
	toToken: Address
): Hook {
	const AAVE_POOL_PROXY_ADDR = "0x794a61358D6845594F94dc1DB02A252b5b4814aD";

	const approveCallData = encodeFunctionData({
		abi: erc20Abi,
		functionName: "approve",
		args: [AAVE_POOL_PROXY_ADDR, maxUint256],
	});

	const approveCall: ChainCall = {
		chainType: ChainType.EVM,
		callType: SquidCallType.FULL_TOKEN_BALANCE,
		target: toToken,
		callData: approveCallData,
		estimatedGas: "200_000",
		payload: {
			tokenAddress: toToken,
			inputPos: 1,
		},
	};

	const depositCallData = encodeFunctionData({
		abi: aavePoolAbi,
		functionName: "supply",
		args: [toToken, BigInt(0), receiver, BigInt(0)],
	});

	const depositCall: ChainCall = {
		chainType: ChainType.EVM,
		callType: SquidCallType.FULL_TOKEN_BALANCE,
		target: AAVE_POOL_PROXY_ADDR,
		callData: depositCallData,
		payload: {
			tokenAddress: toToken,
			inputPos: 1,
		},
		estimatedGas: "500_000",
	};

	const postHook = {
		chainType: ChainType.EVM,
		calls: [approveCall, depositCall],
		provider: "Unknown Protocol?",
		description: "Staking in Unknown Protocol?",
		logoURI: "https://www.svgrepo.com/show/126178/question-mark.svg",
		fundAmount: parseEther("0.0001").toString(),
		fundToken: toToken,
	};

	return postHook;
}
