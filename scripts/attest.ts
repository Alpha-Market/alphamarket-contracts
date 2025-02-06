import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';
import { vars } from 'hardhat/config';

// Configuration constants
// Use the EAS contract address for the network you are using
const EAS_CONTRACT_ADDRESS = '0xC2679fBD37d54388Ce493F1DB75320D236e1815e'; // Sepolia EAS contract address

// Probably better served using parameters to pass in the data to increase reusability
async function attest() {
    try {
        // Initialize provider and signer
        const provider = new ethers.JsonRpcProvider(vars.get('ALCHEMY_API_URL'));
        // Need to capture these from the user
        const signer = new ethers.Wallet(vars.get('SEPOLIA_PRIVATE_KEY'), provider);
        const eas = new EAS(EAS_CONTRACT_ADDRESS);
        eas.connect(signer);

        // Need to define the schema for the content we want to attest
        const schemaUID = 'SCHEMA_ID'; // The UID of the schema.

        // Initialize SchemaEncoder with the schema string
        const schemaEncoder = new SchemaEncoder('YOUR_DEFINED_SCHEMA'); // e.g., bytes32 contentHash, string urlOfContent
        const encodedData = schemaEncoder.encodeData([
            { name: '', value: '', type: '' },
            { name: '', value: '', type: '' },
            /*
            In our example schema we provided, it would look something like this:
            { name: "contentHash", value: "0x2d2d2d0a617574686f723a20466572686174204b6f6368616e0a...", type: "bytes32" },
            { name: "urlOfContent", value: "quicknode.com/guides/ethereum-development/smart-contracts/what-is-ethereum-attestation-service-and-how-to-use-it", type: "string" },
            */
        ]);

        // Send transaction
        const tx = await eas.attest({
            schema: schemaUID,
            data: {
                recipient: 'YOUR_RECIPIENT_ADDRESS', // The Ethereum address of the recipient of the attestation. Host/Gro++up
                expirationTime: BigInt(0), // The expiration time of the attestation. Set to 0 for no expiration. optional
                revocable: true, // Note that if schema is not revocable, this MUST be false
                refUID: 'YOUR_REFERENCE_UID', // The reference UID of the attestation. optional, can be used to link attestations (sub-comments?);
                data: encodedData, // The encoded data
            },
        });

        const newAttestationUID = await tx.wait();
        console.log('New attestation UID:', newAttestationUID);
    } catch (error) {
        console.error('An error occurred:', error);
    }
}

attest();
