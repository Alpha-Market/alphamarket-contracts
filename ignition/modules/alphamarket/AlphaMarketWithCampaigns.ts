import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';
import { networkConfig } from '../../../helper-hardhat.config';
import { network } from 'hardhat';

const AlphaTreasuryModule = buildModule('AlphaTreasuryModule', (m) => {
    const owner = '0x3ef270a74CaAe5Ca4b740a66497085abBf236655';
    const treasury = m.contract('AlphaMarketTreasury');
    const initialze = m.encodeFunctionCall(treasury, 'initialize', [owner]);
    const treasuryProxy = m.contract('ERC1967Proxy', [treasury, initialze]);

    return { treasuryProxy };
});

const AlphaBaseModule = buildModule('AlphaBaseModule', (m) => {
    const { treasuryProxy } = m.useModule(AlphaTreasuryModule);
    const base = m.contract('AlphaMarketBase');
    const { owner, protocolFeePercent, feeSharePercent } = networkConfig[network.name];

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

const CampaignsModule = buildModule('CampaignsModule', (m) => {
    const { treasuryProxy } = m.useModule(AlphaTreasuryModule);
    const { baseProxy } = m.useModule(AlphaBaseModule);

    const baseAddress = m.contractAt('AlphaMarketBase', baseProxy).address;
    const campaigns = m.contract('AlphaCampaigns', [baseAddress]);

    return { campaigns, treasuryProxy, baseProxy };
});

export default CampaignsModule;
