import {
	ChainCall,
	ChainType,
	EvmWallet,
	ExecuteRoute,
	RouteRequest,
	SquidCallType,
} from "@0xsquid/sdk/dist/types";
import {
	Address,
	Chain,
	Hex,
	createPublicClient,
	createWalletClient,
	encodeFunctionData,
	http,
	parseEther,
	setupKzg,
} from "viem";
import { arbitrum, base } from "viem/chains";
import { getSDK } from "./squid-sdk";
import { privateKeyToAccount } from "viem/accounts";

import { approveSpending } from "./approveSpending";
import { JsonRpcProvider, Wallet } from "ethers";
import * as dotenv from "dotenv"; // Import dotenv for environment variables
import { getAaveDepositPostHook } from "./postHook";
import { AxiosError } from "axios";
import { getRoute } from "./getRoute";
dotenv.config(); // Load environment variables from .env file

(async () => {
	const client = createPublicClient({
		chain: base as Chain,
		transport: http(),
	});

	const squid = await getSDK();

	console.log("Client created");

	const user = "0x728F58cd379b47185243Ce981a514C17ed0F6Fc6";
	const account = privateKeyToAccount(process.env.PRIVATE_KEY as Hex);

	const wallet = createWalletClient({
		chain: base as Chain,
		transport: http(),
		account,
	});

	const ARB_CHAIN_ID = "42161";
	const BASE_CHAIN_ID = "8453";

	console.log("User address", account.address);

	console.log("Wallet created");

	const toToken = squid.tokens.find(
		(token) => token.chainId === ARB_CHAIN_ID && token.symbol === "USDC"
	).address;

	console.log("Found token", toToken);

	const NATIVE_ADDR = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const USDC_ARB = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" as Address;

	const postHook = getAaveDepositPostHook(user, toToken as Address);

	console.log("Post hook built");
	console.log(postHook);

	const routeRequest: RouteRequest = {
		fromAmount: parseEther("0.0001").toString(),

		fromChain: BASE_CHAIN_ID,
		toChain: ARB_CHAIN_ID,

		fromToken: NATIVE_ADDR,
		toToken,
		slippage: 0.5,
		slippageConfig: {
			autoMode: 1,
		},
		fromAddress: user,
		toAddress: user,
		// postHook,
	};

	console.log(routeRequest);

	console.log("Preparing to get route");
	// let data = await getRoute(routeRequest);
	let data;
	try {
		data = await squid.getRoute(routeRequest);
		console.log("Getting route...");
	} catch (error) {
		const err = error as AxiosError;
		console.log("Error", err.response.data);
		throw new Error("Failed to get route");
	}

	const { route } = data;
	console.log("Route", route);

	return;

	if (routeRequest.fromToken !== NATIVE_ADDR) {
		console.log("Approving spending...");
		await approveSpending(
			wallet,
			route.transactionRequest.target as Address,
			routeRequest.fromToken as Address,
			routeRequest.fromAmount
		);
	}

	console.log("Sending transaction...");

	const tx = await wallet.sendTransaction({
		account: wallet.account,
		to: route.transactionRequest.target as Address,
		data: route.transactionRequest.data as Hex,
		value: BigInt(route.transactionRequest.value),
		gasLimit: route.transactionRequest.gasLimit,
		kzg: undefined,
		chain: wallet.chain,
	});

	console.log("Transaction sent ", tx);

	// await squid.executeRoute({
	// 	signer,
	// 	route,
	// });

	// const balances = await squid.getEvmBalances({ userAddress: user });

	// console.log("Balances", balances);
})();
