import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { network } from 'hardhat';
import { networkConfig } from '../../../helper-hardhat.config';
import TreasuryModule from './AlphaMarketTreasury';

function getTreasuryAddress(m: any) {
    const { treasuryProxy } = m.useModule(TreasuryModule);
    return m.contractAt('AlphaMarketTreasury', treasuryProxy).address;
}

const BaseModule = buildModule('BaseModule', (m) => {
    const base = m.contract('AlphaMarketBase');
    const protocolFeeDestination = getTreasuryAddress(m);
    const { owner, protocolFeePercent, feeSharePercent } = networkConfig[network.name];

    const initialze = m.encodeFunctionCall(base, 'initialize', [
        owner,
        protocolFeeDestination,
        protocolFeePercent,
        feeSharePercent,
    ]);

    const proxyContract = m.contract('ERC1967Proxy', [base, initialze]);

    return { proxyContract };
});

export default BaseModule;
