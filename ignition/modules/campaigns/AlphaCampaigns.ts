import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import fs from 'fs';
import { network } from 'hardhat';
import path from 'path';

// Function to get the AlphaMarketBase contract address from the deployed addresses JSON
function getBaseAddress(chainId: number | undefined): string {
    // Define the path for the deployed addresses file dynamically
    const deploymentsFilePath = path.resolve(
        '/home/cloudwalker/repos/alpha-market/ignition/deployments',
        `chain-${chainId}/deployed_addresses.json`,
    );

    // Read the JSON file
    let deployments;
    try {
        deployments = JSON.parse(fs.readFileSync(deploymentsFilePath, 'utf-8'));
    } catch (error) {
        throw new Error(`Failed to load deployments file for chainId ${chainId}: ${error}`);
    }

    // Retrieve the address for the AlphaMarketBase contract (BaseModule#AlphaMarketBase)
    const baseAddress = deployments['BaseModule#AlphaMarketBase'];
    if (!baseAddress) {
        throw new Error(`Base contract address not found for chainId: ${chainId}`);
    }

    return baseAddress;
}

const CampaignsModule = buildModule('CampaignsModule', (m) => {
    const baseAddress = getBaseAddress(network.config.chainId);

    const campaigns = m.contract('AlphaCampaigns', [baseAddress]);

    return { campaigns };
});

export default CampaignsModule;
