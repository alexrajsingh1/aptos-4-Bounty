import React, { useEffect, useState, useCallback } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Pagination,
  message,
  Button,
  Input,
  Modal,
  List,
} from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");

type NFT = {
  id: number;
  owner: string;
  creator: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
  likes: number;
};

type Offer = {
  offerId: number;
  nftId: number;
  offerer: string;
  amount: number;
};


const MyNFTs: React.FC = () => {
  const pageSize = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalNFTs, setTotalNFTs] = useState(0);
  const { account, signAndSubmitTransaction } = useWallet();
  const marketplaceAddr = "your-marketplace-address-here";

  const [isSellModalVisible, setIsSellModalVisible] = useState(false);
  const [selectedNftForSale, setSelectedNftForSale] = useState<NFT | null>(null);
  const [salePrice, setSalePrice] = useState<string>("");

  const [isTransferModalVisible, setIsTransferModalVisible] = useState(false);
  const [selectedNftForTransfer, setSelectedNftForTransfer] = useState<NFT | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<string>("");

  const [isTipModalVisible, setIsTipModalVisible] = useState(false);
  const [selectedNftForTip, setSelectedNftForTip] = useState<NFT | null>(null);
  const [tipAmount, setTipAmount] = useState<string>("");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedNftForOffers, setSelectedNftForOffers] = useState<NFT | null>(null);
  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);

  const fetchUserNFTs = useCallback(async () => {
    if (!account) return;

    try {
      const nftIdsResponse = await client.view({
        function: `${marketplaceAddr}::NFTMarketplace::get_all_nfts_for_owner`,
        arguments: [marketplaceAddr, account.address, "100", "0"],
        type_arguments: [],
      });

      const nftIds = Array.isArray(nftIdsResponse[0]) ? nftIdsResponse[0] : nftIdsResponse;
      setTotalNFTs(nftIds.length);

      if (nftIds.length === 0) {
        setNfts([]);
        return;
      }

      const userNFTs = (
        await Promise.all(
          nftIds.map(async (id) => {
            try {
              const nftDetails = await client.view({
                function: `${marketplaceAddr}::NFTMarketplace::get_nft_details`,
                arguments: [marketplaceAddr, id],
                type_arguments: [],
              });

              const [nftId, owner, creator, name, description, uri, price, forSale, rarity, likes] = nftDetails as [
                number,
                string,
                string,
                string,
                string,
                string,
                number,
                boolean,
                number,
                number,
              ];

              const hexToUint8Array = (hexString: string): Uint8Array => {
                const bytes = new Uint8Array(hexString.length / 2);
                for (let i = 0; i < hexString.length; i += 2) {
                  bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
                }
                return bytes;
              };

              return {
                id: nftId,
                owner,
                creator,
                name: new TextDecoder().decode(hexToUint8Array(name.slice(2))),
                description: new TextDecoder().decode(hexToUint8Array(description.slice(2))),
                uri: new TextDecoder().decode(hexToUint8Array(uri.slice(2))),
                rarity,
                likes,
                price: price / 100000000,
                for_sale: forSale,
              };
            } catch (error) {
              console.error(`Error fetching details for NFT ID ${id}:`, error);
              return null;
            }
          })
        )
      ).filter((nft): nft is NFT => nft !== null);

      setNfts(userNFTs);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      message.error("Failed to fetch your NFTs.");
    }
  }, [account, marketplaceAddr]);

  const fetchOffers = async (nftId: number) => {
    try {
      const response = await client.view({
        function: `${marketplaceAddr}::NFTMarketplace::get_offers`,
        arguments: [marketplaceAddr, nftId.toString()],
        type_arguments: [],
      });

      console.log("Offers Response:", response);

      const offersList = Array.isArray(response[0]) ? response[0] : [];
      setOffers(
        offersList.map((offer: { buyer: string; offer_price: string }, index: number) => ({
          offerId: index + 1, 
          nftId,
          offerer: offer.buyer,
          amount: parseFloat(offer.offer_price) / 100000000, // Convert to APT
        }))
      );
    } catch (error) {
      console.error("Error fetching offers:", error);
      message.error("Failed to fetch offers for this NFT.");
    }
  };

  const handleViewOffers = async (nft: NFT) => {
    setSelectedNftForOffers(nft);
    await fetchOffers(nft.id);
    setIsOfferModalVisible(true);
  };

  const handleAcceptOffer = async (offer: Offer) => {
    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::accept_offer`,
        type_arguments: [],
        arguments: [marketplaceAddr, offer.nftId.toString(), offer.offerer],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Offer accepted successfully!");
      setIsOfferModalVisible(false);
      fetchUserNFTs();
    } catch (error) {
      console.error("Error accepting offer:", error);
      message.error("Failed to accept the offer.");
    }
  };


  const handleDeclineOffer = async (offer: Offer) => {
    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::decline_offer`,
        type_arguments: [],
        arguments: [marketplaceAddr, offer.nftId.toString(), offer.offerer],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Offer declined successfully!");
      setOffers(offers.filter((o) => o.offerId !== offer.offerId));
    } catch (error) {
      console.error("Error declining offer:", error);
      message.error("Failed to decline the offer.");
    }
  };


  const handleLikeClick = async (nft: NFT) => {
    try {
      const likeFee = 1000000; 

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::like_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, nft.id.toString(), likeFee.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT liked successfully!");
      fetchUserNFTs(); 
    } catch (error) {
      console.error("Error liking NFT:", error);
      message.error("Failed to like NFT.");
    }
  };

  const handleSellClick = (nft: NFT) => {
    setSelectedNftForSale(nft);
    setIsSellModalVisible(true);
  };

  const handleTransferClick = (nft: NFT) => {
    setSelectedNftForTransfer(nft);
    setIsTransferModalVisible(true);
  };

  const handleTipClick = (nft: NFT) => {
    setSelectedNftForTip(nft);
    setIsTipModalVisible(true);
  };

  const handleCancelSell = () => {
    setIsSellModalVisible(false);
    setSelectedNftForSale(null);
    setSalePrice("");
  };

  const handleCancelTransfer = () => {
    setIsTransferModalVisible(false);
    setSelectedNftForTransfer(null);
    setRecipientAddress("");
  };

  const handleCancelTip = () => {
    setIsTipModalVisible(false);
    setSelectedNftForTip(null);
    setTipAmount("");
  };

  const handleConfirmListing = async () => {
    if (!selectedNftForSale || !salePrice) return;

    try {
      const priceInOctas = parseFloat(salePrice) * 100000000;

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::list_for_sale`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNftForSale.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT listed for sale successfully!");
      setIsSellModalVisible(false);
      setSalePrice("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error listing NFT for sale:", error);
      message.error("Failed to list NFT for sale.");
    }
  };

  const handleConfirmTransfer = async () => {
    if (!selectedNftForTransfer || !recipientAddress) return;

    try {
      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::transfer_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNftForTransfer.id.toString(), recipientAddress],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT transferred successfully!");
      setIsTransferModalVisible(false);
      setRecipientAddress("");
      fetchUserNFTs();
    } catch (error) {
      console.error("Error transferring NFT:", error);
      message.error("Failed to transfer NFT.");
    }
  };

  const handleConfirmTip = async () => {
    if (!selectedNftForTip || !tipAmount) {
      message.error("Please select an NFT and enter a valid tip amount.");
      return;
    }

    try {
      const tipInOctas = Math.floor(parseFloat(tipAmount) * 1e8); 
      if (isNaN(tipInOctas) || tipInOctas <= 0) {
        message.error("Invalid tip amount.");
        return;
      }

      const nftIdAsString = selectedNftForTip.id.toString();


      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::tip_or_donate`,
        type_arguments: [],
        arguments: [
          marketplaceAddr, 
          nftIdAsString, 
          tipInOctas, 
        ],
      };

      console.log("Submitting tip transaction:", entryFunctionPayload);

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Tip sent successfully!");
      setIsTipModalVisible(false);
      setTipAmount("");
    } catch (error) {
      console.error("Error sending tip:", error);
      message.error("Failed to send tip.");
    }
  };

  const decodeHexString = (hex: string) => {
    return new TextDecoder().decode(
      Uint8Array.from(hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || [])
    );
  };


  useEffect(() => {
    fetchUserNFTs();
  }, [fetchUserNFTs, currentPage]);

  const paginatedNFTs = nfts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Title level={2} style={{ marginBottom: "20px" }}>My Collection</Title>
      <p>Your personal collection of NFTs.</p>

      <Row gutter={[24, 24]} style={{ marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}>
        {paginatedNFTs.map((nft) => (
          <Col key={nft.id} style={{ display: "flex", justifyContent: "center" }}>
            <Card
              hoverable
              cover={<img alt={nft.name} src={nft.uri} />}
              actions={[
                <Button style={{ marginRight: 5 }} type="link" onClick={() => handleLikeClick(nft)}>♥️ {nft.likes}</Button>,
                <Button style={{ marginRight: 6 }} type="link" onClick={() => handleSellClick(nft)}>Sell</Button>,
                <Button style={{ marginRight: 7 }} type="link" onClick={() => handleTransferClick(nft)}>Transfer</Button>,
                <Button style={{ marginRight: 10 }} type="link" onClick={() => handleTipClick(nft)}>Tip Creator</Button>,
                <Button style={{ marginRight: 10 }} type="link" onClick={() => handleViewOffers(nft)}>View Offers</Button>,
              ]}
            >
              <Meta title={nft.name} description={`Rarity: ${nft.rarity}, Price: ${nft.price} APT`} />
              <p>ID: {nft.id}</p>
              <p>{nft.description}</p>
              <p>For Sale: {nft.for_sale ? "Yes" : "No"}</p>
            </Card>
          </Col>
        ))}
      </Row>

      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={totalNFTs}
        onChange={(page) => setCurrentPage(page)}
        style={{ marginTop: 30 }}
      />

      <Modal title="Sell NFT" visible={isSellModalVisible} onCancel={handleCancelSell} footer={[
        <Button key="cancel" onClick={handleCancelSell}>Cancel</Button>,
        <Button key="confirm" type="primary" onClick={handleConfirmListing}>Confirm Listing</Button>,
      ]}>
        {selectedNftForSale && (
          <>
            <p><strong>NFT ID:</strong> {selectedNftForSale.id}</p>
            <Input
              type="number"
              placeholder="Enter sale price in APT"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
            />
          </>
        )}
      </Modal>

      <Modal title="Transfer NFT" visible={isTransferModalVisible} onCancel={handleCancelTransfer} footer={[
        <Button key="cancel" onClick={handleCancelTransfer}>Cancel</Button>,
        <Button key="confirm" type="primary" onClick={handleConfirmTransfer}>Confirm Transfer</Button>,
      ]}>
        {selectedNftForTransfer && (
          <>
            <p><strong>NFT ID:</strong> {selectedNftForTransfer.id}</p>
            <Input
              placeholder="Enter recipient address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </>
        )}
      </Modal>

      <Modal title="Tip Creator" visible={isTipModalVisible} onCancel={handleCancelTip} footer={[
        <Button key="cancel" onClick={handleCancelTip}>Cancel</Button>,
        <Button key="confirm" type="primary" onClick={handleConfirmTip}>Send Tip</Button>,
      ]}>
        {selectedNftForTip && (
          <>
            <p><strong>NFT ID:</strong> {selectedNftForTip.id}</p>
            <p><strong>Creator:</strong> {selectedNftForTip.creator || "unknown"}</p>
            <Input
              type="number"
              placeholder="Enter tip amount in APT"
              value={tipAmount}
              onChange={(e) => setTipAmount(e.target.value)}
            />
          </>
        )}
      </Modal>


      {/* Offers Modal */}
      <Modal
        visible={isOfferModalVisible}
        title={`Offers for ${selectedNftForOffers?.name}`}
        onCancel={() => setIsOfferModalVisible(false)}
        footer={null}
      >
        <List
          dataSource={offers}
          renderItem={(offer) => (
            <List.Item
              actions={[
                <Button
                  type="primary"
                  onClick={() => handleAcceptOffer(offer)}
                >
                  Accept
                </Button>,
                <Button danger onClick={() => handleDeclineOffer(offer)}>
                  Decline
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`Offerer: ${offer.offerer}`}
                description={`Amount: ${offer.amount} APT`}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default MyNFTs;
