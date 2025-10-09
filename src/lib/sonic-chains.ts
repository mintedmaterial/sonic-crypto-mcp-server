// Sonic blockchain chain definitions for Web3 integration
// Source: https://docs.soniclabs.com/sonic/build-on-sonic/network-parameters

export interface SonicChain {
  id: number;
  name: string;
  nativeCurrency: {
    decimals: number;
    name: string;
    symbol: string;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet: boolean;
}

// Sonic Mainnet (Chain ID 146)
// https://docs.soniclabs.com/sonic/build-on-sonic/network-parameters
export const SONIC_MAINNET: SonicChain = {
  id: 146,
  name: 'Sonic',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SonicScan',
      url: 'https://sonicscan.org',
    },
  },
  testnet: false,
};

// Sonic Testnet (Chain ID 14601)
// https://docs.soniclabs.com/sonic/build-on-sonic/getting-started
export const SONIC_TESTNET: SonicChain = {
  id: 14601,
  name: 'Sonic Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.testnet.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SonicScan Testnet',
      url: 'https://testnet.sonicscan.org',
    },
  },
  testnet: true,
};

// Blaze Testnet (Chain ID 57054) - Legacy testnet
export const SONIC_BLAZE_TESTNET: SonicChain = {
  id: 57054,
  name: 'Sonic Blaze Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic',
    symbol: 'S',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.blaze.soniclabs.com'],
    },
    public: {
      http: ['https://rpc.blaze.soniclabs.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'SonicScan Blaze',
      url: 'https://testnet.sonicscan.org',
    },
  },
  testnet: true,
};

// Token addresses on Sonic Networks
// Source: https://docs.soniclabs.com/sonic/build-on-sonic/contract-addresses
export const SONIC_TOKENS = {
  mainnet: {
    WRAPPED_SONIC: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // wS
    USDC: '0x29219dd400f2Bf60E5a23d13Be72B486D4038894', // Native USDC
    WETH: '0x50c42dEAcD8Fc9773493ED674b675bE577f2634b', // Wrapped Ether
    USDT: '0x6047828dc181963ba44974801ff68e538da5eaf9', // Bridged USDT
    EURC: '0xe715cba7b5ccb33790cebff1436809d36cb17e57', // Bridged EURC
    BANDIT_KIDZ_NFT: '0x45bc8a938e487fde4f31a7e051c2b63627f6f966', // Bandit Kidz Collection
  },
  testnet: {
    WRAPPED_SONIC: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // wS
    USDC: '0x391071Fe567d609E4af9d32de726d4C33679C7e2', // Sonic Testnet USDC
    BANDIT_KIDZ_NFT: '0x45bc8a938e487fde4f31a7e051c2b63627f6f966',
  },
  blaze: {
    WRAPPED_SONIC: '0x039e2fB66102314Ce7b64Ce5Ce3E5183bc94aD38', // wS
    USDC: '0xA4879Fed32Ecbef99399e5cbC247E533421C4eC6', // Blaze Testnet USDC
    BANDIT_KIDZ_NFT: '0x45bc8a938e487fde4f31a7e051c2b63627f6f966',
  },
} as const;

// Get dRPC URL with API key
export function getDRPCUrl(env: { DRPC_HTTP_URL: string; DRPC_API_KEY: string }): string {
  return `${env.DRPC_HTTP_URL}${env.DRPC_API_KEY}`;
}

// Helper to get chain by ID
export function getChainById(chainId: number): SonicChain | null {
  if (chainId === 146) return SONIC_MAINNET;
  if (chainId === 14601) return SONIC_TESTNET;
  if (chainId === 57054) return SONIC_BLAZE_TESTNET;
  return null;
}

// Helper to check if chain ID is Sonic
export function isSonicChain(chainId: number): boolean {
  return chainId === 146 || chainId === 14601 || chainId === 57054;
}

// Helper to get token addresses for a chain
export function getTokenAddresses(chainId: number) {
  if (chainId === 146) return SONIC_TOKENS.mainnet;
  if (chainId === 14601) return SONIC_TOKENS.testnet;
  if (chainId === 57054) return SONIC_TOKENS.blaze;
  return null;
}
