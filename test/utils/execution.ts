import { Contract, Wallet, utils, BigNumber } from "ethers"
import { AddressZero } from "@ethersproject/constants";

export const EIP_DOMAIN = {
    EIP712Domain: [
        { type: "address", name: "verifyingContract" }
    ]
}

export const EIP712_SAFE_TX_TYPE = {
    // "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
    SafeTx: [
        { type: "address", name: "to" },
        { type: "uint256", name: "value" },
        { type: "bytes", name: "data" },
        { type: "uint8", name: "operation" },
        { type: "uint256", name: "safeTxGas" },
        { type: "uint256", name: "baseGas" },
        { type: "uint256", name: "gasPrice" },
        { type: "address", name: "gasToken" },
        { type: "address", name: "refundReceiver" },
        { type: "uint256", name: "nonce" },
    ]
}

export const EIP712_SAFE_MESSAGE_TYPE = {
    // "SafeMessage(bytes message)"
    SafeMessage: [
        { type: "bytes", name: "message" },
    ]
}

export interface MetaTransaction {
    to: string,
    value: string | number | BigNumber,
    data: string,
    operation: number,
}

export interface SafeTransaction extends MetaTransaction {
    safeTxGas: string | number,
    baseGas: string | number,
    gasPrice: string | number,
    gasToken: string,
    refundReceiver: string,
    nonce: string | number
}

export interface SafeSignature {
    signer: string,
    data: string
}

export const calculateSafeDomainHash = (safe: Contract): string => {
    return utils._TypedDataEncoder.hashDomain({ verifyingContract: safe.address })
}

export const calculateSafeTransactionHash = (safe: Contract, safeTx: SafeTransaction): string => {
    return utils._TypedDataEncoder.hash({ verifyingContract: safe.address }, EIP712_SAFE_TX_TYPE, safeTx)
}

export const calculateSafeMessageHash = (safe: Contract, message: string): string => {
    return utils._TypedDataEncoder.hash({ verifyingContract: safe.address }, EIP712_SAFE_MESSAGE_TYPE, { message })
}

export const safeApproveHash = async (signer: Wallet, safe: Contract, safeTx: SafeTransaction, skipOnChainApproval?: boolean): Promise<SafeSignature> => {
    if (!skipOnChainApproval) {
        const typedDataHash = utils.arrayify(calculateSafeTransactionHash(safe, safeTx))
        const signerSafe = safe.connect(signer)
        await signerSafe.approveHash(typedDataHash)
    }
    return {
        signer: signer.address,
        data: "0x000000000000000000000000" + signer.address.slice(2) + "0000000000000000000000000000000000000000000000000000000000000000" + "01"
    }
}

export const safeSignTypedData = async (signer: Wallet, safe: Contract, safeTx: SafeTransaction): Promise<SafeSignature> => {
    return {
        signer: signer.address,
        data: await signer._signTypedData({ verifyingContract: safe.address }, EIP712_SAFE_TX_TYPE, safeTx)
    }
}

export const signHash = async (signer: Wallet, hash: string): Promise<SafeSignature> => {
    const typedDataHash = utils.arrayify(hash)
    return {
        signer: signer.address,
        data: (await signer.signMessage(typedDataHash)).replace(/1b$/, "1f").replace(/1c$/, "20")
    }
}

export const safeSignMessage = async (signer: Wallet, safe: Contract, safeTx: SafeTransaction): Promise<SafeSignature> => {
    return signHash(signer, calculateSafeTransactionHash(safe, safeTx))
}

export const buildSignatureBytes = (signatures: SafeSignature[]): string => {
    signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()))
    let signatureBytes = "0x"
    for (const sig of signatures) {
        signatureBytes += sig.data.slice(2)
    }
    return signatureBytes
}

export const logGas = async (message: string, tx: Promise<any>): Promise<any> => {
    return tx.then(async (result) => {
        const receipt = await result.wait()
        console.log("           Used", receipt.gasUsed.toNumber(), `gas for >${message}<`)
        return result
    })
}

export const executeTx = async (safe: Contract, safeTx: SafeTransaction, signatures: SafeSignature[], overrides?: any): Promise<any> => {
    const signatureBytes = buildSignatureBytes(signatures)
    return safe.execTransaction(safeTx.to, safeTx.value, safeTx.data, safeTx.operation, safeTx.safeTxGas, safeTx.baseGas, safeTx.gasPrice, safeTx.gasToken, safeTx.refundReceiver, signatureBytes, overrides || {})
}

export const buildContractCall = (contract: Contract, method: string, params: any[], nonce: number, delegateCall?: boolean): SafeTransaction => {
    const data = contract.interface.encodeFunctionData(method, params)
    return buildSafeTransaction({
        to: contract.address,
        data,
        operation: delegateCall ? 1 : 0,
        nonce
    })
}

export const executeContractCallWithSigners = async (safe: Contract, contract: Contract, method: string, params: any[], signers: Wallet[], delegateCall?: boolean) => {
    const tx = buildContractCall(contract, method, params, await safe.nonce(), delegateCall)
    const sigs = await Promise.all(signers.map((signer) => safeSignTypedData(signer, safe, tx)))
    return executeTx(safe, tx, sigs)
}

export const buildSafeTransaction = (template: {
    to: string, value?: BigNumber | number | string, data?: string, operation?: number, safeTxGas?: number | string,
    baseGas?: number | string, gasPrice?: number | string, gasToken?: string, refundReceiver?: string, nonce: number
}): SafeTransaction => {
    return {
        to: template.to,
        value: template.value || 0,
        data: template.data || "0x",
        operation: template.operation || 0,
        safeTxGas: template.safeTxGas || 0,
        baseGas: template.baseGas || 0,
        gasPrice: template.gasPrice || 0,
        gasToken: template.gasToken || AddressZero,
        refundReceiver: template.refundReceiver || AddressZero,
        nonce: template.nonce
    }
}