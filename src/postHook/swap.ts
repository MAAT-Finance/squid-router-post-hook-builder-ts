import { Contract, Provider, ethers } from "ethers";
import { FeeAmount, computePoolAddress } from "@uniswap/v3-sdk";
import Quoter from "@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json";
import IUniswapV3PoolABI from "@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json";
import {
	POOL_FACTORY_CONTRACT_ADDRESS,
	QUOTER_CONTRACT_ADDRESS,
	SQUID_MULTICALL_ADDRESS,
	SWAP_ROUTER_ADDRESS,
} from "./constants";
import { swapRouterAbi } from "../../abi/swap-router";
import { Token } from "@uniswap/sdk-core";

export async function swapExactOutputSingle(
	tokenIn: Token,
	tokenOut: Token,
	amountOut: bigint,
	poolFee: FeeAmount.LOW,
	arbitrumProvider: Provider
) {
	// ====== Quote ======

	const quoterContract = new Contract(
		QUOTER_CONTRACT_ADDRESS,
		Quoter.abi,
		arbitrumProvider
	);

	const poolConstants = await getPoolConstants(
		tokenIn,
		tokenOut,
		poolFee,
		arbitrumProvider
	);

	const sqrtPriceLimitX96 = BigInt(0); // Unused
	const quotedAmountIn: bigint =
		await quoterContract.quoteExactOutputSingle.staticCall(
			poolConstants.token1,
			poolConstants.token0,
			BigInt(poolConstants.fee),
			amountOut,
			sqrtPriceLimitX96
		);

	// ====== Swap ======

	const swapRouter = new Contract(
		SWAP_ROUTER_ADDRESS,
		swapRouterAbi,
		arbitrumProvider
	);

	const deadline = BigInt(Math.floor(new Date().setFullYear(2030) / 1000));
	const amountInMaximum = BigInt((quotedAmountIn * BigInt(11)) / BigInt(10));

	const params = [
		tokenIn.address,
		tokenOut.address,
		BigInt(poolFee),
		SQUID_MULTICALL_ADDRESS,
		deadline,
		amountOut,
		amountInMaximum,
		sqrtPriceLimitX96,
	];

	const tx = await swapRouter.exactOutputSingle.populateTransaction(params);

	return tx.data;
}

async function getPoolConstants(
	tokenIn: Token,
	tokenOut: Token,
	poolFee: FeeAmount,
	arbitrumProvider: Provider
): Promise<{
	token0: string;
	token1: string;
	fee: number;
}> {
	const currentPoolAddress = computePoolAddress({
		factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
		tokenA: tokenIn,
		tokenB: tokenOut,
		fee: poolFee,
	});

	const poolContract = new Contract(
		currentPoolAddress,
		IUniswapV3PoolABI.abi,
		arbitrumProvider
	);

	const [token0, token1, fee] = await Promise.all([
		poolContract.token0(),
		poolContract.token1(),
		poolContract.fee(),
	]);

	return {
		token0,
		token1,
		fee,
	};
}
