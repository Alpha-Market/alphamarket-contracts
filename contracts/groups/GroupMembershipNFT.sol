// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Burnable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {MembershipPricingEngine} from "./MembershipPricingEngine.sol";
import {AlphaMarketBase} from "../alphamarket/AlphaMarketBase.sol";
import "../Utils.sol";
import "./Errors.sol";

/// @title GroupNFTMembership
/// @author Dustin Stacy
/// @notice This contract implements a membership NFT for a group that can be minted and burned using a bonding curve.
contract GroupMembershipNFT is ERC721, ERC721Burnable, AccessControl {
    /*///////////////////////////////////////////////////////////////
                             STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/

    /// Access control roles for the contract.
    bytes32 public constant HOST_ROLE = keccak256("HOST_ROLE");
    bytes32 public constant FAN_ROLE = keccak256("FAN_ROLE");

    /// Instance of the Alpha Market Base contract.
    AlphaMarketBase private immutable i_alphaMarketBase;

    /// Instance of a Bonding Curve contract used to determine the price of tokens.
    MembershipPricingEngine private immutable i_nftCurve;

    /// The reserve balance belonging to the group host.
    uint256 private hostReserveBalance;

    /// The reserve balance belonging to the membership pool.
    uint256 private membershipReserveBalance;

    /// The reserve balance belonging to the community pool.
    uint256 private communityReserveBalance;

    /// The threshold at which the reserve is split between the membership and community pools.
    uint256 private reserveSplitThreshold;

    /// The percentage of the reserve to split between the membership and community pools. (basis points)
    uint256 private reserveSplitPercent;

    /// The current supply of tokens.
    uint256 private currentSupply;

    /// The next token ID to be minted.
    uint256 private nextTokenId;

    /*///////////////////////////////////////////////////////////////
                                EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// Event to log membership purchases.
    event MembershipPurchased(address indexed buyer, uint256 amountSpent, uint256 fees, uint256 tokensMinted);

    /// Event to log membership sales.
    event MembershipSold(
        address indexed owner, address indexed seller, uint256 amountReceived, uint256 fees, uint256 tokensBurnt
    );

    /// Event to log membership transfers.
    event MembershipTransferred(address indexed from, address indexed to, uint256 tokenId);

    /// Events to log reserve balance updates.
    event hostReserveBalanceUpdated(uint256 newBalance);
    event membershipReserveBalanceUpdated(uint256 newBalance);
    event communityReserveBalanceUpdated(uint256 newBalance);

    /*///////////////////////////////////////////////////////////////
                                MODIFIERS
    ///////////////////////////////////////////////////////////////*/

    modifier isApprovedOrOwner(address owner, address spender, uint256 tokenId) {
        if (!_isAuthorized(owner, spender, tokenId)) {
            revert GroupNFTMembership__UnauthorizedSeller();
        }
        _;
    }

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    ///////////////////////////////////////////////////////////////*/

    /// @param _name The name of the ERC721 token.
    /// @param _symbol The symbol of the ERC721 token.
    /// @param _alphaMarketBase The address of the AlphaMarketBase contract.
    /// @param _bcAddress The address of the MembershipPricingEngine contract.
    /// @param _reserveSplitThreshold The threshold at which the reserve is split between the membership and community pools.
    /// @param _reserveSplitPercent The percentage of the reserve to split between the membership and community pools. (basis points)
    /// @dev The contract is initialized with an initial supply of 1 token minted to the host.
    /// @dev The required amount of Ether is to establish the initial reserve in the bonding curve.
    constructor(
        string memory _name,
        string memory _symbol,
        address _alphaMarketBase,
        address _bcAddress,
        address _host,
        uint256 _reserveSplitThreshold,
        uint256 _reserveSplitPercent
    ) ERC721(_name, _symbol) {
        if (_alphaMarketBase == address(0) || _bcAddress == address(0) || _host == address(0)) {
            revert GroupNFTMembership__AddressCannotBeZero();
        }
        i_nftCurve = MembershipPricingEngine(_bcAddress);
        i_alphaMarketBase = AlphaMarketBase(_alphaMarketBase);
        _grantRole(HOST_ROLE, _host);
        reserveSplitThreshold = _reserveSplitThreshold;
        reserveSplitPercent = _reserveSplitPercent;
    }

    /*///////////////////////////////////////////////////////////////
                          EXTERNAL FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// Allows a user to mint tokens by sending Ether to the contract.
    function purchaseMembership() external payable {
        uint256 tokenId = nextTokenId;
        uint256 costToMint = i_nftCurve.getMembershipCost(currentSupply);

        if (msg.value < costToMint) {
            revert GroupNFTMembership__InsufficientFundingForTransaction();
        }

        uint256 fees = Utils.calculateBasisPointsPercentage(costToMint, i_alphaMarketBase.getProtocolFeePercent());

        membershipReserveBalance += msg.value - fees;
        currentSupply++;
        nextTokenId++;

        if (membershipReserveBalance >= reserveSplitThreshold) {
            uint256 splitAmount = Utils.calculateBasisPointsPercentage(membershipReserveBalance, reserveSplitPercent);
            fundCommunityReserve(splitAmount);
        }

        uint256 feeSharePercent = i_alphaMarketBase.getFeeSharePercent();
        uint256 feeShare = Utils.calculateBasisPointsPercentage(fees, feeSharePercent);
        fees = fees - feeShare;
        hostReserveBalance += feeShare;

        emit MembershipPurchased(msg.sender, msg.value, fees, tokenId);

        address protocolFeeDestination = i_alphaMarketBase.getProtocolFeeDestination();
        (bool success,) = protocolFeeDestination.call{value: msg.value - fees}("");
        if (!success) {
            revert GroupNFTMembership__ProtocolFeeTransferFailed();
        }

        _grantRole(FAN_ROLE, msg.sender);
        _mint(msg.sender, tokenId);
    }

    /// Allows a user to transfer a token to another address.
    /// @param to The address to transfer the token to.
    /// @param tokenId The ID of the token to transfer.
    function transferMembership(address to, uint256 tokenId) external isApprovedOrOwner(msg.sender, to, tokenId) {
        _revokeRole(FAN_ROLE, msg.sender);
        _grantRole(FAN_ROLE, to);
        _transfer(msg.sender, to, tokenId);

        emit MembershipTransferred(msg.sender, to, tokenId);
    }

    /// Allows a user to burn tokens and receive ether from the contract.
    /// @dev need to transfer role if token is transfered to another address
    /// @param owner The address of the owner.
    function sellMembership(address owner, uint256 tokenId) external isApprovedOrOwner(owner, msg.sender, tokenId) {
        uint256 saleReturn = i_nftCurve.getMembershipValue(membershipReserveBalance, currentSupply);

        uint256 fees = Utils.calculateBasisPointsPercentage(saleReturn, i_alphaMarketBase.getProtocolFeePercent());
        uint256 saleValue = saleReturn - fees;

        membershipReserveBalance -= saleReturn;

        _revokeRole(FAN_ROLE, owner);
        _burn(tokenId);

        emit MembershipSold(owner, msg.sender, saleValue, fees, tokenId);

        address protocolFeeDestination = i_alphaMarketBase.getProtocolFeeDestination();
        (bool success1,) = protocolFeeDestination.call{value: fees}("");
        if (!success1) {
            revert GroupNFTMembership__ProtocolFeeTransferFailed();
        }

        (bool success2,) = owner.call{value: saleValue}("");
        if (!success2) {
            revert GroupNFTMembership__TokenSaleTransferFailed();
        }
    }

    function withdrawHostReserveBalance(address host) external onlyRole(HOST_ROLE) {
        if (msg.sender != host) {
            revert GroupNFTMembership__UnauthorizedWithdrawal();
        }
        uint256 amount = hostReserveBalance;
        hostReserveBalance = 0;
        (bool success,) = host.call{value: amount}("");
        if (!success) {
            revert GroupNFTMembership__HostReserveWithdrawalFailed();
        }

        emit hostReserveBalanceUpdated(hostReserveBalance);
    }

    /*///////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    function fundCommunityReserve(uint256 amount) internal {
        membershipReserveBalance -= amount;
        communityReserveBalance += amount;
        emit membershipReserveBalanceUpdated(membershipReserveBalance);
        emit communityReserveBalanceUpdated(communityReserveBalance);
    }

    /*///////////////////////////////////////////////////////////////
                          GETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @return Returns the address of the ExponentialBondingCurve proxy contract.
    function getNFTCurveProxyAddress() external view returns (address) {
        return address(i_nftCurve);
    }

    /// @return Returns the current reserve balance of the contract.
    function getReserveBalance() external view returns (uint256) {
        return membershipReserveBalance;
    }

    /// @return Returns the current supply of tokens.
    function getCurrentSupply() external view returns (uint256) {
        return currentSupply;
    }

    /// @return Returns next token ID to be minted.
    function getNextTokenId() external view returns (uint256) {
        return nextTokenId;
    }

    /*///////////////////////////////////////////////////////////////
                             OVERRIDES
    ///////////////////////////////////////////////////////////////*/

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
