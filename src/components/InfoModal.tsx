import { nwc } from "@getalby/sdk";
import { launchPaymentModal } from "@getalby/bitcoin-connect";
import { useState } from "react";

const DONATION_CONNECTION_SECRET = "nostr+walletconnect://c8986738660e5e5ee92e21a51e1f2e5915ad7ee9e972f301fc670f8eb47e9bed?relay=wss://relay.getalby.com/v1&secret=4b1295fe100f412a44803def27d5eef6242443cbf1f2b55c557b141e46a736c7";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal = ({ isOpen, onClose }: InfoModalProps) => {
  const [donationStatus, setDonationStatus] = useState<string>("");

  if (!isOpen) return null;

  const handleDonation = async (amount: number) => {
    try {
      const client = new nwc.NWCClient({
        nostrWalletConnectUrl: DONATION_CONNECTION_SECRET,
      });
      
      const transaction = await client.makeInvoice({
        amount: amount * 1000,
        description: `Donation to Sat Parity - ${amount} sats`,
      });

        const { setPaid } = await launchPaymentModal({
          invoice: transaction.invoice,
          onPaid: () => {
            clearInterval(checkPaymentInterval);
            setDonationStatus("Thank you for your donation!");
          }
        });

        // Set up payment verification interval
        const checkPaymentInterval = setInterval(async () => {
          try {
            // Use NWC to verify payment
            const polledTransaction = await client.lookupInvoice({
              invoice: transaction.invoice
            });

            if (polledTransaction.preimage) {
              setPaid({
                preimage: polledTransaction.preimage,
              });
            }
          } catch (error) {
            console.error('Error checking payment status:', error);
          }
        }, 1000);

        // Clean up interval after 5 minutes (300000ms) if payment not received
        setTimeout(() => {
          clearInterval(checkPaymentInterval);
        }, 300000);
    } catch (error) {
      console.error('Error processing donation:', error);
      setDonationStatus("Error processing donation");
      setTimeout(() => setDonationStatus(""), 3000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">About Sat Parity</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-gray-600">
          <p className="mb-4">
            This site tracks Bitcoin's purchasing power across different currencies and predicts when each currency will reach "sat parity" - the point where 1 satoshi equals or exceeds 1 unit of that currency.
          </p>
          <p className="mb-4">
            This website was 99% made by PPQ.ai using the Cline VSCode plugin with Claude 3.5 Sonnet, costing approximately 13,175 sats or $10 as of November 8, 2024 and 2 hours of human time.
          </p>
          <div className="mt-4">
            <a 
              href="https://github.com/rolznz/satparity"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 hover:text-sky-600 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.647.35-1.087.636-1.337-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.417 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              View on GitHub
            </a>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Support this project</h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => handleDonation(1000)}
                className="px-4 py-2 bg-gradient-to-r from-orange-400 to-orange-500 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 transition-colors"
              >
                1k sats
              </button>
              <button
                onClick={() => handleDonation(10000)}
                className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-lg hover:from-amber-500 hover:to-amber-600 transition-colors"
              >
                10k sats
              </button>
              <button
                onClick={() => handleDonation(100000)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-600 transition-colors"
              >
                100k sats
              </button>
            </div>
            {donationStatus && (
              <div className="mt-4 text-center text-sm font-medium text-gray-700">
                {donationStatus}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
