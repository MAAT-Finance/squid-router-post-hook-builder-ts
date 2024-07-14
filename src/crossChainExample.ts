// Import necessary libraries
import { Contract, ethers, formatUnits } from "ethers";
import axios from "axios";
// Import Radiant lending pool ABI

// Import erc20 contract ABI
import erc20Abi from "../abi/erc20Abi";
import { formatEther } from "viem";

// Load environment variables from .env file
import * as dotenv from "dotenv";
import { NATIVE_ADDRESS, USDC_TOKEN_VAULT_ADDRESS } from "./postHook/constants";
import { tokenVaultAbi } from "../abi/token-vault";
import { getBaseProvider, getArbitrumProvider } from "./providers";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { getPostHookForCrossChainSwapAndDeposit } from "./postHook/postHook";
import { Token } from "@uniswap/sdk-core";

dotenv.config();

// Load environment variables from .env file
const privateKey: string = process.env.PRIVATE_KEY!;
const integratorId: string = process.env.INTEGRATOR_ID!;

const usdcArbitrumAddress: string =
	"0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const dstEid = 30184;

// Define chain and token addresses
const fromChainId = "8453"; // Base
const toChainId = "42161"; // Arbitrum
const fromToken = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Define departing token

// Define amount to be swapped and deposited
const amount = "300000";

const signer = new ethers.Wallet(privateKey, getBaseProvider());

// Function to get the optimal route for the swap using Squid API
const getRoute = async (params: any) => {
	try {
		const result = await axios.post(
			"https://apiplus.squidrouter.com/v2/route",

			params,
			{
				headers: {
					"x-integrator-id": integratorId,
					"Content-Type": "application/json",
				},
			}
		);
		const requestId = result.headers["x-request-id"]; // Retrieve request ID from response headers
		return { data: result.data, requestId: requestId };
	} catch (error) {
		if (error.response) {
			console.error("API error:", error.response.data);
		}
		console.error("Error with parameters:", params);
		throw error;
	}
};

// Function to get the status of the transaction using Squid API
const getStatus = async (params: any) => {
	try {
		const result = await axios.get(
			"https://apiplus.squidrouter.com/v2/status",
			{
				params: {
					transactionId: params.transactionId,
					requestId: params.requestId,
					fromChainId: params.fromChainId,
					toChainId: params.toChainId,
				},
				headers: {
					"x-integrator-id": integratorId,
				},
			}
		);
		return result.data;
	} catch (error) {
		if (error.response) {
			console.error("API error:", error.response.data);
		}
		console.error("Error with parameters:", params);
		throw error;
	}
};

// Function to periodically check the transaction status until it completes
const updateTransactionStatus = async (txHash: string, requestId: string) => {
	const getStatusParams = {
		transactionId: txHash,
		requestId: requestId,
		fromChainId: fromChainId,
		toChainId: toChainId,
	};

	let status;
	const completedStatuses = [
		"success",
		"partial_success",
		"needs_gas",
		"not_found",
	];
	const maxRetries = 15; // Maximum number of retries for status check
	let retryCount = 0;

	do {
		try {
			status = await getStatus(getStatusParams);
			console.log(`Route status: ${status.squidTransactionStatus}`);
		} catch (error) {
			if (error.response && error.response.status === 404) {
				retryCount++;
				if (retryCount >= maxRetries) {
					console.error("Max retries reached. Transaction not found.");
					break;
				}
				console.log("Transaction not found. Retrying...");
				await new Promise((resolve) => setTimeout(resolve, 20000)); // Wait for 10 seconds before retrying
				continue;
			} else {
				throw error; // Rethrow other errors
			}
		}

		if (!completedStatuses.includes(status.squidTransactionStatus)) {
			await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before checking the status again
		}
	} while (!completedStatuses.includes(status.squidTransactionStatus));
};

