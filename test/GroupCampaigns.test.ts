import { expect } from "chai";
import { ethers } from "hardhat";
import { AddressLike, BigNumberish, parseEther, Signer } from "ethers";
import { GroupCampaigns } from "../typechain-types";

describe("GroupCampaigns", function () {
    let groupCampaigns: GroupCampaigns;
    let protocol: Signer;
    let protocolFeePercent: BigNumberish;
    let group: Signer;
    let host: Signer;
    let fan: Signer;
    let brand: Signer;
    let campaignCount: BigNumberish;
    let title: string;
    let deadline: BigNumberish;
    let slotsAvailable: BigNumberish;
    let slotPrice: BigNumberish;
    let tipAmount: BigNumberish;

    const PRECISION: BigNumberish = 1e18;

    beforeEach(async function () {
        [protocol, host, group, fan, brand] = await ethers.getSigners();        
        protocolFeePercent = 5000;

        campaignCount = 0;
        tipAmount = parseEther("0.0001");

        const GroupCampaignsFactory = await ethers.getContractFactory("GroupCampaigns");
        groupCampaigns = await GroupCampaignsFactory.deploy(protocolFeePercent, protocol);

        // Create a campaign for testing
        title = "Test Campaign";
        deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
        slotsAvailable = 5;
        slotPrice = ethers.parseEther("0.1");

        // Expect the CampaignCreated event to be emitted
        await expect(
            groupCampaigns.createCampaign(await group.getAddress(), await host.getAddress(), title, deadline, slotsAvailable, slotPrice)
        )
            .to.emit(groupCampaigns, "CampaignCreated")
            .withArgs(campaignCount, await group.getAddress(), title, deadline, slotsAvailable, slotPrice);
        
        campaignCount = await groupCampaigns.campaignCount();
        protocolFeePercent = await groupCampaigns.getProtocolFeePercent();
    });

    it("Should deploy GroupCampaigns", async function () {
        // Verify deployment
        expect(groupCampaigns.getAddress()).to.not.equal(0);
    });

    it("Should create a new campaign with the correct details", async function () {
        // Fetch the created campaign and verify its details
        const campaign = await groupCampaigns.campaignById(0);
        expect(campaign.id).to.equal(0);
        expect(campaign.group).to.equal(await group.getAddress());
        expect(campaign.host).to.equal(await host.getAddress());
        expect(campaign.title).to.equal(title);
        expect(campaign.deadline).to.equal(deadline);
        expect(campaign.slotsAvailable).to.equal(slotsAvailable);
        expect(campaign.slotPrice).to.equal(slotPrice);
        expect(campaign.totalRaised).to.equal(0);
        expect(campaign.active).to.be.true;
        expect(await groupCampaigns.campaignCount()).to.equal(1);
    });

    it("Should allow the hos to update the campaign details", async function () {
        // Updated campaign details
        const newTitle = "New Title";
        const newDeadline = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
        const newSlotsAvailable = 10;
        const newSlotPrice = ethers.parseEther("0.2");

        // Update the campaign
        await groupCampaigns.connect(host).updateCampaign(0, newTitle, newDeadline, newSlotsAvailable, newSlotPrice);

        // Fetch the updated campaign and verify its details
        const campaign = await groupCampaigns.campaignById(0);
        expect(campaign.title).to.equal(newTitle);
        expect(campaign.deadline).to.equal(newDeadline);
        expect(campaign.slotsAvailable).to.equal(newSlotsAvailable);
        expect(campaign.slotPrice).to.equal(newSlotPrice);
    });

    it("Should allow the host to end the campaign", async function () {
        // End the campaign
        await groupCampaigns.connect(host).endCampaign(0);

        // Fetch the ended campaign and verify its details
        const campaign = await groupCampaigns.campaignById(0);
        expect(campaign.active).to.be.false;

    });

    it("Should allow the fan to tip the campaign", async function () {
        // Tip the campaign
        await groupCampaigns.connect(fan).tipCampaign(0, { value: tipAmount });

        const campaignBalance = await groupCampaigns.getCampaignBalance(0);
        expect(campaignBalance).to.equal(tipAmount);
    });

    describe("Sponsorship", async function () {
        let campaignId: number;
        let startingBrandBalance: string;

        beforeEach(async function () {
            campaignId = 0;
            startingBrandBalance = (await ethers.provider.getBalance(await brand.getAddress())).toString();
            
            // Request to sponsor the campaign
            await groupCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), { value: slotPrice })
        });
        
        it("Should add the brand to the sponsor requests", async function () {
            // Check available slots
            const campaign = await groupCampaigns.campaignById(campaignId);
            expect(campaign.slotsAvailable).to.equal(Number(slotsAvailable) - 1);
            // Check the pending funds
            const pendingFunds = await groupCampaigns.getCampaignPendingFunds(campaignId);
            expect(pendingFunds).to.equal(slotPrice);
            // Check the sponsor requests
            const sponsorRequests = await groupCampaigns.getCampaignSponsorRequests(campaignId);
            expect(sponsorRequests[0]).to.equal(await brand.getAddress());
            // Check the brand balance
            const brandBalance = await ethers.provider.getBalance(await brand.getAddress());
            expect(brandBalance).to.approximately(BigInt(startingBrandBalance) - BigInt(slotPrice), 1e15); // Give a margin of error of 0.0001 for gas fees
        });

        it("Should allow the host to accept the brand as a sponsor", async function () {
            // Accept the brand as a sponsor
            await groupCampaigns.connect(host).acceptSponsor(campaignId, await brand.getAddress());
            // Check the sponsor requests
            await expect(groupCampaigns.getCampaignSponsorRequests(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoPendingSponsors");
            // Check the sponsors
            const sponsors = await groupCampaigns.getCampaignSponsors(campaignId);
            expect(sponsors[0].sponsor).to.equal(await brand.getAddress());
            // Check the campaign balance
            const balance = await groupCampaigns.getCampaignBalance(campaignId);
            expect(balance).to.equal(slotPrice);
            // Check the campaign pending funds
            await expect(groupCampaigns.getCampaignPendingFunds(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoPendingFunds");
        });

        it("Should allow the host to reject the brand as a sponsor", async function () {
            // Reject the brand as a sponsor
            await groupCampaigns.connect(host).rejectSponsor(campaignId, await brand.getAddress());
            // Check the sponsor requests
            await expect(groupCampaigns.getCampaignSponsorRequests(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoPendingSponsors");
            // Check the available slots
            const campaign = await groupCampaigns.campaignById(campaignId);
            expect(campaign.slotsAvailable).to.equal(slotsAvailable);
            // Check the campaign pending funds
            await expect(groupCampaigns.getCampaignPendingFunds(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoPendingFunds");
            // Check the campaign balance
            await expect(groupCampaigns.getCampaignBalance(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoFunds");
            // Check the brand balance
            const brandBalance = await ethers.provider.getBalance(await brand.getAddress());
            expect(brandBalance).to.approximately(startingBrandBalance, 1e15); // Give a margin of error of 0.0001 for gas fees
        });

    });

    describe("Complete Campaign", async function () {
        let campaignId: number;
        let startingProtocolBalance: string;
        let startingGroupBalance: string;
        let startingBrandBalance: string;

        beforeEach(async function () {
            campaignId = 0;
            startingProtocolBalance = (await ethers.provider.getBalance(await protocol.getAddress())).toString();
            startingGroupBalance = (await ethers.provider.getBalance(await group.getAddress())).toString();
            startingBrandBalance = (await ethers.provider.getBalance(await brand.getAddress())).toString();
            
            // Request to sponsor the campaign
            await groupCampaigns.connect(brand).requestToSponsor(campaignId, await brand.getAddress(), { value: slotPrice })
            // Accept the brand as a sponsor
            await groupCampaigns.connect(host).acceptSponsor(campaignId, await brand.getAddress());
        });

        it("Should not allow the host to end the campaign before the deadline", async function () {
            await expect(groupCampaigns.connect(host).completeCampaign(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__CampaignNotOver");
         });

        it("Should allow the host to end the campaign after the deadline", async function () { 
            // Increase the time by 2 hours
            await ethers.provider.send("evm_increaseTime", [7200]);
            await ethers.provider.send("evm_mine", []);

            // End the campaign
            const campaignBalance: BigNumberish = await groupCampaigns.getCampaignBalance(campaignId);
            await groupCampaigns.connect(host).completeCampaign(campaignId);

            // Calculate the protocol fee
            const protocolFee = ((BigInt(campaignBalance) * BigInt(PRECISION) / (BigInt(protocolFeePercent) + BigInt(PRECISION))) * BigInt(protocolFeePercent)) / BigInt(PRECISION);
            const remainingBalance = BigInt(campaignBalance) - BigInt(protocolFee);

            // Check the protocol balance
            const protocolBalance = await ethers.provider.getBalance(await protocol.getAddress());
            expect(protocolBalance).to.approximately(BigInt(startingProtocolBalance) + BigInt(protocolFee), 1e15); // Give a margin of error of 0.0001 for gas fees

            // Check the brand balance
            const brandBalance = await ethers.provider.getBalance(await brand.getAddress());
            expect(brandBalance).to.approximately(BigInt(startingBrandBalance) - BigInt(slotPrice), 1e15); // Give a margin of error of 0.0001 for gas fees

            // Check the group balance
            const groupBalance = await ethers.provider.getBalance(await group.getAddress());
            expect(groupBalance).to.approximately(BigInt(startingGroupBalance) + remainingBalance, 1e15); // Give a margin of error of 0.0001 for gas fees

            // Check the campaign balance
            await expect(groupCampaigns.getCampaignBalance(campaignId)).to.be.revertedWithCustomError(groupCampaigns, "GroupCampaigns__NoFunds");
        });
    });


});