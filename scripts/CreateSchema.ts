import { SchemaRegistry} from "@ethereum-attestation-service/eas-sdk";
import { ethers } from 'ethers';
import { vars } from "hardhat/config";

// Configuration constants
const schemaRegistryContractAddress = "0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0"; // Sepolia Schema Registry contract address
const schemaRegistry = new SchemaRegistry(schemaRegistryContractAddress);

async function registerSchema() {
    try {
        // Initialize provider and signer
        const provider = new ethers.JsonRpcProvider(vars.get("ALCHEMY_API_URL"));
        const signer = new ethers.Wallet(vars.get("SEPOLIA_PRIVATE_KEY"), provider);
        schemaRegistry.connect(signer);

        // Initialize SchemaEncoder with the schema string
        const schema = "YOUR_SCHEMA"; // e.g., bytes32 contentHash, string urlOfContent
        const revocable = true; // A flag allowing an attestation to be revoked. Applies to all attestations of this schema.

        const transaction = await schemaRegistry.register({
            schema,
            revocable,
            // You could add a resolver field here for additional functionality
          });
          
        // Optional: Wait for transaction to be validated
        await transaction.wait();
        console.log("New Schema Created", transaction);
    } catch (error) {
        console.error("An error occurred:", error);
    }
}

registerSchema();