export const quoteOftSend = async (tokenVaultAddr: string, dstEid: number) => {
	const tokenVault = new Contract(
		tokenVaultAddr,
		tokenVaultAbi,
		getArbitrumProvider()
	);
	const extraOptions = Options.newOptions().addExecutorLzReceiveOption(
		"250000",
		"0"
	);

	const params = [
		dstEid,
		ethers.zeroPadBytes(signer.address, 32),
		BigInt(10000000),
		BigInt(10000000),
		extraOptions.toBytes(),
		"0x",
		"0x",
	];

	console.log(params);

	const result = await tokenVault.quoteSend(params, false);
	const nativeFee = result[0] as bigint;

	return nativeFee;
};

// Function to approve the transactionRequest.target to spend fromAmount of fromToken
const approveSpending = async (
	transactionRequestTarget: string,
	fromToken: string,
	fromAmount: string
) => {
	if (fromToken === NATIVE_ADDRESS) {
		console.log("Skipping allowance for native...");
	}

	const tokenContract = new ethers.Contract(fromToken, erc20Abi, signer);

	console.log(transactionRequestTarget);
	console.log(tokenContract.address);

	const allowance = await tokenContract.allowance(
		signer.address,
		transactionRequestTarget
	);

	console.log(
		"Allowance: ",
		formatUnits(String(allowance), await tokenContract.decimals())
	);

	if (allowance >= fromAmount) {
		console.log("Skipping allowance...");
		return;
	}

	try {
		const tx = await tokenContract.approve(
			transactionRequestTarget,
			fromAmount,
			{
				gasLimit: "200000",
			}
		);
		await tx.wait();
		console.log(
			`Approved ${formatUnits(
				fromAmount,
				await tokenContract.decimals()
			)} tokens for ${transactionRequestTarget}`
		);
	} catch (error) {
		console.error("Approval failed:", error);
		throw error;
	}
};

// Set up parameters for swapping tokens
async function main() {
	const nativeFee = await quoteOftSend(USDC_TOKEN_VAULT_ADDRESS, dstEid);
	console.log("Native fee", formatEther(nativeFee));

	// Set up parameters for swapping tokens and depositing into Radiant lending pool
	const params = {
		fromAddress: signer.address,
		fromChain: fromChainId,
		fromToken: fromToken,
		fromAmount: amount,
		toChain: toChainId,
		toToken: usdcArbitrumAddress,
		toAddress: signer.address,
		enableExpress: true,
		receiveGasOnDestination: false,
		slippage: 1, //optional, Squid will dynamically calculate if removed
		postHook: await getPostHookForCrossChainSwapAndDeposit(
			new Token(42161, usdcArbitrumAddress, 6),
			signer.address,
			dstEid,
			getArbitrumProvider()
		),
	};

	console.log("Parameters:", params);
	console.log("Calls", params.postHook.calls);

	// Get the swap route using Squid API
	const routeResult = await getRoute(params);
	const route = routeResult.data.route;
	const requestId = routeResult.requestId;
	console.log("Calculated route:", route);
	console.log("requestId:", requestId);

	const transactionRequest = route.transactionRequest;

	// Approve the transactionRequest.target to spend fromAmount of fromToken
	await approveSpending(transactionRequest.target, fromToken, amount);

	// Execute the transaction
	const tx = await signer.sendTransaction({
		to: transactionRequest.target,
		data: transactionRequest.data,
		value: transactionRequest.value,
		gasPrice: (await getArbitrumProvider().getFeeData()).gasPrice * BigInt(2),
		gasLimit: transactionRequest.gasLimit,
	});

	const txReceipt = await tx.wait();
	console.log("Transaction Hash: ", txReceipt.hash);

	// Show the transaction receipt with Axelarscan link
	const axelarScanLink = "https://axelarscan.io/gmp/" + txReceipt.hash;
	console.log(`Finished! Check Axelarscan for details: ${axelarScanLink}`);

	// Update transaction status until it completes
	await updateTransactionStatus(txReceipt.hash, requestId);
}

main()
	.then(process.exit.bind(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
