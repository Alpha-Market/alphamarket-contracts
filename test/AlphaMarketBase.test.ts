import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { AddressLike, Signer } from 'ethers';
import { AlphaMarketBase } from '../typechain-types';
import { AlphaMarketTreasury } from '../typechain-types';

describe('AlphaMarketBase', function () {
    let alphaMarketBase: AlphaMarketBase;
    let alphaMarketTreasury: AlphaMarketTreasury;
    let alphaMarketTreasuryAddress: AddressLike;
    let protocol: Signer;
    let protocolAddress: AddressLike;
    let user: Signer;
    let userAddress: AddressLike;

    beforeEach(async function () {
        // Create signers for testing
        const signers = await ethers.getSigners();

        protocol = signers[0];
        protocolAddress = await protocol.getAddress();
        user = signers[1];
        userAddress = await user.getAddress();

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
    });

    it('Should intialize the contract correctly', async function () {
        expect(await alphaMarketBase.owner()).to.equal(protocolAddress);
        expect(await alphaMarketBase.getProtocolFeeDestination()).to.equal(
            alphaMarketTreasuryAddress,
        );
        expect(await alphaMarketBase.getProtocolFeePercent()).to.equal(1000);
        expect(await alphaMarketBase.getFeeSharePercent()).to.equal(0);
    });

    it('Should update the protocol fee destination correctly', async function () {
        const newTreasury = ethers.Wallet.createRandom();
        expect(await alphaMarketBase.setProtocolFeeDestination(newTreasury.address))
            .to.emit(alphaMarketBase, 'ProtocolFeeDestinationUpdated')
            .withArgs(newTreasury.address);
        expect(await alphaMarketBase.getProtocolFeeDestination()).to.equal(newTreasury.address);
    });

    it('Should update the protocol fee percent correctly', async function () {
        expect(await alphaMarketBase.setProtocolFeePercent(500))
            .to.emit(alphaMarketBase, 'ProtocolFeePercentUpdated')
            .withArgs(500);
        expect(await alphaMarketBase.getProtocolFeePercent()).to.equal(500);
    });

    it('Should update the fee share percent correctly', async function () {
        expect(await alphaMarketBase.setFeeSharePercent(100))
            .to.emit(alphaMarketBase, 'FeeSharePercentUpdated')
            .withArgs(100);
        expect(await alphaMarketBase.getFeeSharePercent()).to.equal(100);
    });

    it('Should not allow non-owner to update the protocol fee destination', async function () {
        const newTreasury = ethers.Wallet.createRandom();
        await expect(alphaMarketBase.connect(user).setProtocolFeeDestination(newTreasury.address))
            .to.be.revertedWithCustomError(alphaMarketBase, 'OwnableUnauthorizedAccount')
            .withArgs(userAddress);
    });

    it('Should not allow non-owner to update the protocol fee percent', async function () {
        await expect(alphaMarketBase.connect(user).setProtocolFeePercent(500))
            .to.be.revertedWithCustomError(alphaMarketBase, 'OwnableUnauthorizedAccount')
            .withArgs(userAddress);
    });

    it('Should not allow non-owner to update the fee share percent', async function () {
        await expect(alphaMarketBase.connect(user).setFeeSharePercent(100))
            .to.be.revertedWithCustomError(alphaMarketBase, 'OwnableUnauthorizedAccount')
            .withArgs(userAddress);
    });
});
