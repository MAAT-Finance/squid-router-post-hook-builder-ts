import { Address, WalletClient } from "viem";

// Function to approve the transactionRequest.target to spend fromAmount of fromToken
export async function approveSpending(
	wallet: WalletClient,
	transactionRequestTarget: Address,
	fromToken: Address,
	fromAmount: string
) {
	const erc20Abi = [
		"function approve(address spender, uint256 amount) public returns (bool)",
	];

	await wallet.writeContract({
		address: fromToken,
		abi: erc20Abi,
		functionName: "approve",
		chain: wallet.chain,
		account: wallet.account,
		args: [transactionRequestTarget, fromAmount],
	});

	console.log(`Approved ${fromAmount} tokens for ${transactionRequestTarget}`);
}
