interface curveConfig {
    owner: string;
    protocolFeePercent: string;
    feeSharePercent: string;
    initialReserve: string;
    reserveRatio: string;
    maxGasLimit: string;
}

export interface networkConfigInfo {
    [key: string]: curveConfig;
}
