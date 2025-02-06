'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.EXPCurveModule = void 0;
const modules_1 = require('@nomicfoundation/hardhat-ignition/modules');
const hardhat_1 = require('hardhat');
const helper_hardhat_config_1 = require('../../../helper-hardhat.config');
const ProxyModule = (0, modules_1.buildModule)('ProxyModule', (m) => {
    const {
        owner,
        protocolFeeDestination,
        protocolFeePercent,
        feeSharePercent,
        initialReserve,
        reserveRatio,
        maxGasLimit,
    } = helper_hardhat_config_1.networkConfig[hardhat_1.network.name];
    const expCurveContract = m.contract('ExponentialBondingCurve');
    const initialze = m.encodeFunctionCall(expCurveContract, 'initialize', [
        owner,
        protocolFeeDestination,
        protocolFeePercent,
        feeSharePercent,
        initialReserve,
        reserveRatio,
        maxGasLimit,
    ]);
    const proxyContract = m.contract('ERC1967Proxy', [expCurveContract, initialze]);
    return { proxyContract };
});
exports.EXPCurveModule = (0, modules_1.buildModule)('EXPCurveModule', (m) => {
    const { proxyContract } = m.useModule(ProxyModule);
    const expCurveInstance = m.contractAt('ExponentialBondingCurve', proxyContract);
    return { expCurveInstance, proxyContract };
});
exports.default = exports.EXPCurveModule;
