export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Mythic' | 'Legendary';

export interface CryptoType {
  type: string;
  rarity: Rarity;
  color: string;
  chance: number;
}

export const CRYPTOS: CryptoType[] = [
  // Common (Total 0.5 -> 0.25 each)
  { type: 'Dogecoin', rarity: 'Common', color: 'text-slate-400', chance: 0.250000 },
  { type: 'Shiba Inu', rarity: 'Common', color: 'text-slate-400', chance: 0.250000 },
  
  // Uncommon (Total 0.3 -> 0.15 each)
  { type: 'Litecoin', rarity: 'Uncommon', color: 'text-emerald-400', chance: 0.150000 },
  { type: 'Cardano', rarity: 'Uncommon', color: 'text-emerald-400', chance: 0.150000 },
  
  // Rare (Total 0.14 -> 0.07 each)
  { type: 'Ethereum', rarity: 'Rare', color: 'text-blue-400', chance: 0.070000 },
  { type: 'Solana', rarity: 'Rare', color: 'text-blue-400', chance: 0.070000 },
  
  // Epic (Total 0.04 -> 0.02 each)
  { type: 'Polkadot', rarity: 'Epic', color: 'text-purple-500', chance: 0.020000 },
  { type: 'Avalanche', rarity: 'Epic', color: 'text-purple-500', chance: 0.020000 },

  // Mythic (Total 0.015 -> 0.0075 each)
  { type: 'Monero', rarity: 'Mythic', color: 'text-pink-500', chance: 0.007500 },
  { type: 'Cosmos', rarity: 'Mythic', color: 'text-pink-500', chance: 0.007500 },

  // Legendary (Total 0.005 -> 0.0025 each)
  { type: 'Bitcoin', rarity: 'Legendary', color: 'text-yellow-400', chance: 0.002500 },
  { type: 'Binance Coin', rarity: 'Legendary', color: 'text-yellow-400', chance: 0.002500 },

  // Exchange/Special Items (Chance 0)
  { type: 'Legendary Bear', rarity: 'Legendary', color: 'text-yellow-400', chance: 0 },
  { type: 'Mythic Dragon', rarity: 'Mythic', color: 'text-pink-500', chance: 0 },
  { type: 'Epic Phoenix', rarity: 'Epic', color: 'text-purple-500', chance: 0 },
  { type: 'Rare Diamond', rarity: 'Rare', color: 'text-blue-400', chance: 0 },
  { type: 'Doge Statue', rarity: 'Common', color: 'text-slate-400', chance: 0 },
  { type: 'Shiba Plush', rarity: 'Common', color: 'text-slate-400', chance: 0 },
  { type: 'Lite Trophy', rarity: 'Uncommon', color: 'text-emerald-400', chance: 0 },
  { type: 'Carda Medal', rarity: 'Uncommon', color: 'text-emerald-400', chance: 0 },
  { type: 'Ether Crystal', rarity: 'Rare', color: 'text-blue-400', chance: 0 },
  { type: 'Sola Orb', rarity: 'Rare', color: 'text-blue-400', chance: 0 },
  { type: 'Bit Crown', rarity: 'Legendary', color: 'text-yellow-400', chance: 0 },
];

export interface User {
  id: string;
  username: string;
  bio: string;
  balance: number;
  badge?: string;
  is_admin?: number;
}

export interface InventoryItem {
  id: number;
  user_id: string;
  crypto_type: string;
  rarity: Rarity;
  is_listed: number;
  acquired_at: string;
}

export interface MarketplaceListing {
  id: number;
  seller_id: string;
  seller_name: string;
  inventory_id: number;
  crypto_type: string;
  rarity: Rarity;
  price: number;
  created_at: string;
}
