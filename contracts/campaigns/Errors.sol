///SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

// Error thrown when function caller is not the host of the campaign.
error AlphaCampaigns__OnlyHost();

// Error thrown when address is zero.
error AlphaCampaigns__AddressCannotBeZero();

// Error thrown when a campaign value is initialized to zero.
error AlphaCampaigns__CampaignValuesCannotBeZero();

// Error thrown when a campaign is over.
error AlphaCampaigns__CampaignOver();

// Error thrown when a campaign is not over.
error AlphaCampaigns__CampaignNotOver();

// Error thrown when a campaign already has accepted funding.
error AlphaCampaigns__FundingExists();

// Error thrown when there are no slots available for a campaign.
error AlphaCampaigns__NoSlotsAvailable();

// Error thrown when a sponsor does not send enough funds to sponsor a campaign.
error AlphaCampaigns__NotEnoughFundsToSponsor();

// Error thrown when a sponsor does not exist.
error AlphaCampaigns__SponsorDoesNotExist();

// Error thrown when there are no funds to withdraw.
error AlphaCampaigns__NoFundsToWithdraw();

// Error thrown when a protocl fee transfer fails.
error AlphaCampaigns__ProtocolFeeTransferFailed();

// Error thrown when a host funds transfer fails.
error AlphaCampaigns__HostFundsTransferFailed();

// Error thrown when a sponsor funds transfer fails.
error AlphaCampaigns__SponsorFundsTransferFailed();
