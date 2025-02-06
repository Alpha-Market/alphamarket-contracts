'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const modules_1 = require('@nomicfoundation/hardhat-ignition/modules');
const hardhat_1 = require('hardhat');
const helper_hardhat_config_1 = require('../../../helper-hardhat.config');
const AlphaMarketTreasury_1 = __importDefault(require('./AlphaMarketTreasury'));
function getTreasuryAddress(m) {
    const { treasuryProxy } = m.useModule(AlphaMarketTreasury_1.default);
    return m.contractAt('AlphaMarketTreasury', treasuryProxy).address;
}
const BaseModule = (0, modules_1.buildModule)('BaseModule', (m) => {
    const base = m.contract('AlphaMarketBase');
    const protocolFeeDestination = getTreasuryAddress(m);
    const { owner, protocolFeePercent, feeSharePercent } =
        helper_hardhat_config_1.networkConfig[hardhat_1.network.name];
    const initialze = m.encodeFunctionCall(base, 'initialize', [
        owner,
        protocolFeeDestination,
        protocolFeePercent,
        feeSharePercent,
    ]);
    const proxyContract = m.contract('ERC1967Proxy', [base, initialze]);
    return { proxyContract };
});
exports.default = BaseModule;
