'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const modules_1 = require('@nomicfoundation/hardhat-ignition/modules');
const fs_1 = __importDefault(require('fs'));
const hardhat_1 = require('hardhat');
const path_1 = __importDefault(require('path'));
// Function to get the AlphaMarketBase contract address from the deployed addresses JSON
function getBaseAddress(chainId) {
    // Define the path for the deployed addresses file dynamically
    const deploymentsFilePath = path_1.default.resolve(
        '/home/cloudwalker/repos/alpha-market/ignition/deployments',
        `chain-${chainId}/deployed_addresses.json`,
    );
    // Read the JSON file
    let deployments;
    try {
        deployments = JSON.parse(fs_1.default.readFileSync(deploymentsFilePath, 'utf-8'));
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
const CampaignsModule = (0, modules_1.buildModule)('CampaignsModule', (m) => {
    const baseAddress = getBaseAddress(hardhat_1.network.config.chainId);
    const campaigns = m.contract('AlphaCampaigns', [baseAddress]);
    return { campaigns };
});
exports.default = CampaignsModule;
