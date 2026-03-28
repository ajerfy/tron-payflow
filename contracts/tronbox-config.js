module.exports = {
  networks: {
    nile: {
      privateKey: process.env.PRIVATE_KEY_NILE,
      userFeePercentage: 100,
      feeLimit: 5_000 * 1e6,
      fullHost: "https://nile.trongrid.io",
      network_id: "3"
    },
    development: {
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
      userFeePercentage: 0,
      feeLimit: 1_000 * 1e6,
      fullHost: "http://127.0.0.1:9090",
      network_id: "9"
    }
  },
  compilers: {
    solc: {
      version: "0.8.24",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    }
  }
};
