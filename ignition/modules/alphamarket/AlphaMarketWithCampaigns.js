'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const modules_1 = require('@nomicfoundation/hardhat-ignition/modules');
const helper_hardhat_config_1 = require('../../../helper-hardhat.config');
const hardhat_1 = require('hardhat');
const AlphaTreasuryModule = (0, modules_1.buildModule)('AlphaTreasuryModule', (m) => {
    const owner = '0x3ef270a74CaAe5Ca4b740a66497085abBf236655';
    const treasury = m.contract('AlphaMarketTreasury');
    const initialze = m.encodeFunctionCall(treasury, 'initialize', [owner]);
    const treasuryProxy = m.contract('ERC1967Proxy', [treasury, initialze]);
    return { treasuryProxy };
});
const AlphaBaseModule = (0, modules_1.buildModule)('AlphaBaseModule', (m) => {
    const { treasuryProxy } = m.useModule(AlphaTreasuryModule);
    const base = m.contract('AlphaMarketBase');
    const { owner, protocolFeePercent, feeSharePercent } =
        helper_hardhat_config_1.networkConfig[hardhat_1.network.name];
    const treasuryAddress = m.contractAt('AlphaMarketTreasury', treasuryProxy).address;
    const initialze = m.encodeFunctionCall(base, 'initialize', [
        owner,
        treasuryAddress,
        protocolFeePercent,
        feeSharePercent,
    ]);
    const baseProxy = m.contract('ERC1967Proxy', [base, initialze]);
    return { baseProxy };
});
const CampaignsModule = (0, modules_1.buildModule)('CampaignsModule', (m) => {
    const { treasuryProxy } = m.useModule(AlphaTreasuryModule);
    const { baseProxy } = m.useModule(AlphaBaseModule);
    const baseAddress = m.contractAt('AlphaMarketBase', baseProxy).address;
    const campaigns = m.contract('AlphaCampaigns', [baseAddress]);
    return { campaigns, treasuryProxy, baseProxy };
});
exports.default = CampaignsModule;
