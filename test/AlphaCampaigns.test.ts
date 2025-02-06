import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { AddressLike, BigNumberish, Signer } from 'ethers';
import { AlphaCampaigns } from '../typechain-types';
import { AlphaMarketBase } from '../typechain-types';
import { AlphaMarketTreasury } from '../typechain-types';
import { $Utils } from '../typechain-types/contracts-exposed/Utils.sol/$Utils';

describe('AlphaCampaigns', function () {
    let alphaCampaigns: AlphaCampaigns;
    let alphaMarketBase: AlphaMarketBase;
    let alphaMarketBaseAddress: string;
    let alphaMarketTreasury: AlphaMarketTreasury;
    let alphaMarketTreasuryAddress: AddressLike;
    let utils: $Utils;
    let protocol: Signer;
    let protocolAddress: AddressLike;
    let host: Signer;
    let hostAddress: AddressLike;
    let brand: Signer;
    let fan: Signer;
    let deadline: BigNumberish;
    let slotsAvailable: BigNumberish;
    let slotPrice: BigNumberish;
    let campaignId: BigNumberish;

    beforeEach(async function () {
        // Create signers for testing
        const [protocolSigner, hostSigner, brandSigner, fanSigner] = await ethers.getSigners();

        protocol = protocolSigner;
        protocolAddress = await protocol.getAddress();
        host = hostSigner;
        brand = brandSigner;
        fan = fanSigner;

        // Deploy the AlphaMarketTreasury contract
        const AlphaMarketTreasuryFactory = await ethers.getContractFactory('AlphaMarketTreasury');
        alphaMarketTreasury = (await upgrades.deployProxy(
            AlphaMarketTreasuryFactory,
            [protocolAddress],
            { initializer: 'initialize' },
        )) as unknown as AlphaMarketTreasury;
        alphaMarketTreasuryAddress = await alphaMarketTreasury.getAddress();

        // Deploy the AlphaMarketBase contract
        const AlphaMarketBaseFactory = await ethers.getContractFactory('AlphaMarketBase');
        alphaMarketBase = (await upgrades.deployProxy(
            AlphaMarketBaseFactory,
            [protocolAddress, alphaMarketTreasuryAddress, 1000, 0],
            { initializer: 'initialize' },
        )) as unknown as AlphaMarketBase;
        alphaMarketBaseAddress = await alphaMarketBase.getAddress();

        // Deploy the AlphaCampaigns contract
        const AlphaCampaignsFactory = await ethers.getContractFactory('AlphaCampaigns');
        alphaCampaigns =
            await AlphaCampaignsFactory.connect(protocol).deploy(alphaMarketBaseAddress);

        // Deploy the Utils contract
        const UtilsFactory = await ethers.getContractFactory('$Utils');
        utils = (await UtilsFactory.connect(protocol).deploy()) as $Utils;

        // Create a campaign for testing
        hostAddress = await host.getAddress();
        deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        slotPrice = ethers.parseEther('0.1');
        slotsAvailable = 1;

        // Call createCampaign and get the campaignId
        const tx = await alphaCampaigns.createCampaign(
            deadline,
            slotPrice,
            hostAddress,
            slotsAvailable,
        );
        if (tx.blockNumber === null) {
            throw new Error('Block number is null');
        }

        const filter = alphaCampaigns.filters.CampaignCreated();
        const events = await alphaCampaigns.queryFilter(filter, tx.blockNumber);
        campaignId = events[0].args?.campaignId.toString();
    });

    it('Should deploy AlphaCampaigns', async function () {
        // Verify deployment
        const fetchedAlphaMarketBaseAddress = await alphaCampaigns.getAlphaMarketBaseAddress();

        expect(alphaMarketBaseAddress).to.equal(fetchedAlphaMarketBaseAddress);
        expect(alphaCampaigns.getAddress()).to.not.equal(0);
    });

    it('Should revert if any of the create campaign details are initialized with zero', async function () {
        // Create a campaign with zero deadline
        await expect(
            alphaCampaigns.createCampaign(0, slotPrice, hostAddress, slotsAvailable),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );

        // Create a campaign with zero slotPrice
        await expect(
            alphaCampaigns.createCampaign(deadline, 0, hostAddress, slotsAvailable),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );

        // Create a campaign with zero hostAddress
        await expect(
            alphaCampaigns.createCampaign(deadline, slotPrice, ethers.ZeroAddress, 0),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );

        // Create a campaign with zero slotsAvailable
        await expect(
            alphaCampaigns.createCampaign(deadline, slotPrice, hostAddress, 0),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );
    });

    it('Should create a new campaign with the correct details', async function () {
        // Fetch the created campaign and verify its details
        const campaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(campaign.deadline).to.equal(deadline);
        expect(campaign.slotPrice).to.equal(slotPrice);
        expect(campaign.host).to.equal(hostAddress);
        expect(campaign.totalRaised).to.equal(0);
        expect(campaign.slotsAvailable).to.equal(slotsAvailable);
    });

    it('Should create a new campaignId if they are identical', async function () {
        // Create a campaign with the same details
        const tx = await alphaCampaigns.createCampaign(
            deadline,
            slotPrice,
            hostAddress,
            slotsAvailable,
        );
        if (tx.blockNumber === null) {
            throw new Error('Block number is null');
        }

        const filter = alphaCampaigns.filters.CampaignCreated();
        const events = await alphaCampaigns.queryFilter(filter, tx.blockNumber);
        const newCampaignId = events[0].args?.campaignId.toString();

        expect(newCampaignId).to.not.equal(campaignId);
    });

    it('Should revert if anyone other than the host tries to update the campaign', async function () {
        // Update the campaign with the protocol
        await expect(
            alphaCampaigns
                .connect(protocol)
                .updateCampaign(campaignId, deadline, slotPrice, slotsAvailable),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');

        // Update the campaign with the brand
        await expect(
            alphaCampaigns
                .connect(brand)
                .updateCampaign(campaignId, deadline, slotPrice, slotsAvailable),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');

        // Update the campaign with the fan
        await expect(
            alphaCampaigns
                .connect(fan)
                .updateCampaign(campaignId, deadline, slotPrice, slotsAvailable),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');
    });

    it('Should revert if the host tries to update the campaign with zero values', async function () {
        // Update the campaign with zero deadline
        await expect(
            alphaCampaigns.connect(host).updateCampaign(campaignId, 0, slotPrice, slotsAvailable),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );

        // Update the campaign with zero slotPrice
        await expect(
            alphaCampaigns.connect(host).updateCampaign(campaignId, deadline, 0, slotsAvailable),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );

        // Update the campaign with zero slotsAvailable
        await expect(
            alphaCampaigns.connect(host).updateCampaign(campaignId, deadline, slotPrice, 0),
        ).to.be.revertedWithCustomError(
            alphaCampaigns,
            'AlphaCampaigns__CampaignValuesCannotBeZero',
        );
    });

    it('Should allow the host to update the campaign details', async function () {
        // Updated campaign details
        const newDeadline = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
        const newSlotsAvailable = 10;
        const newSlotPrice = ethers.parseEther('0.2');

        expect(
            await alphaCampaigns
                .connect(host)
                .updateCampaign(campaignId, newDeadline, newSlotPrice, newSlotsAvailable),
        )
            .to.emit(alphaCampaigns, 'CampaignUpdated')
            .withArgs(campaignId, newDeadline, newSlotPrice, newSlotsAvailable);

        // Fetch the updated campaign and verify its details
        const campaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(campaign.deadline).to.equal(newDeadline);
        expect(campaign.slotsAvailable).to.equal(newSlotsAvailable);
        expect(campaign.slotPrice).to.equal(newSlotPrice);
    });

    it('Should revert if anyone requests to sponsor the campaign without sending enough funds', async function () {
        // Request to sponsor the campaign
        await expect(
            alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
                value: ethers.parseEther('0.05'),
            }),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__NotEnoughFundsToSponsor');
    });

    it('Should allow anyone to request to sponsor the campaign', async function () {
        // Request to sponsor the campaign
        expect(
            await alphaCampaigns
                .connect(brand)
                .requestToSponsor(campaignId, await brand.getAddress(), {
                    value: slotPrice,
                }),
        )
            .to.emit(alphaCampaigns, 'SponsorRequested')
            .withArgs(campaignId, await brand.getAddress(), slotPrice);

        // Check the sponsor requests
        expect(
            await alphaCampaigns.getPendingSponsorStatus(campaignId, await brand.getAddress()),
        ).to.equal(true);
        expect(
            await alphaCampaigns.getSponsorPendingFunds(campaignId, await brand.getAddress()),
        ).to.equal(slotPrice);
    });

    it('Should allow the host to reject a sponsor request', async function () {
        // Request to sponsor the campaign
        await alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
            value: slotPrice,
        });

        // Reject the sponsor request
        expect(
            await alphaCampaigns.connect(host).rejectSponsor(campaignId, await brand.getAddress()),
        )
            .to.emit(alphaCampaigns, 'SponsorRejected')
            .withArgs(campaignId, await brand.getAddress(), slotPrice);

        // Check the sponsor requests
        expect(
            await alphaCampaigns.getPendingSponsorStatus(campaignId, await brand.getAddress()),
        ).to.equal(false);
        expect(
            await alphaCampaigns.getSponsorPendingFunds(campaignId, await brand.getAddress()),
        ).to.equal(slotPrice);
    });

    it('Should allow a sponsor to withdraw their pending funds', async function () {
        // Request to sponsor the campaign
        await alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
            value: slotPrice,
        });

        // Withdraw the pending funds
        expect(await alphaCampaigns.connect(brand).withdrawSponsorFunds(campaignId))
            .to.emit(alphaCampaigns, 'SponsorWithdrawn')
            .withArgs(campaignId, await brand.getAddress());

        // Check the sponsor requests
        expect(
            await alphaCampaigns.getPendingSponsorStatus(campaignId, await brand.getAddress()),
        ).to.equal(false);
        expect(
            await alphaCampaigns.getSponsorPendingFunds(campaignId, await brand.getAddress()),
        ).to.equal(0);
    });

    it('Should not allow a sponsor to withdraw funds if they have been accepted', async function () {
        // Request to sponsor the campaign
        await alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
            value: slotPrice,
        });

        // Accept the sponsor request
        await alphaCampaigns.connect(host).acceptSponsor(campaignId, await brand.getAddress());

        // Withdraw the pending funds
        await expect(
            alphaCampaigns.connect(brand).withdrawSponsorFunds(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__NoFundsToWithdraw');
    });

    it('Should allow the host to accept a sponsor request', async function () {
        // Request to sponsor the campaign
        await alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
            value: slotPrice,
        });

        // Accept the sponsor request
        expect(
            await alphaCampaigns.connect(host).acceptSponsor(campaignId, await brand.getAddress()),
        )
            .to.emit(alphaCampaigns, 'SponsorAccepted')
            .withArgs(campaignId, await brand.getAddress(), slotPrice);

        // Check the updated campaign
        const campaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(campaign.totalRaised).to.equal(slotPrice);
        expect(campaign.slotsAvailable).to.equal(Number(slotsAvailable) - 1);

        // Check the sponsor requests
        expect(
            await alphaCampaigns.getPendingSponsorStatus(campaignId, await brand.getAddress()),
        ).to.equal(false);
        expect(
            await alphaCampaigns.getSponsorPendingFunds(campaignId, await brand.getAddress()),
        ).to.equal(0);

        // Check the sponsors
        const sponsors = await alphaCampaigns.getCampaignSponsors(campaignId);
        expect(sponsors[0]).to.equal(await brand.getAddress());
    });

    it('Should revert if anyone tries to sponsor the campaign after all slots are filled', async function () {
        // Request to sponsor the campaign
        await alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
            value: slotPrice,
        });

        // Accept the sponsor request
        await alphaCampaigns.connect(host).acceptSponsor(campaignId, await brand.getAddress());
        const campaign = await alphaCampaigns.getCampaignById(campaignId);

        // Request to sponsor the campaign
        await expect(
            alphaCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), {
                value: slotPrice,
            }),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__NoSlotsAvailable');
    });

    it('Should allow anyone to tip the campaign', async function () {
        // Tip the campaign
        const tipAmount = ethers.parseEther('0.1');
        expect(await alphaCampaigns.connect(fan).tipCampaign(campaignId, { value: tipAmount }))
            .to.emit(alphaCampaigns, 'CampaignTipped')
            .withArgs(campaignId, await fan.getAddress(), tipAmount);

        // Fetch the campaign and verify the total raised
        const campaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(campaign.totalRaised).to.equal(tipAmount);
    });

    it('Should revert if anyone other than the host tries to complete the campaign', async function () {
        // Complete the campaign with the protocol
        await expect(
            alphaCampaigns.connect(protocol).completeCampaign(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');

        // Complete the campaign with the brand
        await expect(
            alphaCampaigns.connect(brand).completeCampaign(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');

        // Complete the campaign with the fan
        await expect(
            alphaCampaigns.connect(fan).completeCampaign(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__OnlyHost');
    });

    it('Should revert if the host tries to complete the campaign before the deadline', async function () {
        // Complete the campaign
        await expect(
            alphaCampaigns.connect(host).completeCampaign(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__CampaignNotOver');
    });

    it('Should revert if the host tries to withdraw the funds before the campaign is completed', async function () {
        // Withdraw the funds
        await expect(
            alphaCampaigns.connect(host).withdrawFunds(campaignId),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__CampaignNotOver');
    });

    it('Should allow the host to end the campaign', async function () {
        // End the campaign
        expect(await alphaCampaigns.connect(host).endCampaign(campaignId))
            .to.emit(alphaCampaigns, 'CampaignEnded')
            .withArgs(campaignId);

        // Fetch the ended campaign and verify its details
        const endedCampaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(endedCampaign.deadline).to.equal(0);
        expect(endedCampaign.slotsAvailable).to.equal(0);
    });

    it('Should allow the host to complete the campaign and withdraw the funds', async function () {
        // Get initial balances
        const initialProtocolBalance = await ethers.provider.getBalance(alphaMarketTreasuryAddress);
        const initialHostBalance = await ethers.provider.getBalance(await host.getAddress());
        const initialBrandBalance = await ethers.provider.getBalance(await brand.getAddress());
        const initialFanBalance = await ethers.provider.getBalance(await fan.getAddress());

        // Tip the campaign
        const tipAmount = ethers.parseEther('0.1');
        const tipTx = await alphaCampaigns
            .connect(fan)
            .tipCampaign(campaignId, { value: tipAmount });
        const tipReceipt = await tipTx.wait(); // Wait for the transaction to complete
        const tipGasUsed = tipReceipt!.gasUsed * tipTx.gasPrice; // Calculate gas cost for tip transaction

        // Sponsor the campaign
        const sponsorTx = await alphaCampaigns
            .connect(brand)
            .requestToSponsor(campaignId, await brand.getAddress(), {
                value: slotPrice,
            });
        const sponsorReceipt = await sponsorTx.wait(); // Wait for the transaction to complete
        const sponsorGasUsed = sponsorReceipt!.gasUsed * sponsorTx.gasPrice; // Gas cost for sponsor transaction

        // Accept the sponsor request
        const acceptSponsorTx = await alphaCampaigns
            .connect(host)
            .acceptSponsor(campaignId, await brand.getAddress());
        const acceptSponsorReceipt = await acceptSponsorTx.wait(); // Wait for the transaction to complete
        const acceptSponsorGasUsed = acceptSponsorReceipt!.gasUsed * acceptSponsorTx.gasPrice; // Gas cost for accepting sponsor

        // Adjust time to complete the campaign
        await ethers.provider.send('evm_increaseTime', [3600]);
        await ethers.provider.send('evm_mine', []);

        // Complete the campaign
        const campaign = await alphaCampaigns.getCampaignById(campaignId);
        const completeCampaignTx = await alphaCampaigns.connect(host).completeCampaign(campaignId);
        const completeCampaignReceipt = await completeCampaignTx.wait(); // Wait for the transaction to complete
        const completeCampaignGasUsed =
            completeCampaignReceipt!.gasUsed * completeCampaignTx.gasPrice; // Gas cost for completing campaign

        expect(completeCampaignTx)
            .to.emit(alphaCampaigns, 'CampaignCompleted')
            .withArgs(campaignId, campaign.totalRaised);

        // Fetch the completed campaign and verify its details
        const completedCampaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(completedCampaign.deadline).to.equal(0);
        expect(completedCampaign.slotsAvailable).to.equal(0);
        expect(completedCampaign.totalRaised).to.equal(BigInt(slotPrice) + tipAmount);

        // Withdraw the funds
        const withdrawFundsTx = await alphaCampaigns.connect(host).withdrawFunds(campaignId);
        const withdrawFundsReceipt = await withdrawFundsTx.wait(); // Wait for the transaction to complete
        const withdrawFundsGasUsed = withdrawFundsReceipt!.gasUsed * withdrawFundsTx.gasPrice; // Gas cost for withdrawing funds
        expect(withdrawFundsTx)
            .to.emit(alphaCampaigns, 'FundsWithdrawn')
            .withArgs(campaignId, completedCampaign.totalRaised);

        // Inspect post withdrawal campaign
        const postWithdrawalCampaign = await alphaCampaigns.getCampaignById(campaignId);
        expect(postWithdrawalCampaign.totalRaised).to.equal(0);

        // Calculate fees
        const protocolFeePercent = await alphaMarketBase.getProtocolFeePercent();
        const protocolFee = await utils.$calculateBasisPointsPercentage(
            completedCampaign.totalRaised,
            protocolFeePercent,
        );
        const hostTotalAfterFees = completedCampaign.totalRaised - protocolFee;

        // Calculate final balances considering gas used
        const expectedBrandBalance = initialBrandBalance - BigInt(slotPrice) - sponsorGasUsed;
        const expectedFanBalance = initialFanBalance - tipAmount - tipGasUsed;
        const expectedProtocolBalance = initialProtocolBalance + protocolFee;
        const expectedHostBalance =
            initialHostBalance +
            hostTotalAfterFees -
            withdrawFundsGasUsed -
            acceptSponsorGasUsed -
            completeCampaignGasUsed;

        // Assertions
        expect(await ethers.provider.getBalance(await brand.getAddress())).to.equal(
            expectedBrandBalance,
        );
        expect(await ethers.provider.getBalance(await fan.getAddress())).to.equal(
            expectedFanBalance,
        );
        expect(await ethers.provider.getBalance(alphaMarketTreasuryAddress)).to.equal(
            expectedProtocolBalance,
        );
        expect(await ethers.provider.getBalance(await host.getAddress())).to.equal(
            expectedHostBalance,
        );

        // Check treasury can withdraw protocol fees
        const treasuryBalance = await ethers.provider.getBalance(alphaMarketTreasuryAddress);
        const protocolBalance = await ethers.provider.getBalance(protocolAddress);
        const treasuryWithdrawTx = await alphaMarketTreasury.connect(protocol).withdraw();
        const treasuryWithdrawReceipt = await treasuryWithdrawTx.wait();
        const treasuryWithdrawGasUsed =
            treasuryWithdrawReceipt!.gasUsed * treasuryWithdrawTx.gasPrice;

        const filter = alphaMarketTreasury.filters.Withdrawal();
        const events = await alphaMarketTreasury.queryFilter(
            filter,
            treasuryWithdrawReceipt!.blockNumber,
        );
        const totalWithdrawn = events[0].args?.amount;
        // pre-gas value emitted by event
        expect(totalWithdrawn).to.equal(treasuryBalance);

        expect(await ethers.provider.getBalance(alphaMarketTreasuryAddress)).to.equal(0);
        expect(await ethers.provider.getBalance(protocolAddress)).to.equal(
            treasuryBalance + protocolBalance - treasuryWithdrawGasUsed,
        );
    });

    it('Should revert if anyone tries to tip or sponsor the campaign after it has ended', async function () {
        // Tip the campaign
        const tipAmount = ethers.parseEther('0.1');
        await expect(
            alphaCampaigns.connect(fan).tipCampaign(campaignId, { value: tipAmount }),
        ).to.be.revertedWithCustomError(alphaCampaigns, 'AlphaCampaigns__CampaignOver');
    });

    it('Should return the proper value from the getter functions', async function () {
        expect(await alphaCampaigns.getAlphaMarketBaseAddress()).to.equal(alphaMarketBaseAddress);
        expect(await alphaCampaigns.getCampaignDeadline(campaignId)).to.equal(deadline);
        expect(await alphaCampaigns.getCampaignSlotPrice(campaignId)).to.equal(slotPrice);
        expect(await alphaCampaigns.getCampaignTotalRaised(campaignId)).to.equal(0);
        expect(await alphaCampaigns.getCampaignHost(campaignId)).to.equal(hostAddress);
        expect(await alphaCampaigns.getCampaignSlotsAvailable(campaignId)).to.equal(slotsAvailable);
        expect(
            await alphaCampaigns.getPendingSponsorStatus(campaignId, await brand.getAddress()),
        ).to.equal(false);
        expect(
            await alphaCampaigns.getSponsorPendingFunds(campaignId, await brand.getAddress()),
        ).to.equal(0);
        expect(await alphaCampaigns.getCampaignSponsors(campaignId)).to.deep.equal([]);
    });
});
