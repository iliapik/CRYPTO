/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Coins, 
  Package, 
  ShoppingCart, 
  Brain, 
  Wallet, 
  TrendingUp, 
  Plus, 
  Minus, 
  X, 
  ChevronRight,
  History,
  LogOut,
  User as UserIcon,
  Search,
  RefreshCcw,
  ArrowUp,
  Sparkles,
  Settings,
  Trash2,
  UserPlus,
  Gift,
  BadgeCheck,
  Gem,
  Crown,
  Star,
  Flame,
  Bird,
  Copy
} from 'lucide-react';
import { CRYPTOS, User, InventoryItem, MarketplaceListing, CryptoType } from './types';

const CASE_COST = 50;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceListing[]>([]);
  const [activeTab, setActiveTab] = useState<'math' | 'shop' | 'inventory' | 'market'>('math');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [showDrops, setShowDrops] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<{ totalUsers: number, activeListings: number, totalInventoryItems: number, economyVolume: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [friendIdInput, setFriendIdInput] = useState('');
  const [giftTarget, setGiftTarget] = useState<string | null>(null);
  const [devCode, setDevCode] = useState('');
  
  const isCreator = user?.is_admin === 1;
  
  // Math State
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', ans: 0 });
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  // Shop State
  const [isOpening, setIsOpening] = useState(false);
  const [lastReward, setLastReward] = useState<CryptoType | null>(null);

  // Market State
  const [listingPrice, setListingPrice] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [marketNotification, setMarketNotification] = useState(false);

  // Upgrade State
  const [upgradeSelection, setUpgradeSelection] = useState<number[]>([]);
  const [targetRarity, setTargetRarity] = useState<'Uncommon' | 'Rare' | 'Legendary'>('Uncommon');
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeResult, setUpgradeResult] = useState<{ success: boolean, chance: number } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);

  const getRarityLabel = (rarity: string) => {
    const labels: Record<string, string> = {
      'Common': 'Обычный',
      'Uncommon': 'Необычный',
      'Rare': 'Редкий',
      'Epic': 'Эпический',
      'Mythic': 'Мифический',
      'Legendary': 'Легендарный'
    };
    return labels[rarity] || rarity;
  };

  const getBadgeIcon = (badge: string | undefined, size: string = "w-3 h-3") => {
    if (!badge) return null;
    switch (badge) {
      case 'Diamond': return <Gem className={`${size} text-cyan-400`} />;
      case 'Crown': return <Crown className={`${size} text-yellow-400`} />;
      case 'Star': return <Star className={`${size} text-blue-400`} />;
      case 'Dragon': return <Flame className={`${size} text-pink-500`} />;
      case 'Phoenix': return <Bird className={`${size} text-purple-500`} />;
      default: return <BadgeCheck className={`${size} text-blue-500`} />;
    }
  };

  const getBadgeLabel = (badge: string | undefined) => {
    if (!badge) return null;
    const labels: Record<string, string> = {
      'Diamond': 'Алмаз',
      'Crown': 'Корона',
      'Star': 'Звезда',
      'Dragon': 'Дракон',
      'Phoenix': 'Феникс'
    };
    return labels[badge] || badge;
  };

  const safeJson = useCallback(async (res: Response) => {
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        return await res.json();
      } catch (e) {
        console.error('JSON parse error:', e);
        return null;
      }
    }
    return null;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/user/${userId}`);
      const data = await safeJson(res);
      if (data && data.user) {
        setUser(data.user);
        setInventory(data.inventory || []);
      }
    } catch (e) {
      console.error('Fetch user data error:', e);
    }
  }, [safeJson]);

  const fetchMarketplace = useCallback(async () => {
    try {
      const res = await fetch('/api/marketplace');
      const data = await safeJson(res);
      if (data) {
        setMarketplace(data);
        setMarketNotification(true);
        setTimeout(() => setMarketNotification(false), 3000);
      }
    } catch (e) {
      console.error('Fetch marketplace error:', e);
    }
  }, [safeJson]);

  const handleLogout = () => {
    localStorage.removeItem('crypto_math_user_id');
    localStorage.removeItem('crypto_math_username');
    setUser(null);
    setInventory([]);
    setUsername('');
    setPassword('');
  };

  useEffect(() => {
    const storedId = localStorage.getItem('crypto_math_user_id');
    if (storedId) {
      fetchUserData(storedId);
    }
    fetchMarketplace();

    let socket: WebSocket;
    let reconnectTimeout: number;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MARKET_UPDATE') {
            fetchMarketplace();
          }
        } catch (e) {
          console.error('WS message error:', e);
        }
      };

      socket.onclose = () => {
        console.log('WS closed, reconnecting...');
        reconnectTimeout = window.setTimeout(connectWebSocket, 3000);
      };

      socket.onerror = (err) => {
        console.error('WS error:', err);
        socket.close();
      };
    };

    connectWebSocket();

    return () => {
      if (socket) socket.close();
      clearTimeout(reconnectTimeout);
    };
  }, [fetchUserData, fetchMarketplace]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      const data = await safeJson(res);
      if (data) setStats(data);
    } catch (e) {
      console.error('Stats error:', e);
    }
  };

  const cleanupUsers = async () => {
    setFeedback({ type: 'error', msg: 'Функция удаления отключена' });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    if (showStats) fetchStats();
  }, [showStats]);

  useEffect(() => {
    if (showFriends) fetchFriends();
  }, [showFriends]);

  const handleUpgrade = async () => {
    if (!user || upgradeSelection.length === 0 || isUpgrading) return;
    
    setIsUpgrading(true);
    setUpgradeResult(null);

    // Simulate "roulette" delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    try {
      const res = await fetch('/api/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id, 
          itemIds: upgradeSelection, 
          targetRarity 
        })
      });
      const data = await safeJson(res);
      if (data && data.inventory) {
        setInventory(data.inventory);
        setUpgradeResult({ success: data.success, chance: data.chance });
        setUpgradeSelection([]);
        if (data.success) {
          setFeedback({ type: 'success', msg: 'Апгрейд успешен!' });
        } else {
          setFeedback({ type: 'error', msg: 'Апгрейд не удался. Предметы потеряны.' });
        }
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Upgrade error:', e);
    } finally {
      setIsUpgrading(false);
      setTimeout(() => {
        setFeedback(null);
        setUpgradeResult(null);
      }, 3000);
    }
  };

  const toggleUpgradeItem = (id: number) => {
    setUpgradeSelection(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const calculateUpgradeChance = () => {
    const rarityValues: Record<string, number> = {
      'Common': 1,
      'Uncommon': 4,
      'Rare': 16,
      'Epic': 64,
      'Mythic': 256,
      'Legendary': 1024
    };
    const selectedItems = inventory.filter(i => upgradeSelection.includes(i.id));
    const totalValue = selectedItems.reduce((sum, item) => sum + (rarityValues[item.rarity] || 0), 0);
    const targetValue = rarityValues[targetRarity] || 1;
    return Math.min(100, (totalValue / targetValue) * 100);
  };

  const handleDevCode = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/admin/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code: devCode })
      });
      const data = await safeJson(res);
      if (data?.success) {
        setUser(data.user);
        setFeedback({ type: 'success', msg: 'Режим разработчика разблокирован навсегда!' });
        setShowSettings(false);
      } else {
        setFeedback({ type: 'error', msg: 'Неверный код' });
      }
    } catch (e) {
      console.error('Admin unlock error:', e);
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const fetchFriends = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/friends/${user.id}`);
      const data = await safeJson(res);
      if (data) setFriends(data);
    } catch (e) {
      console.error('Friends error:', e);
    }
  };

  const addFriend = async () => {
    if (!user || !friendIdInput) return;
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, friendId: friendIdInput })
      });
      const data = await safeJson(res);
      if (data?.success) {
        setFeedback({ type: 'success', msg: 'Друг добавлен!' });
        setFriendIdInput('');
        fetchFriends();
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Add friend error:', e);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const sendGift = async (itemId: number) => {
    if (!user || !giftTarget) return;
    try {
      const res = await fetch('/api/friends/gift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromId: user.id, toId: giftTarget, inventoryId: itemId })
      });
      const data = await safeJson(res);
      if (data?.success) {
        setFeedback({ type: 'success', msg: 'Подарок отправлен!' });
        setGiftTarget(null);
        fetchUserData(user.id);
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Gift error:', e);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const exchangeBadge = async (badgeType: string, itemIds: number[]) => {
    if (!user) return;
    try {
      const res = await fetch('/api/exchange/badge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, itemIds, badgeType })
      });
      const data = await safeJson(res);
      if (data?.success) {
        setUser(data.user);
        setFeedback({ type: 'success', msg: 'Значок получен!' });
        fetchUserData(user.id);
        setShowExchange(false);
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Exchange error:', e);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleLogin = async (name: string, pass: string) => {
    if (name.length < 4 || pass.length < 4) {
      setFeedback({ type: 'error', msg: 'Логин и пароль должны быть не менее 4 символов' });
      return;
    }
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, password: pass })
      });
      const data = await safeJson(res);
      if (data && !data.error) {
        setUser(data);
        localStorage.setItem('crypto_math_user_id', data.id);
        localStorage.setItem('crypto_math_username', name);
        fetchUserData(data.id);
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Login error:', e);
    }
  };

  const handleRegister = async (name: string, pass: string, userBio: string) => {
    if (name.length < 4 || pass.length < 4) {
      setFeedback({ type: 'error', msg: 'Логин и пароль должны быть не менее 4 символов' });
      return;
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: name, password: pass, bio: userBio })
      });
      const data = await safeJson(res);
      if (data && !data.error) {
        setUser(data);
        localStorage.setItem('crypto_math_user_id', data.id);
        localStorage.setItem('crypto_math_username', name);
        fetchUserData(data.id);
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Register error:', e);
    }
  };

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a, b, ans;
    if (op === '*') {
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      ans = a * b;
    } else {
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      ans = op === '+' ? a + b : a - b;
    }
    setProblem({ a, b, op, ans });
    setAnswer('');
  }, []);

  useEffect(() => {
    if (activeTab === 'math') generateProblem();
  }, [activeTab, generateProblem]);

  const checkAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(answer) === problem.ans) {
      const reward = problem.op === '*' ? 15 : 10;
      try {
        const res = await fetch('/api/reward', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, amount: reward })
        });
        const updatedUser = await safeJson(res);
        if (updatedUser && !updatedUser.error) {
          setUser(updatedUser);
        }
      } catch (e) {
        console.error('Reward error:', e);
      }
      setFeedback({ type: 'success', msg: `Верно! +$${reward}` });
      generateProblem();
    } else {
      setFeedback({ type: 'error', msg: 'Неверно, попробуй еще раз!' });
    }
    setTimeout(() => setFeedback(null), 2000);
  };

  const openCase = async () => {
    if (!user || (!isCreator && user.balance < CASE_COST)) return;

    setIsOpening(true);
    setLastReward(null);

    // Simulate opening animation
    await new Promise(r => setTimeout(r, 1500));

    // Determine crypto based on chances
    const rand = Math.random();
    let cumulative = 0;
    let selected = CRYPTOS[0];
    for (const c of CRYPTOS) {
      cumulative += c.chance;
      if (rand < cumulative) {
        selected = c;
        break;
      }
    }

    const res = await fetch('/api/open-case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, cost: isCreator ? 0 : CASE_COST, crypto: selected })
    });
    
    const data = await safeJson(res);
    if (data && !data.error) {
      setUser(data.user);
      setInventory(prev => [...prev, data.item]);
      setLastReward(selected);
    }
    setIsOpening(false);
  };

  const exchangeItems = async (rarity?: 'Rare' | 'Legendary', cryptoType?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, rarity, cryptoType })
      });
      const data = await safeJson(res);
      if (data && data.success) {
        setInventory(data.inventory);
        setFeedback({ type: 'success', msg: 'Обмен прошел успешно!' });
      } else if (data?.error) {
        setFeedback({ type: 'error', msg: data.error });
      }
    } catch (e) {
      console.error('Exchange error:', e);
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const listOnMarket = async () => {
    if (!user || !selectedItem || !listingPrice) return;
    const price = parseInt(listingPrice);
    if (isNaN(price) || price <= 0) return;

    const res = await fetch('/api/marketplace/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, inventoryId: selectedItem.id, price })
    });

    const data = await safeJson(res);
    if (data && data.error) {
      alert(data.error);
    } else {
      setSelectedItem(null);
      setListingPrice('');
      fetchUserData(user.id);
    }
  };

  const cancelListing = async (inventoryId: number) => {
    if (!user) return;
    await fetch('/api/marketplace/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, inventoryId })
    });
    fetchUserData(user.id);
  };

  const buyFromMarket = async (listingId: number) => {
    if (!user) return;
    try {
      const listing = marketplace.find(l => l.id === listingId);
      if (!isCreator && listing && user.balance < listing.price) {
        setFeedback({ type: 'error', msg: 'Недостаточно средств' });
        setTimeout(() => setFeedback(null), 2000);
        return;
      }

      const res = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerId: user.id, listingId })
      });
      
      if (res.ok) {
        fetchUserData(user.id);
      } else {
        const err = await safeJson(res);
        if (err) alert(err.error || 'Purchase failed');
      }
    } catch (e) {
      console.error('Buy error:', e);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#141414] border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-emerald-500/10 rounded-2xl">
              <TrendingUp className="w-12 h-12 text-emerald-500" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">CryptoMath</h1>
          <p className="text-gray-400 text-center mb-8">
            {isRegistering ? 'Создайте аккаунт, чтобы начать.' : 'Войдите в свой аккаунт.'}
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Логин (мин. 4 симв.)</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Ваше имя..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            {isRegistering && (
              <div>
                <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">О себе</label>
                <textarea 
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Расскажите о себе..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors resize-none h-24"
                />
              </div>
            )}
            <div>
              <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Пароль (мин. 4 симв.)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ваш пароль..."
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button 
              onClick={() => isRegistering ? handleRegister(username, password, bio) : handleLogin(username, password)}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-xl transition-all transform active:scale-95"
            >
              {isRegistering ? 'Зарегистрироваться' : 'Войти'}
            </button>
            
            <div className="text-center">
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setFeedback(null);
                }}
                className="text-sm text-gray-500 hover:text-emerald-500 transition-colors"
              >
                {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
              </button>
            </div>

            {feedback && feedback.type === 'error' && (
              <p className="text-red-500 text-xs text-center">{feedback.msg}</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-md border-bottom border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">CryptoMath</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowFriends(true)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10 transition-colors text-sm font-bold"
            >
              <UserPlus className="w-4 h-4 text-blue-500" />
              <span className="hidden md:inline">Друзья</span>
            </button>

            <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span className="font-mono font-bold text-emerald-500">
                {isCreator ? '∞' : `$${user.balance}`}
              </span>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-blue-500"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-500 hover:text-red-500"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 group relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold text-xs relative">
                {user.username[0].toUpperCase()}
                {user.badge && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-lg border border-black/10">
                    {getBadgeIcon(user.badge, "w-3 h-3")}
                  </div>
                )}
                {isCreator && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-[#141414]" title="Developer" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium leading-none">{user.username}</span>
                  {user.badge && (
                    <span className="text-[8px] bg-yellow-500/20 text-yellow-600 px-1 rounded font-bold uppercase flex items-center gap-1">
                      {getBadgeIcon(user.badge, "w-2 h-2")}
                      {getBadgeLabel(user.badge)}
                    </span>
                  )}
                  {isCreator && (
                    <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter shadow-lg shadow-blue-500/20">Developer</span>
                  )}
                </div>
                {user.bio && <span className="text-[10px] text-gray-500 line-clamp-1 max-w-[100px]">{user.bio}</span>}
              </div>
              {user.bio && (
                <div className="absolute top-full right-0 mt-2 p-2 bg-[#141414] border border-white/10 rounded-lg text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 shadow-xl">
                  {user.bio}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'math' && (
            <motion.div 
              key="math"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-xl mx-auto"
            >
              <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 text-center shadow-xl">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-blue-500/10 rounded-2xl">
                    <Brain className="w-12 h-12 text-blue-500" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Решай и зарабатывай</h2>
                <p className="text-gray-400 mb-8">Получи ${problem.op === '*' ? '15' : '10'} за каждый верный ответ.</p>
                
                <div className="text-6xl font-mono font-bold mb-12 flex items-center justify-center gap-4">
                  <span>{problem.a}</span>
                  <span className="text-blue-500">
                    {problem.op === '+' && <Plus className="w-10 h-10" />}
                    {problem.op === '-' && <Minus className="w-10 h-10" />}
                    {problem.op === '*' && <X className="w-10 h-10" />}
                  </span>
                  <span>{problem.b}</span>
                </div>

                <form onSubmit={checkAnswer} className="space-y-4">
                  <input 
                    type="number"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    autoFocus
                    placeholder="?"
                    className="w-full bg-black/50 border-2 border-white/10 rounded-2xl px-6 py-4 text-3xl text-center font-mono focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button 
                    type="submit"
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-2xl transition-all transform active:scale-95"
                  >
                    Проверить ответ
                  </button>
                </form>

                {feedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-6 p-3 rounded-xl font-bold ${feedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}
                  >
                    {feedback.msg}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'shop' && (
            <motion.div 
              key="shop"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 text-center shadow-xl">
                  <div className="relative mb-8">
                    <motion.div 
                      animate={isOpening ? { rotate: [0, -5, 5, -5, 5, 0], scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 0.5, repeat: isOpening ? Infinity : 0 }}
                      className="flex justify-center"
                    >
                      <Package className={`w-32 h-32 ${isOpening ? 'text-yellow-500' : 'text-gray-500'}`} />
                    </motion.div>
                    <AnimatePresence>
                      {lastReward && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          className="absolute inset-0 flex flex-col items-center justify-center bg-[#141414]/90 rounded-2xl border border-white/10"
                        >
                          <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${lastReward.color}`}>{getRarityLabel(lastReward.rarity)}</span>
                          <span className="text-2xl font-bold">{lastReward.type}</span>
                          <button onClick={() => setLastReward(null)} className="mt-4 text-xs text-gray-500 underline">Открыть еще</button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">Кейс с криптой</h3>
                  <p className="text-gray-400 mb-6">Содержит случайную криптовалюту.</p>
                  
                  <button 
                    onClick={openCase}
                    disabled={isOpening || (!isCreator && user.balance < CASE_COST)}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                      isCreator || user.balance >= CASE_COST ? 'bg-yellow-500 text-black hover:bg-yellow-600' : 'bg-white/5 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isOpening ? 'Открытие...' : (
                      <>
                        <Coins className="w-5 h-5" />
                        {isCreator ? 'Открыть БЕСПЛАТНО' : `Открыть за $${CASE_COST}`}
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-xl flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
                    <RefreshCcw className="w-10 h-10 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Обмен на значки</h3>
                  <p className="text-gray-400 mb-8">Обменяй лишнюю крипту на уникальные значки профиля.</p>
                  
                  <button 
                    onClick={() => setShowExchange(true)}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-2xl text-lg transition-all shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
                  >
                    <BadgeCheck className="w-6 h-6" />
                    Открыть обмен
                  </button>
                </div>
              </div>

              <div className="mt-12 flex flex-col items-center gap-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  Возможный дроп
                </h4>

                <div className="w-full">
                  <div className="bg-[#141414] border border-white/10 rounded-2xl divide-y divide-white/5">
                    {CRYPTOS.filter(c => c.chance > 0).map(c => (
                      <div key={c.type} className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${c.color.replace('text', 'bg')}`} />
                          <span className="font-medium">{c.type}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded bg-white/5 ${c.color}`}>{getRarityLabel(c.rarity)}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{(c.chance * 100).toFixed(6)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'inventory' && (
            <motion.div 
              key="inventory"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Ваш инвентарь</h2>
                <div className="flex items-center gap-4">
                  {giftTarget && (
                    <button 
                      onClick={() => setGiftTarget(null)}
                      className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                    >
                      Отмена подарка
                    </button>
                  )}
                  <span className="text-gray-500 text-sm">{inventory.length} Предметов</span>
                </div>
              </div>

              {/* Upgrade Section */}
              <div className="mb-12 bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Sparkles className="w-32 h-32" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <ArrowUp className="w-6 h-6 text-blue-500" />
                    <h3 className="text-2xl font-bold">Апгрейд предметов</h3>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex flex-wrap gap-3">
                        {(['Uncommon', 'Rare', 'Epic', 'Mythic', 'Legendary'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => setTargetRarity(r)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                              targetRarity === r 
                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white/5 text-gray-500 hover:bg-white/10'
                            }`}
                          >
                            Цель: {getRarityLabel(r)}
                          </button>
                        ))}
                      </div>

                      <div className="p-6 bg-black/30 rounded-2xl border border-white/5 min-h-[120px] flex flex-wrap gap-3 items-center">
                        {upgradeSelection.length === 0 ? (
                          <p className="text-gray-500 text-sm w-full text-center italic">Выберите предметы из инвентаря ниже для апгрейда...</p>
                        ) : (
                          inventory.filter(i => upgradeSelection.includes(i.id)).map(item => (
                            <motion.div 
                              layoutId={`upgrade-${item.id}`}
                              key={item.id}
                              onClick={() => toggleUpgradeItem(item.id)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs font-bold cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
                            >
                              {item.crypto_type}
                            </motion.div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-black/50 p-6 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center space-y-6">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            className="text-white/5"
                          />
                          <motion.circle
                            cx="64"
                            cy="64"
                            r="58"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="transparent"
                            strokeDasharray="364.4"
                            animate={{ strokeDashoffset: 364.4 - (364.4 * calculateUpgradeChance()) / 100 }}
                            className="text-blue-500"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-mono font-bold">{calculateUpgradeChance().toFixed(1)}%</span>
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Шанс</span>
                        </div>
                      </div>

                      <button
                        onClick={handleUpgrade}
                        disabled={isUpgrading || upgradeSelection.length === 0}
                        className={`w-full py-4 rounded-xl font-bold transition-all transform active:scale-95 ${
                          upgradeSelection.length > 0 && !isUpgrading
                            ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {isUpgrading ? (
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <RefreshCcw className="w-6 h-6 mx-auto" />
                          </motion.div>
                        ) : 'Улучшить'}
                      </button>
                    </div>
                  </div>
                </div>

                {isUpgrading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 180, 360]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles className="w-16 h-16 text-blue-500" />
                    </motion.div>
                    <p className="mt-4 font-bold text-xl tracking-widest uppercase">Выполняется апгрейд...</p>
                  </motion.div>
                )}
              </div>

              {inventory.length === 0 ? (
                <div className="text-center py-20 bg-[#141414] border border-dashed border-white/10 rounded-3xl">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">Инвентарь пуст. Иди открой пару кейсов!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {inventory.map(item => {
                    const crypto = CRYPTOS.find(c => c.type === item.crypto_type);
                    const isListed = item.is_listed === 1;
                    return (
                      <motion.div 
                        key={item.id}
                        whileHover={!isListed ? { y: -5 } : {}}
                        onClick={() => {
                          if (isListed) return;
                          if (giftTarget) {
                            sendGift(item.id);
                          } else {
                            toggleUpgradeItem(item.id);
                          }
                        }}
                        className={`bg-[#141414] border rounded-2xl p-5 relative group transition-all cursor-pointer ${
                          isListed ? 'opacity-60 grayscale border-white/10' : 
                          upgradeSelection.includes(item.id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 
                          giftTarget ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-white/10'
                        }`}
                      >
                        {giftTarget && !isListed && (
                          <div className="absolute top-2 right-2 bg-emerald-500 rounded-full p-1 z-10 animate-bounce">
                            <Gift className="w-3 h-3 text-white" />
                          </div>
                        )}
                        {upgradeSelection.includes(item.id) && (
                          <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 z-10">
                            <ArrowUp className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${crypto?.color}`}>
                          {getRarityLabel(item.rarity)}
                        </div>
                        <div className="flex items-center justify-between mb-4">
                          <div className={`text-lg font-bold ${isListed ? 'line-through' : ''}`}>{item.crypto_type}</div>
                          <div className="text-[10px] font-mono text-gray-600">#{item.id}</div>
                        </div>
                        {isListed ? (
                          <div className="space-y-2">
                            <div className="text-[10px] text-yellow-500 font-bold uppercase text-center">На продаже</div>
                            <button 
                              onClick={() => cancelListing(item.id)}
                              className="w-full py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 rounded-lg text-xs font-bold transition-colors"
                            >
                              Отменить
                            </button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => setSelectedItem(item)}
                            className="w-full py-2 bg-white/5 hover:bg-emerald-500 hover:text-black rounded-lg text-xs font-bold transition-colors"
                          >
                            Продать
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'market' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold">Общий рынок</h2>
                  <p className="text-gray-500 text-sm">Торгуй с другими игроками в реальном времени.</p>
                </div>
                <AnimatePresence>
                  {marketNotification && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/30 flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Рынок обновлен
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {marketplace.length === 0 ? (
                <div className="text-center py-20 bg-[#141414] border border-dashed border-white/10 rounded-3xl">
                  <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">Нет активных лотов. Будь первым!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {marketplace.map(listing => {
                    const crypto = CRYPTOS.find(c => c.type === listing.crypto_type);
                    const isOwn = listing.seller_id === user.id;
                    return (
                      <div key={listing.id} className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-lg">
                        <div className="p-5">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${crypto?.color}`}>
                                {getRarityLabel(listing.rarity)}
                              </div>
                              <div className="text-xl font-bold">{listing.crypto_type}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-500 mb-1">Цена</div>
                              <div className="text-lg font-mono font-bold text-emerald-500">${listing.price}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-6 text-xs text-gray-500">
                            <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px]">
                              {listing.seller_name[0].toUpperCase()}
                            </div>
                            <span>Продавец: {listing.seller_name} {isOwn && '(Вы)'}</span>
                          </div>

                          <button 
                            onClick={() => !isOwn && buyFromMarket(listing.id)}
                            disabled={isOwn || user.balance < listing.price}
                            className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 ${
                              isOwn ? 'bg-white/5 text-gray-500 cursor-not-allowed' :
                              user.balance >= listing.price ? 'bg-emerald-500 text-black hover:bg-emerald-600' :
                              'bg-red-500/10 text-red-500 cursor-not-allowed'
                            }`}
                          >
                            {isOwn ? 'Ваш лот' : user.balance >= listing.price ? 'Купить' : 'Недостаточно средств'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isCreator && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              className="bg-[#141414]/90 backdrop-blur-xl border border-yellow-500/30 p-2 rounded-2xl shadow-2xl flex items-center gap-2"
            >
              <button 
                onClick={() => setShowStats(!showStats)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
              >
                <History className="w-4 h-4" />
                {showStats ? 'Закрыть панель' : 'Админ-панель'}
              </button>
              <div className="h-4 w-px bg-white/10 mx-1" />
              <div className="flex items-center gap-4 px-2">
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 uppercase font-bold">Статус</span>
                  <span className="text-[10px] text-blue-500 font-bold">DEVELOPER MODE</span>
                </div>
              </div>
            </motion.div>

            <AnimatePresence>
              {showStats && stats && (
                <motion.div 
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: -12, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[90vw] max-w-4xl bg-[#141414] border border-white/10 p-6 rounded-3xl shadow-2xl"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-yellow-500" />
                      Глобальная статистика
                    </h3>
                    <button onClick={fetchStats} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                      <RefreshCcw className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Пользователей</div>
                      <div className="text-xl font-mono font-bold text-white">{stats.totalUsers}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">На рынке</div>
                      <div className="text-xl font-mono font-bold text-emerald-500">{stats.activeListings}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Всего предметов</div>
                      <div className="text-xl font-mono font-bold text-blue-500">{stats.totalInventoryItems}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                      <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">Экономика (нед)</div>
                      <div className="text-xl font-mono font-bold text-yellow-500">${stats.economyVolume.toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
                    <button className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase transition-colors">Склад</button>
                    <button className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase transition-colors">Рынок</button>
                    <button className="py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase transition-colors">Магазин</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Sell Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItem(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-2">Выставить на продажу</h3>
              <p className="text-gray-400 mb-6">Укажите цену для {selectedItem.crypto_type} (макс. $10,000).</p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-2 block">Цена ($)</label>
                  <input 
                    type="number" 
                    value={listingPrice}
                    onChange={(e) => setListingPrice(e.target.value)}
                    placeholder="Введите цену..."
                    max="10000"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors text-xl font-mono"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-colors"
                  >
                    Отмена
                  </button>
                  <button 
                    onClick={listOnMarket}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-4 rounded-xl transition-colors"
                  >
                    Выставить
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Настройки
                </h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white">
                  <RefreshCcw className="w-5 h-5 rotate-45" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold mb-2 block tracking-widest">Активация Developer Mode</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={devCode}
                      onChange={(e) => setDevCode(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                      placeholder="Введите код..."
                    />
                    <button 
                      onClick={handleDevCode}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 rounded-xl font-bold transition-colors"
                    >
                      OK
                    </button>
                  </div>
                  {isCreator && (
                    <p className="text-[10px] text-emerald-500 mt-2 font-bold uppercase tracking-tighter">✓ Режим разработчика активен</p>
                  )}
                </div>

                <div className="pt-4 border-t border-white/5">
                  <p className="text-[10px] text-gray-600 uppercase font-bold mb-4">Информация об аккаунте</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">ID пользователя:</span>
                      <span className="font-mono">{user?.id}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Статус:</span>
                      <span className={isCreator ? "text-blue-500 font-bold" : "text-gray-400"}>
                        {isCreator ? "Developer" : "User"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-lg border-t border-white/5 px-6 py-4 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button 
            onClick={() => setActiveTab('math')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'math' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Brain className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Решать</span>
          </button>
          <button 
            onClick={() => setActiveTab('shop')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'shop' ? 'text-yellow-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Package className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Магазин</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'inventory' ? 'text-emerald-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <Wallet className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Склад</span>
          </button>
          <button 
            onClick={() => setActiveTab('market')}
            className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'market' ? 'text-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <ShoppingCart className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Рынок</span>
          </button>
        </div>
      </nav>
      {/* Friends Modal */}
      <AnimatePresence>
        {showFriends && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  Друзья
                </h3>
                <button onClick={() => setShowFriends(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Ваш ID</label>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{user?.id}</span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(user?.id || '');
                        setFeedback({ type: 'success', msg: 'ID скопирован' });
                        setTimeout(() => setFeedback(null), 2000);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block tracking-widest">Добавить друга по ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={friendIdInput}
                      onChange={(e) => setFriendIdInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                      placeholder="Введите ID..."
                    />
                    <button 
                      onClick={addFriend}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 rounded-xl font-bold transition-colors"
                    >
                      OK
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-[10px] text-gray-600 uppercase font-bold">Ваши друзья ({friends.length})</p>
                  {friends.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">У вас пока нет друзей...</p>
                  ) : (
                    friends.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold">
                            {friend.username[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{friend.username}</span>
                          {friend.badge && (
                            <span className="text-[8px] bg-yellow-500/20 text-yellow-600 px-1 rounded font-bold uppercase flex items-center gap-1">
                              {getBadgeIcon(friend.badge, "w-2 h-2")}
                              {getBadgeLabel(friend.badge)}
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            setGiftTarget(friend.id);
                            setShowFriends(false);
                            setActiveTab('inventory');
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
                          title="Отправить подарок"
                        >
                          <Gift className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Badge Exchange Modal */}
      <AnimatePresence>
        {showExchange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#141414] border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold flex items-center gap-3">
                  <RefreshCcw className="w-6 h-6 text-yellow-500" />
                  Обмен на значки
                </h3>
                <button onClick={() => setShowExchange(false)} className="text-gray-500 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { type: 'Diamond', rarity: 'Rare', count: 5, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                  { type: 'Crown', rarity: 'Legendary', count: 5, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
                  { type: 'Star', rarity: 'Uncommon', count: 10, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { type: 'Dragon', rarity: 'Mythic', count: 3, color: 'text-pink-500', bg: 'bg-pink-500/10' },
                  { type: 'Phoenix', rarity: 'Epic', count: 5, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map(badge => {
                  const availableItems = inventory.filter(i => i.rarity === badge.rarity && i.is_listed === 0);
                  const canExchange = availableItems.length >= badge.count;
                  
                  return (
                    <div key={badge.type} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
                      <div className={`w-16 h-16 rounded-full ${badge.bg} flex items-center justify-center mb-4 shadow-lg`}>
                        {getBadgeIcon(badge.type, "w-10 h-10")}
                      </div>
                      <h4 className="text-lg font-bold mb-1">{getBadgeLabel(badge.type)}</h4>
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-4">Нужно: {badge.count} {getRarityLabel(badge.rarity)}</p>
                      
                      <div className="w-full bg-black/30 rounded-full h-1.5 mb-6 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${canExchange ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, (availableItems.length / badge.count) * 100)}%` }}
                        />
                      </div>

                      <button 
                        disabled={!canExchange}
                        onClick={() => exchangeBadge(badge.type, availableItems.slice(0, badge.count).map(i => i.id))}
                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                          canExchange ? 'bg-emerald-500 text-black hover:bg-emerald-600' : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        {canExchange ? 'Получить значок' : `Нужно еще ${badge.count - availableItems.length}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
