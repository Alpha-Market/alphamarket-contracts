import { EAS } from "@ethereum-attestation-service/eas-sdk";
import { ethers } from "ethers"; // install alongside EAS
import { vars } from "hardhat/config";

async function fetchAttestation() {
    // Use constants for configurations
    const EAS_CONTRACT_ADDRESS = "0xC2679fBD37d54388Ce493F1DB75320D236e1815e"; // Sepolia EAS contract address

    // Initialize EAS and provider
    const eas = new EAS(EAS_CONTRACT_ADDRESS);
    const provider = new ethers.JsonRpcProvider(vars.get("ALCHEMY_RPC_URL"));
    eas.connect(provider);

    // Define UID as a constant if it's not dynamic
    const UID = "0x62aa93fbae908100345fe96150c6f57ea70946bd8dec4df99bcdb7186f233e39";
    
    try {
        const attestation = await eas.getAttestation(UID); // This function returns an attestation object
        console.log(attestation);
    } catch (error) {
        console.error("Error fetching attestation:", error);
    }
}

fetchAttestation();