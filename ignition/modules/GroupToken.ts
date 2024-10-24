import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { network } from "hardhat";
import { curveConfig } from "../../helper-hardhat.config";

const GroupTokenModule = buildModule("GroupTokenModule", (m) => {
    const name = 'Test';
    const symbol = 'TEST';
    const bcAddress = "0x2D886074B5D6Aa6C824Dc830e525096c6ebc59d9";
    const hostAddress = "0x3ef270a74CaAe5Ca4b740a66497085abBf236655";
    const { initialReserve } = curveConfig[network.name];

   const groupToken = m.contract("GroupToken", [name, symbol, bcAddress, hostAddress], {value: BigInt(initialReserve)});

  return { groupToken };
});

export default GroupTokenModule;
