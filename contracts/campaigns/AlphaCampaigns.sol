//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AlphaMarketBase} from "../alphamarket/AlphaMarketBase.sol";
import "../Utils.sol";
import "./Errors.sol";

/// @title AlphaCampaigns
/// @author Dustin Stacy
/// This contract handles the sponsorships for group campaigns. Hosts can create, update, complete, and end campaigns.
/// Brands can request to sponsor a campaign. Hosts can accept or reject these requests.
/// Anyone can tip a campaign.
contract AlphaCampaigns {
    using Utils for uint256;

    /*///////////////////////////////////////////////////////////////
                             STRUCTS
    ///////////////////////////////////////////////////////////////*/

    /// @param deadline The deadline for the campaign.
    /// @param slotPrice The price per slot in the campaign.
    /// @param totalRaised The total raised funds for the campaign.
    /// @param host The address of the host creating the campaign.
    /// @param slotsAvailable The number of slots available in the campaign.
    struct Campaign {
        uint256 deadline;
        uint256 slotPrice;
        uint256 totalRaised;
        address host;
        uint32 slotsAvailable;
    }

    /*///////////////////////////////////////////////////////////////
                             STATE VARIABLES
    ///////////////////////////////////////////////////////////////*/

    /// Instance of the Alpha Market Base contract.
    /// @dev contains data to handle protocol fees.
    AlphaMarketBase private immutable i_alphaMarketBase;

    /*///////////////////////////////////////////////////////////////
                                MAPPINGS
    ///////////////////////////////////////////////////////////////*/

    /// A mapping of campaigns by ID.
    mapping(uint256 campaignId => Campaign) private campaignById;

    /// A mapping of pending sponsors and their acceptance status by campaign.
    mapping(uint256 campaignId => mapping(address sponsor => bool accepted)) private pendingSponsors;

    /// A mapping of sponsor funds pending acceptance by a campaign host.
    mapping(uint256 campaignId => mapping(address sponsor => uint256 pendingFunds)) private sponsorPendingFunds;

    /// A mapping of sponsors by campaign.
    mapping(uint256 campaignId => address[] sponsors) private sponsors;

    /*///////////////////////////////////////////////////////////////
                                EVENTS
    ///////////////////////////////////////////////////////////////*/

    /// @dev consider which parameters to index.

    /// Event to log the creation of a new campaign.
    event CampaignCreated(
        uint256 indexed campaignId, address indexed host, uint256 deadline, uint256 slotPrice, uint32 slotsAvailable
    );

    /// Event to log the update of a campaign.
    event CampaignUpdated(uint256 indexed campaignId, uint256 deadline, uint256 slotPrice, uint32 slotsAvailable);

    /// Event to log the completion of a campaign.
    event CampaignCompleted(uint256 indexed campaignId, uint256 totalRaised);

    /// Event to log the end of a campaign.
    event CampaignEnded(uint256 indexed campaignId);

    /// Event to log a sponsor request.
    event SponsorRequested(uint256 indexed campaignId, address indexed sponsor, uint256 amount);

    /// Event to log a sponsor rejection.
    event SponsorRejected(uint256 indexed campaignId, address sponsor);

    /// Event to log a sponsor acceptance.
    event SponsorAccepted(uint256 indexed campaignId, address sponsor);

    /// Event to log a sponsor withdrawal.
    event SponsorWithdrawn(uint256 indexed campaignId, address sponsor);

    /// Event to log a campaign tip.
    event CampaignTipped(uint256 indexed campaignId, address indexed fan, uint256 amount);

    /*////////////////////////////////////////////////////////////////
                            MODIFIERS  
    ///////////////////////////////////////////////////////////////*/

    /// Modifier to check if sender is the host.
    modifier onlyHost(uint256 campaignId) {
        if (campaignById[campaignId].host != msg.sender) {
            revert AlphaCampaigns__OnlyHost();
        }
        _;
    }

    /*///////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    ///////////////////////////////////////////////////////////////*/

    /// Initializes the Group Campaigns contract.
    /// @param _alphaMarketBase The address of the Alpha Market Base contract.
    constructor(address _alphaMarketBase) {
        i_alphaMarketBase = AlphaMarketBase(_alphaMarketBase);
    }

    /*///////////////////////////////////////////////////////////////
                          EXTERNAL FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// Creates a new campaign.
    /// @param host The address of the host creating the campaign.
    /// @param deadline The deadline for the campaign.
    /// @param slotsAvailable The number of slots available in the campaign.
    /// @param slotPrice The price per slot in the campaign.
    function createCampaign(uint256 deadline, uint256 slotPrice, address host, uint32 slotsAvailable) external {
        if (deadline == 0 || slotPrice == 0 || host == address(0) || slotsAvailable == 0) {
            revert AlphaCampaigns__CampaignValuesCannotBeZero();
        }
        Campaign memory newCampaign = Campaign(deadline, slotPrice, 0, host, slotsAvailable);

        /// Hash the campaign data to create a unique campaign ID.
        /// @dev check for clashing campaign IDs?
        uint256 campaignId = generateCampaignId(newCampaign);
        campaignById[campaignId] = newCampaign;

        emit CampaignCreated(campaignId, host, deadline, slotPrice, slotsAvailable);
    }

    /// Allows a host to update a campaign.
    /// @param campaignId The ID of the campaign.
    /// @param deadline The deadline for the campaign.
    /// @param slotPrice The price per slot in the campaign.
    /// @param slotsAvailable The number of slots available in the campaign.
    function updateCampaign(uint256 campaignId, uint256 deadline, uint256 slotPrice, uint32 slotsAvailable)
        external
        onlyHost(campaignId)
    {
        Campaign storage campaign = campaignById[campaignId];
        if (campaign.deadline == 0) {
            revert AlphaCampaigns__CampaignOver();
        } else if (campaign.totalRaised != 0) {
            revert AlphaCampaigns__FundingExists();
        }
        if (deadline == 0 || slotPrice == 0 || slotsAvailable == 0) {
            revert AlphaCampaigns__CampaignValuesCannotBeZero();
        }
        campaign.deadline = deadline;
        campaign.slotsAvailable = slotsAvailable;
        campaign.slotPrice = slotPrice;

        emit CampaignUpdated(campaignId, deadline, slotPrice, slotsAvailable);
    }

    /// Allows a brand to request to sponsor a campaign.
    /// @param campaignId The ID of the campaign.
    /// @param sponsor The address of the sponsor.
    function requestToSponsor(uint256 campaignId, address sponsor) external payable {
        Campaign storage campaign = campaignById[campaignId];
        if (campaign.slotsAvailable == 0) {
            revert AlphaCampaigns__NoSlotsAvailable();
        }
        if (msg.value < campaign.slotPrice) {
            revert AlphaCampaigns__NotEnoughFundsToSponsor();
        }
        if (block.timestamp > campaign.deadline) {
            revert AlphaCampaigns__CampaignOver();
        }
        pendingSponsors[campaignId][sponsor] = true;
        sponsorPendingFunds[campaignId][sponsor] += msg.value;

        emit SponsorRequested(campaignId, sponsor, msg.value);
    }

    /// Allows a group host to reject a sponsor for a campaign.
    /// @param campaignId The ID of the campaign.
    /// @param sponsor The address of the sponsor.
    function rejectSponsor(uint256 campaignId, address sponsor) external {
        _setSponsorPendingStatus(campaignId, sponsor, false);

        emit SponsorRejected(campaignId, sponsor);
    }

    /// Allows a group host to accept a sponsor for a campaign.
    /// @param campaignId The ID of the campaign.
    /// @param sponsor The address of the sponsor.
    function acceptSponsor(uint256 campaignId, address sponsor) external {
        Campaign storage campaign = campaignById[campaignId];
        _setSponsorPendingStatus(campaignId, sponsor, false);
        campaign.totalRaised += campaign.slotPrice;
        campaign.slotsAvailable--;
        sponsorPendingFunds[campaignId][sponsor] -= campaign.slotPrice;
        sponsors[campaignId].push(sponsor);

        emit SponsorAccepted(campaignId, sponsor);
    }

    /// Allows a user to tip a campaign.
    /// @param campaignId The ID of the campaign.
    function tipCampaign(uint256 campaignId) external payable {
        if (block.timestamp > campaignById[campaignId].deadline) {
            revert AlphaCampaigns__CampaignOver();
        }
        campaignById[campaignId].totalRaised += msg.value;

        emit CampaignTipped(campaignId, msg.sender, msg.value);
    }

    /// Allows a host to end a campaign prior to completion.
    /// @param campaignId The ID of the campaign.
    function endCampaign(uint256 campaignId) external onlyHost(campaignId) {
        Campaign storage campaign = campaignById[campaignId];

        for (uint256 i = 0; i < sponsors[campaignId].length; i++) {
            address sponsor = sponsors[campaignId][i];
            sponsorPendingFunds[campaignId][sponsor] = campaign.slotPrice;
            campaign.totalRaised -= campaign.slotPrice;
        }

        campaign.deadline = 0;
        campaign.slotsAvailable = 0;

        emit CampaignEnded(campaignId);
    }

    /// Allows a host to complete a campaign.
    /// @param campaignId The ID of the campaign.
    function completeCampaign(uint256 campaignId) external onlyHost(campaignId) {
        Campaign storage campaign = campaignById[campaignId];
        if (block.timestamp < campaign.deadline) {
            revert AlphaCampaigns__CampaignNotOver();
        }
        campaign.deadline = 0;
        campaign.slotsAvailable = 0;

        emit CampaignCompleted(campaignId, campaign.totalRaised);
    }

    /// Allows a host to withdraw their funds from a campaign.
    /// @param campaignId The ID of the campaign.
    function withdrawFunds(uint256 campaignId) external onlyHost(campaignId) {
        Campaign storage campaign = campaignById[campaignId];
        if (block.timestamp < campaign.deadline) {
            revert AlphaCampaigns__CampaignNotOver();
        }
        if (campaign.totalRaised == 0) {
            revert AlphaCampaigns__NoFundsToWithdraw();
        }
        uint256 protocolFeePercent = i_alphaMarketBase.getProtocolFeePercent();
        uint256 totalRaised = campaign.totalRaised;
        uint256 protocolFee = totalRaised.calculateBasisPointsPercentage(protocolFeePercent);
        uint256 funds = totalRaised - protocolFee;

        campaign.totalRaised = 0;

        address protocolFeeDestination = i_alphaMarketBase.getProtocolFeeDestination();
        (bool protocolFeeSuccess,) = protocolFeeDestination.call{value: protocolFee}("");
        if (!protocolFeeSuccess) {
            revert AlphaCampaigns__ProtocolFeeTransferFailed();
        }

        address host = campaign.host;
        (bool success,) = host.call{value: funds}("");
        if (!success) {
            revert AlphaCampaigns__HostFundsTransferFailed();
        }
    }

    /// Allows a sponsor to withdraw their funds from a campaign.
    /// @param campaignId The ID of the campaign.
    function withdrawSponsorFunds(uint256 campaignId) external {
        address sponsor = msg.sender;
        if (sponsor == address(0)) {
            revert AlphaCampaigns__AddressCannotBeZero();
        }
        if (sponsorPendingFunds[campaignId][sponsor] == 0) {
            revert AlphaCampaigns__NoFundsToWithdraw();
        }
        _setSponsorPendingStatus(campaignId, sponsor, false);

        uint256 funds = sponsorPendingFunds[campaignId][sponsor];
        sponsorPendingFunds[campaignId][sponsor] = 0;

        (bool success,) = sponsor.call{value: funds}("");
        if (!success) {
            revert AlphaCampaigns__SponsorFundsTransferFailed();
        }

        emit SponsorWithdrawn(campaignId, sponsor);
    }

    /*///////////////////////////////////////////////////////////////
                          PUBLIC FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    function generateCampaignId(Campaign memory campaign) public view returns (uint256) {
        uint256 campaignId = _generateCampaignId(campaign);

        // Recursive check if the ID already exists
        while (campaignById[campaignId].host != address(0)) {
            // Add salt if the ID already exists
            uint256 salt = uint256(keccak256(abi.encodePacked(campaignId, block.timestamp, block.prevrandao)));
            campaignId = uint256(keccak256(abi.encodePacked(campaignId, salt)));
        }

        return campaignId;
    }

    /*///////////////////////////////////////////////////////////////
                          INTERNAL FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    function _setSponsorPendingStatus(uint256 campaignId, address sponsor, bool pendingStatus) internal {
        if (!pendingSponsors[campaignId][sponsor]) {
            revert AlphaCampaigns__SponsorDoesNotExist();
        }
        pendingSponsors[campaignId][sponsor] = pendingStatus;
    }

    function _generateCampaignId(Campaign memory campaign) internal pure returns (uint256) {
        bytes32 campaignHash = keccak256(abi.encode(campaign));
        uint256 campaignId = uint256(campaignHash);

        return campaignId;
    }

    /*///////////////////////////////////////////////////////////////
                          GETTER FUNCTIONS
    ///////////////////////////////////////////////////////////////*/

    /// @return Gets the Alpha Market Base contract address.
    function getAlphaMarketBaseAddress() public view returns (address) {
        address alphaMarketBaseAddress = address(i_alphaMarketBase);
        return alphaMarketBaseAddress;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Gets a campaign by its ID.
    function getCampaignById(uint256 campaignId) public view returns (Campaign memory) {
        return campaignById[campaignId];
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the deadline for a campaign.
    function getCampaignDeadline(uint256 campaignId) public view returns (uint256) {
        return campaignById[campaignId].deadline;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the slot price for a campaign.
    function getCampaignSlotPrice(uint256 campaignId) public view returns (uint256) {
        return campaignById[campaignId].slotPrice;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the total raised funds for a campaign.
    function getCampaignTotalRaised(uint256 campaignId) public view returns (uint256) {
        return campaignById[campaignId].totalRaised;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the host of a campaign.
    function getCampaignHost(uint256 campaignId) public view returns (address) {
        return campaignById[campaignId].host;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the slots available for a campaign.
    function getCampaignSlotsAvailable(uint256 campaignId) public view returns (uint32) {
        return campaignById[campaignId].slotsAvailable;
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the pending sponsors for a campaign.
    function getPendingSponsorStatus(uint256 campaignId, address sponsor) public view returns (bool) {
        return pendingSponsors[campaignId][sponsor];
    }

    /// @param sponsor The address of the sponsor.
    /// @return Get the pending funds for a sponsor.
    function getSponsorPendingFunds(uint256 campaignId, address sponsor) public view returns (uint256) {
        return sponsorPendingFunds[campaignId][sponsor];
    }

    /// @param campaignId The ID of the campaign.
    /// @return Get the sponsors for a campaign.
    function getCampaignSponsors(uint256 campaignId) public view returns (address[] memory) {
        return sponsors[campaignId];
    }
}
