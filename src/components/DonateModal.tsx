import { nwc } from "@getalby/sdk";
import { launchPaymentModal } from "@getalby/bitcoin-connect";
import { useState, useEffect } from "react";

const DONATION_CONNECTION_SECRET =
  "nostr+walletconnect://c8986738660e5e5ee92e21a51e1f2e5915ad7ee9e972f301fc670f8eb47e9bed?relay=wss://relay.getalby.com/v1&secret=4b1295fe100f412a44803def27d5eef6242443cbf1f2b55c557b141e46a736c7";

interface DonateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Transaction {
  amount: number;
  description: string;
  timestamp: number;
}

const DonateModal = ({ isOpen, onClose }: DonateModalProps) => {
  const [donationStatus, setDonationStatus] = useState<string>("");
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [donationMessage, setDonationMessage] = useState<string>("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const fetchBalance = async () => {
    try {
      const client = new nwc.NWCClient({
        nostrWalletConnectUrl: DONATION_CONNECTION_SECRET,
      });
      const balanceResponse = await client.getBalance();
      setBalance(Math.floor(balanceResponse.balance / 1000));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const client = new nwc.NWCClient({
        nostrWalletConnectUrl: DONATION_CONNECTION_SECRET,
      });
      const txResponse = await client.listTransactions({});
      const formattedTransactions = txResponse.transactions
        .filter((tx) => tx.settled_at)
        .map((tx) => ({
          amount: Math.floor(tx.amount / 1000), // Convert millisats to sats
          description: tx.description || "",
          timestamp: tx.settled_at,
        }));
      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
      fetchTransactions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const initiateDonation = (amount: number) => {
    setSelectedAmount(amount);
  };

  const handleDonation = async () => {
    if (!selectedAmount) return;

    try {
      const client = new nwc.NWCClient({
        nostrWalletConnectUrl: DONATION_CONNECTION_SECRET,
      });

      const transaction = await client.makeInvoice({
        amount: selectedAmount * 1000,
        description: donationMessage,
      });

      const { setPaid } = await launchPaymentModal({
        invoice: transaction.invoice,
        onPaid: () => {
          clearInterval(checkPaymentInterval);
          setDonationStatus("Thank you for your donation!");
          fetchBalance();
          fetchTransactions();
          setSelectedAmount(null);
          setDonationMessage("");
        },
      });

      // Set up payment verification interval
      const checkPaymentInterval = setInterval(async () => {
        try {
          // Use NWC to verify payment
          const polledTransaction = await client.lookupInvoice({
            invoice: transaction.invoice,
          });

          if (polledTransaction.preimage) {
            setPaid({
              preimage: polledTransaction.preimage,
            });
          }
        } catch (error) {
          console.error("Error checking payment status:", error);
        }
      }, 1000);

      // Clean up interval after 5 minutes (300000ms) if payment not received
      setTimeout(() => {
        clearInterval(checkPaymentInterval);
      }, 300000);
    } catch (error) {
      console.error("Error processing donation:", error);
      setDonationStatus("Error processing donation");
      setTimeout(() => setDonationStatus(""), 3000);
      setSelectedAmount(null);
      setDonationMessage("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Support this project</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="text-gray-600 max-h-[70vh] overflow-y-auto">
          {balance !== null && (
            <p className="text-center mb-4 text-sm text-gray-600">
              Total donations received: {balance} sats
            </p>
          )}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => initiateDonation(1000)}
              className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-colors"
            >
              1k sats
            </button>
            <button
              onClick={() => initiateDonation(10000)}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg hover:from-amber-500 hover:to-amber-600 transition-colors"
            >
              10k sats
            </button>
            <button
              onClick={() => initiateDonation(100000)}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-colors"
            >
              100k sats
            </button>
          </div>
          {selectedAmount && (
            <div className="mt-4">
              <input
                type="text"
                value={donationMessage}
                onChange={(e) => setDonationMessage(e.target.value)}
                placeholder="Add a message (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />
              <button
                onClick={handleDonation}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Donate {selectedAmount} sats
              </button>
            </div>
          )}
          {donationStatus && (
            <div className="mt-4 text-center text-sm font-medium text-gray-700">
              {donationStatus}
            </div>
          )}

          {transactions.length > 0 && (
            <div className="mt-6">
              <h4 className="text-md font-semibold mb-2">Recent Donations</h4>
              <div className="space-y-2">
                {transactions.map((tx, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{tx.amount} sats</span>
                    {tx.description && (
                      <span className="ml-2 text-gray-500">
                        "{tx.description}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonateModal;
