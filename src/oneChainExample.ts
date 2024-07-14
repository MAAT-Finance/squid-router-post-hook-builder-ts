import { ethers, formatUnits } from "ethers";
import axios from "axios";
import erc20Abi from "../abi/erc20Abi";
import { NATIVE_ADDRESS } from "./postHook/constants";
import { getBaseProvider, getArbitrumProvider } from "./providers";
import {
	getPostHookForCrossChainSwapAndDeposit,
	getPostHookForOneChainSwapAndDeposit,
} from "./postHook/postHook";
import { Token } from "@uniswap/sdk-core";
import * as dotenv from "dotenv";

dotenv.config();

// Load environment variables from .env file
const privateKey: string = process.env.PRIVATE_KEY!;
const integratorId: string = process.env.INTEGRATOR_ID!;

const usdcArbitrumAddress: string =
	"0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const dstEid = 30184;

// Define chain and token addresses
const fromChainId = "42161";
const toChainId = "42161";
const fromToken = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"; // Define departing token

// Define amount to be swapped and deposited
const amount = "100000";

const signer = new ethers.Wallet(privateKey, getArbitrumProvider());

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
		postHook: await getPostHookForOneChainSwapAndDeposit(
			new Token(42161, usdcArbitrumAddress, 6),
			signer.address
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
