import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";

// Import crypto icons
import btcIcon from "@/assets/btc-icon.png";
import ltcIcon from "@/assets/ltc-icon.png";
import ethIcon from "@/assets/eth-icon.png";
import solIcon from "@/assets/sol-icon.png";

// Card types and suits
type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

interface PlayingCard {
  suit: Suit;
  rank: Rank;
  id: string;
}

interface GameRound {
  result: "win" | "lose" | "push" | "blackjack";
  amount: number;
}

type CryptoType = "BTC" | "LTC" | "ETH" | "SOL";

interface CryptoBalance {
  BTC: number;
  LTC: number;
  ETH: number;
  SOL: number;
}

interface WagerTracking {
  BTC: { deposited: number; wagered: number };
  LTC: { deposited: number; wagered: number };
  ETH: { deposited: number; wagered: number };
  SOL: { deposited: number; wagered: number };
}

interface CryptoPrices {
  BTC: number;
  LTC: number;
  ETH: number;
  SOL: number;
}

const Index = () => {
  // Game state
  const [balances, setBalances] = useState<CryptoBalance>({
    BTC: 0,
    LTC: 0,
    ETH: 0,
    SOL: 0,
  });
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>("BTC");
  const [wagerTracking, setWagerTracking] = useState<WagerTracking>({
    BTC: { deposited: 0, wagered: 0 },
    LTC: { deposited: 0, wagered: 0 },
    ETH: { deposited: 0, wagered: 0 },
    SOL: { deposited: 0, wagered: 0 },
  });
  const [showUSD, setShowUSD] = useState(false);
  const [cryptoPrices] = useState<CryptoPrices>({
    BTC: 97000,
    LTC: 88,
    ETH: 3600,
    SOL: 210,
  });

  // Deposit/Withdraw states
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Blackjack game state
  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [bet, setBet] = useState(0.001);
  const [gameState, setGameState] = useState<"betting" | "playing" | "dealer" | "finished">("betting");
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [message, setMessage] = useState("");
  const [canDouble, setCanDouble] = useState(false);
  const [roundHistory, setRoundHistory] = useState<GameRound[]>([]);

  const balance = balances[selectedCrypto];

  // Create a shuffled deck
  const createDeck = (): PlayingCard[] => {
    const suits: Suit[] = ["♠", "♥", "♦", "♣"];
    const ranks: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    const newDeck: PlayingCard[] = [];

    // 6 decks
    for (let d = 0; d < 6; d++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          newDeck.push({ suit, rank, id: `${suit}${rank}${d}` });
        }
      }
    }

    // Shuffle
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    return newDeck;
  };

  // Calculate hand value
  const calculateHandValue = (hand: PlayingCard[]): number => {
    let value = 0;
    let aces = 0;

    hand.forEach((card) => {
      if (card.rank === "A") {
        aces += 1;
        value += 11;
      } else if (["K", "Q", "J"].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    });

    // Adjust for aces
    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  };

  // Deposit handler
  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount.",
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] + amount }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        ...prev[selectedCrypto],
        deposited: prev[selectedCrypto].deposited + amount
      }
    }));
    setDepositAmount("");
    setDepositDialogOpen(false);
    toast({
      title: "Deposit Successful",
      description: `Added ${amount} ${selectedCrypto} to your balance.`,
    });
  };

  // Withdraw handler
  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid withdrawal amount.",
        variant: "destructive",
      });
      return;
    }

    if (!withdrawAddress || withdrawAddress.trim() === "") {
      toast({
        title: "Address Required",
        description: "Please enter a withdrawal address.",
        variant: "destructive",
      });
      return;
    }

    const currentBalance = balances[selectedCrypto];
    const { deposited, wagered } = wagerTracking[selectedCrypto];
    const requiredWager = deposited * 50;
    const remainingWager = Math.max(0, requiredWager - wagered);

    if (remainingWager > 0) {
      toast({
        title: "Wager Requirement Not Met",
        description: `You need to wager ${remainingWager.toFixed(6)} ${selectedCrypto} more (${(remainingWager * cryptoPrices[selectedCrypto]).toFixed(2)} USD) before withdrawing.`,
        variant: "destructive",
      });
      return;
    }

    if (amount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough ${selectedCrypto} to withdraw.`,
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - amount }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        deposited: Math.max(0, prev[selectedCrypto].deposited - amount),
        wagered: Math.max(0, prev[selectedCrypto].wagered - amount)
      }
    }));
    setWithdrawAmount("");
    setWithdrawAddress("");
    setWithdrawDialogOpen(false);
    toast({
      title: "Withdrawal Successful",
      description: `Withdrew ${amount} ${selectedCrypto} to ${withdrawAddress}.`,
    });
  };

  // Copy address to clipboard
  const copyAddress = () => {
    const fakeAddress = `${selectedCrypto}fake1234567890address`;
    navigator.clipboard.writeText(fakeAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
    toast({
      title: "Address Copied",
      description: "Deposit address copied to clipboard.",
    });
  };

  // End a round with result
  const endRound = (result: "win" | "lose" | "push" | "blackjack") => {
    let payout = 0;
    let resultMessage = "";

    if (result === "win") {
      payout = bet * 2;
      resultMessage = "You Win!";
    } else if (result === "blackjack") {
      payout = bet * 2.5;
      resultMessage = "Blackjack! You Win!";
    } else if (result === "push") {
      payout = bet;
      resultMessage = "Push - Tie Game";
    } else {
      payout = 0;
      resultMessage = "Dealer Wins";
    }

    const profit = payout - bet;
    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] + payout }));
    setWagerTracking(prev => ({
      ...prev,
      [selectedCrypto]: {
        ...prev[selectedCrypto],
        wagered: prev[selectedCrypto].wagered + bet
      }
    }));
    setRoundHistory(prev => [{ result, amount: profit }, ...prev].slice(0, 20));
    setMessage(resultMessage);
    setGameState("finished");
  };

  // Start new round
  const newRound = () => {
    if (bet > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this bet.",
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - bet }));
    
    const newDeck = deck.length < 52 ? createDeck() : [...deck];
    const newPlayerHand = [newDeck.pop()!, newDeck.pop()!];
    const newDealerHand = [newDeck.pop()!, newDeck.pop()!];

    setDeck(newDeck);
    setPlayerHand(newPlayerHand);
    setDealerHand(newDealerHand);
    setDealerRevealed(false);
    setMessage("");
    setGameState("playing");
    setCanDouble(true);

    // Check for blackjack
    const playerValue = calculateHandValue(newPlayerHand);
    const dealerValue = calculateHandValue(newDealerHand);

    if (playerValue === 21) {
      if (dealerValue === 21) {
        setDealerRevealed(true);
        endRound("push");
      } else {
        setDealerRevealed(true);
        endRound("blackjack");
      }
    }
  };

  // Player hits
  const hit = () => {
    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    setDeck(newDeck);
    setPlayerHand(newHand);
    setCanDouble(false);

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setDealerRevealed(true);
      endRound("lose");
    }
  };

  // Player stands
  const stand = () => {
    setGameState("dealer");
    setDealerRevealed(true);
    playDealerHand();
  };

  // Double down
  const doubleDown = () => {
    if (bet * 2 > balance + bet) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to double down.",
        variant: "destructive",
      });
      return;
    }

    setBalances((prev) => ({ ...prev, [selectedCrypto]: prev[selectedCrypto] - bet }));
    setBet(bet * 2);

    const newDeck = [...deck];
    const newCard = newDeck.pop()!;
    const newHand = [...playerHand, newCard];
    setDeck(newDeck);
    setPlayerHand(newHand);

    const value = calculateHandValue(newHand);
    if (value > 21) {
      setDealerRevealed(true);
      endRound("lose");
    } else {
      setGameState("dealer");
      setDealerRevealed(true);
      setTimeout(() => playDealerHand(newHand), 500);
    }
  };

  // Dealer plays
  const playDealerHand = (finalPlayerHand?: PlayingCard[]) => {
    const playerValue = calculateHandValue(finalPlayerHand || playerHand);
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];

    while (calculateHandValue(currentDealerHand) < 17) {
      const newCard = currentDeck.pop()!;
      currentDealerHand.push(newCard);
      setDealerHand([...currentDealerHand]);
      setDeck([...currentDeck]);
    }

    const dealerValue = calculateHandValue(currentDealerHand);

    setTimeout(() => {
      if (dealerValue > 21 || playerValue > dealerValue) {
        endRound("win");
      } else if (playerValue === dealerValue) {
        endRound("push");
      } else {
        endRound("lose");
      }
    }, 500);
  };

  // Reset for next round
  const playAgain = () => {
    setGameState("betting");
    setMessage("");
  };

  // Initialize deck
  useEffect(() => {
    setDeck(createDeck());
  }, []);

  // Get crypto icon
  const getCryptoIcon = (crypto: CryptoType) => {
    const icons = { BTC: btcIcon, LTC: ltcIcon, ETH: ethIcon, SOL: solIcon };
    return <img src={icons[crypto]} alt={crypto} className="w-8 h-8" />;
  };

  // Format balance
  const formatBalance = (crypto: CryptoType, amount: number) => {
    if (showUSD) {
      return `$${(amount * cryptoPrices[crypto]).toFixed(2)}`;
    }
    return `${amount.toFixed(6)} ${crypto}`;
  };

  // Playing card component
  const PlayingCardComponent = ({ card, hidden = false, index = 0 }: { card: PlayingCard; hidden?: boolean; index?: number }) => {
    const isRed = card.suit === "♥" || card.suit === "♦";
    
    return (
      <motion.div
        initial={{ scale: 0, rotateY: 180 }}
        animate={{ scale: 1, rotateY: 0 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative"
      >
        <div className={`w-24 h-36 rounded-lg flex items-center justify-center border-2 ${
          hidden
            ? "bg-gradient-to-br from-primary to-primary/80 border-primary/40"
            : "bg-card border-border shadow-lg"
        }`}>
          {hidden ? (
            <div className="text-4xl text-primary-foreground opacity-50">🂠</div>
          ) : (
            <div className="flex flex-col items-center">
              <div className={`text-5xl font-bold ${isRed ? "text-red-500" : "text-foreground"}`}>
                {card.rank}
              </div>
              <div className={`text-4xl ${isRed ? "text-red-500" : "text-foreground"}`}>
                {card.suit}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/30 to-background bg-[length:200%_200%] animate-gradient -z-10"></div>

      {/* Header with Balance */}
      <motion.div
        className="flex flex-wrap items-center justify-between gap-4 bg-card/80 backdrop-blur-sm p-6 border-b border-border shadow-lg w-full"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Crypto Blackjack
          </h1>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Crypto Selector */}
          <div className="flex items-center gap-2">
            {getCryptoIcon(selectedCrypto)}
            <Select value={selectedCrypto} onValueChange={(value: CryptoType) => setSelectedCrypto(value)}>
              <SelectTrigger className="w-[120px] bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="BTC">Bitcoin</SelectItem>
                <SelectItem value="LTC">Litecoin</SelectItem>
                <SelectItem value="ETH">Ethereum</SelectItem>
                <SelectItem value="SOL">Solana</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Balance Display */}
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-lg font-bold text-foreground">
              {formatBalance(selectedCrypto, balance)}
            </p>
          </div>

          {/* USD Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowUSD(!showUSD)}
            className="border-primary/20"
          >
            {showUSD ? "Show Crypto" : "Show USD"}
          </Button>
        </div>

        {/* Deposit and Withdraw Buttons */}
        <div className="flex gap-2">
          <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90">
                Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle>Deposit {selectedCrypto}</DialogTitle>
                <DialogDescription>
                  Educational purposes only - This is a fake deposit
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="deposit">Amount</Label>
                  <Input
                    id="deposit"
                    type="number"
                    step="0.0001"
                    placeholder="0.0000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deposit Address (Fake)</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${selectedCrypto}fake1234567890address`}
                      className="bg-muted border-border"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyAddress}
                    >
                      {copiedAddress ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button onClick={handleDeposit} className="w-full bg-primary hover:bg-primary/90">
                  Confirm Deposit
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-primary/20">
                Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-card border-border">
              <DialogHeader>
                <DialogTitle>Withdraw {selectedCrypto}</DialogTitle>
                <DialogDescription>
                  50x wager requirement on deposits
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="withdraw">Amount</Label>
                  <Input
                    id="withdraw"
                    type="number"
                    step="0.0001"
                    placeholder="0.0000"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Withdrawal Address</Label>
                  <Input
                    id="address"
                    placeholder="Enter address"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    className="bg-muted border-border"
                  />
                </div>
                <Button onClick={handleWithdraw} className="w-full bg-primary hover:bg-primary/90">
                  Confirm Withdrawal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Main Game Area */}
      <div className="container mx-auto p-4 pt-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Game Table */}
          <motion.div
            className="flex-1 max-w-4xl mx-auto"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="space-y-8">
              {/* Dealer's Hand */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-muted-foreground">Dealer</h2>
                  {dealerRevealed && (
                    <div className="text-3xl font-bold text-primary bg-primary/10 px-6 py-2 rounded-lg border-2 border-primary/30 shadow-lg">
                      {calculateHandValue(dealerHand)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <AnimatePresence>
                    {dealerHand.map((card, index) => (
                      <PlayingCardComponent
                        key={card.id}
                        card={card}
                        hidden={!dealerRevealed && index === 1}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Message Area */}
              <motion.div
                className="text-center min-h-[60px] flex items-center justify-center"
                key={message}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {message && (
                  <p className="text-2xl font-bold text-primary">{message}</p>
                )}
              </motion.div>

              {/* Player's Hand */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">You</h2>
                  {playerHand.length > 0 && (
                    <div className="text-3xl font-bold text-foreground bg-accent/10 px-6 py-2 rounded-lg border-2 border-accent/30 shadow-lg">
                      {calculateHandValue(playerHand)}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center">
                  <AnimatePresence>
                    {playerHand.map((card, index) => (
                      <PlayingCardComponent key={card.id} card={card} index={index} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Bet Controls */}
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <Label className="text-muted-foreground">Bet Amount:</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBet(Math.max(0.001, bet / 2))}
                      disabled={gameState !== "betting"}
                      className="border-primary/20"
                    >
                      ½
                    </Button>
                    <Input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={bet}
                      onChange={(e) => setBet(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                      disabled={gameState !== "betting"}
                      className="w-32 text-center bg-muted border-border"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBet(Math.min(balance, bet * 2))}
                      disabled={gameState !== "betting"}
                      className="border-primary/20"
                    >
                      2×
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 flex-wrap">
                  {gameState === "betting" && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={newRound}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg"
                      >
                        Deal ({bet.toFixed(6)} {selectedCrypto})
                      </Button>
                    </motion.div>
                  )}

                  {gameState === "playing" && (
                    <>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={hit}
                          size="lg"
                          className="bg-accent hover:bg-accent/90 font-bold px-6 shadow-lg"
                        >
                          Hit
                        </Button>
                      </motion.div>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={stand}
                          size="lg"
                          variant="outline"
                          className="font-bold px-6 shadow-lg border-primary/20"
                        >
                          Stand
                        </Button>
                      </motion.div>
                      {canDouble && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={doubleDown}
                            size="lg"
                            variant="secondary"
                            className="font-bold px-6 shadow-lg"
                          >
                            Double
                          </Button>
                        </motion.div>
                      )}
                    </>
                  )}

                  {gameState === "finished" && (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        onClick={playAgain}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 font-bold px-8 shadow-lg"
                      >
                        Play Again
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sidebar with History */}
          <motion.div
            className="lg:w-80 flex flex-col gap-4"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Round History */}
            <Card className="flex-1 p-4 bg-card/50 backdrop-blur-sm border-border">
              <h3 className="text-lg font-bold mb-3 text-foreground">Round History</h3>
              
              {roundHistory.length > 0 && (
                <div className="h-32 bg-muted/30 rounded-lg p-2 mb-4 relative flex items-end gap-1">
                  {roundHistory.map((round, index) => {
                    const cumulativeBalance = roundHistory
                      .slice(0, index + 1)
                      .reduce((sum, r) => sum + r.amount, wagerTracking[selectedCrypto].deposited);
                    const initialDeposit = wagerTracking[selectedCrypto].deposited;
                    const heightPercent = initialDeposit > 0
                      ? Math.max(5, Math.min(100, (cumulativeBalance / initialDeposit) * 50))
                      : 50;
                    const isProfit = cumulativeBalance > initialDeposit;

                    return (
                      <div
                        key={index}
                        className={`flex-1 rounded-t transition-all ${
                          isProfit ? 'bg-green-500/60' : 'bg-red-500/60'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                        title={`${cumulativeBalance.toFixed(6)} ${selectedCrypto}`}
                      />
                    );
                  })}
                </div>
              )}

              <div className="space-y-2">
                {roundHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No rounds played yet</p>
                ) : (
                  roundHistory.map((round, index) => (
                    <div
                      key={index}
                      className={`flex justify-between items-center p-2 rounded ${
                        round.result === "win" || round.result === "blackjack"
                          ? "bg-green-500/10 text-green-500"
                          : round.result === "lose"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      <span className="capitalize font-medium">{round.result}</span>
                      <span className="font-bold">
                        {round.amount >= 0 ? "+" : ""}
                        {round.amount.toFixed(6)} {selectedCrypto}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Game Info */}
            <Card className="flex-1 min-w-[300px] p-4 bg-card/50 backdrop-blur-sm border-border">
              <h3 className="text-lg font-bold mb-3 text-foreground">Rules</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Blackjack pays 3:2</li>
                <li>• Dealer stands on 17</li>
                <li>• Double down on any two cards</li>
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Index;
