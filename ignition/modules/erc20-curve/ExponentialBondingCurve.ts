import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { network } from 'hardhat';
import { networkConfig } from '../../../helper-hardhat.config';

const ProxyModule = buildModule('ProxyModule', (m) => {
    const {
        owner,
        protocolFeeDestination,
        protocolFeePercent,
        feeSharePercent,
        initialReserve,
        reserveRatio,
        maxGasLimit,
    } = networkConfig[network.name];

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

export const EXPCurveModule = buildModule('EXPCurveModule', (m) => {
    const { proxyContract } = m.useModule(ProxyModule);
    const expCurveInstance = m.contractAt('ExponentialBondingCurve', proxyContract);

    return { expCurveInstance, proxyContract };
});

export default EXPCurveModule;
