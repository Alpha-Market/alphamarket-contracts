import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CampaignsModule = buildModule("CampaignsModule", (m) => {
  const protocolFee = 0;
  const protocol = "0x3ef270a74CaAe5Ca4b740a66497085abBf236655";

  // 1. Update the contract name.
  const campaigns = m.contract("GroupCampaigns", [protocolFee, protocol]);

  return { campaigns };
});

export default CampaignsModule;
