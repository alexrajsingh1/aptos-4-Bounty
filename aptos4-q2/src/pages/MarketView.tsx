import React, { useState, useEffect } from "react";
import { Typography, Radio, message, Card, Row, Col, Pagination, Tag, Button, Modal, Select, Input } from "antd";
import { AptosClient } from "aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";

const { Title } = Typography;
const { Meta } = Card;

const client = new AptosClient("https://fullnode.testnet.aptoslabs.com/v1");

type NFT = {
  id: number;
  owner: string;
  name: string;
  description: string;
  uri: string;
  price: number;
  for_sale: boolean;
  rarity: number;
  likes: number;
};

interface MarketViewProps {
  marketplaceAddr: string;
}

const rarityColors: { [key: number]: string } = {
  1: "green",
  2: "blue",
  3: "purple",
  4: "orange",
};

const rarityLabels: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Super Rare",
};

const truncateAddress = (address: string, start = 6, end = 4) => {
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

const MarketView: React.FC<MarketViewProps> = ({ marketplaceAddr }) => {
  const { signAndSubmitTransaction } = useWallet();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [rarity, setRarity] = useState<'all' | number>('all');
  const [sortOption, setSortOption] = useState<'priceAsc' | 'priceDesc' | 'likesDesc'>('priceAsc');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 8;

  const [isBuyModalVisible, setIsBuyModalVisible] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFT | null>(null);

  const [isOfferModalVisible, setIsOfferModalVisible] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");


  useEffect(() => {
    handleFetchNfts(undefined);
  }, []);

  const handleFetchNfts = async (selectedRarity: number | undefined) => {
    try {
      setIsLoading(true);
      const response = await client.getAccountResource(
        marketplaceAddr,
        "your-marketplace-address-here::NFTMarketplace::Marketplace"
      );
      const nftList = (response.data as { nfts: NFT[] }).nfts;

      const hexToUint8Array = (hexString: string): Uint8Array => {
        const bytes = new Uint8Array(hexString.length / 2);
        for (let i = 0; i < hexString.length; i += 2) {
          bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
        }
        return bytes;
      };

      const decodedNfts = nftList.map((nft) => ({
        ...nft,
        name: new TextDecoder().decode(hexToUint8Array(nft.name.slice(2))),
        description: new TextDecoder().decode(hexToUint8Array(nft.description.slice(2))),
        uri: new TextDecoder().decode(hexToUint8Array(nft.uri.slice(2))),
        price: nft.price / 100000000,
      }));

      const filteredNfts = decodedNfts.filter((nft) => nft.for_sale && (selectedRarity === undefined || nft.rarity === selectedRarity));

      setNfts(filteredNfts);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching NFTs by rarity:", error);
      message.error("Failed to fetch NFTs.");
    } finally {
      setIsLoading(false);
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
      handleFetchNfts(rarity === 'all' ? undefined : rarity); 
    } catch (error) {
      console.error("Error liking NFT:", error);
      message.error("Failed to like NFT.");
    }
  };


  const handleMakeOfferClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsOfferModalVisible(true);
  };


  const handleConfirmOffer = async () => {
    if (!selectedNft || !offerAmount) return;

    try {
      const offerInOctas = Math.floor(parseFloat(offerAmount) * 100000000);

      if (isNaN(offerInOctas) || offerInOctas <= 0) {
        message.error("Offer amount must be a valid positive number.");
        return;
      }

      setIsLoading(true);

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::make_offer`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), offerInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("Offer made successfully!");
      setIsOfferModalVisible(false);
      setOfferAmount("");
      setSelectedNft(null);
      handleFetchNfts(rarity === 'all' ? undefined : rarity);
    } catch (error: any) {
      console.error("Error making offer:", error);
    const errorMessage = error.message || "Unknown error occurred while making the offer.";
    message.error(`Failed to make offer: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOffer = () => {
    setIsOfferModalVisible(false);
    setSelectedNft(null);
    setOfferAmount("");
  };

  const handleBuyClick = (nft: NFT) => {
    setSelectedNft(nft);
    setIsBuyModalVisible(true);
  };

  const handleCancelBuy = () => {
    setIsBuyModalVisible(false);
    setSelectedNft(null);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedNft) return;

    try {
      const priceInOctas = selectedNft.price * 100000000;

      const entryFunctionPayload = {
        type: "entry_function_payload",
        function: `${marketplaceAddr}::NFTMarketplace::purchase_nft`,
        type_arguments: [],
        arguments: [marketplaceAddr, selectedNft.id.toString(), priceInOctas.toString()],
      };

      const response = await (window as any).aptos.signAndSubmitTransaction(entryFunctionPayload);
      await client.waitForTransaction(response.hash);

      message.success("NFT purchased successfully!");
      setIsBuyModalVisible(false);
      handleFetchNfts(rarity === 'all' ? undefined : rarity); 
    } catch (error) {
      console.error("Error purchasing NFT:", error);
      message.error("Failed to purchase NFT.");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const applyFiltersAndSort = () => {
    let filteredNfts = [...nfts];

    if (searchQuery) {
      filteredNfts = filteredNfts.filter(
        (nft) =>
          nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          nft.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (rarity !== 'all') {
      filteredNfts = filteredNfts.filter((nft) => nft.rarity === rarity);
    }

    if (sortOption === 'priceAsc') {
      filteredNfts.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'priceDesc') {
      filteredNfts.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'likesDesc') {
      filteredNfts.sort((a, b) => b.likes - a.likes);
    }

    return filteredNfts;
  };

  const paginatedNfts = applyFiltersAndSort().slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div
      style={{
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Title level={2} style={{ marginBottom: "20px" }}>Marketplace</Title>

      <div style={{ marginBottom: "20px" }}>
        <Radio.Group
          value={rarity}
          onChange={(e) => {
            const selectedRarity = e.target.value;
            setRarity(selectedRarity);
            handleFetchNfts(selectedRarity === 'all' ? undefined : selectedRarity);
          }}
          buttonStyle="solid"
        >
          <Radio.Button value="all">All</Radio.Button>
          <Radio.Button value={1}>Common</Radio.Button>
          <Radio.Button value={2}>Uncommon</Radio.Button>
          <Radio.Button value={3}>Rare</Radio.Button>
          <Radio.Button value={4}>Super Rare</Radio.Button>
        </Radio.Group>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <Select
          value={sortOption}
          onChange={(value) => setSortOption(value)}
          style={{ width: 200 }}
        >
          <Select.Option value="priceAsc">Price: Low to High</Select.Option>
          <Select.Option value="priceDesc">Price: High to Low</Select.Option>
          <Select.Option value="likesDesc">Likes: High to Low</Select.Option>
        </Select>
      </div>

      <Input.Search
        placeholder="Search NFTs"
        onSearch={(value) => handleSearch(value)}
        style={{ marginBottom: 20, width: "50%" }}
      />

      <Row
        gutter={[24, 24]}
        style={{
          marginTop: 20,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {paginatedNfts.map((nft) => (
          <Col
            key={nft.id}
            xs={24} sm={12} md={8} lg={6} xl={6}
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Card
              hoverable
              style={{
                width: "100%",
                maxWidth: "290px",
                margin: "0 auto",
              }}
              cover={<img alt={nft.name} src={nft.uri} />}
              actions={[
                <Button type="link" onClick={() => handleLikeClick(nft)}>
                ♥️ {nft.likes}</Button>,
                <Button type="link" onClick={() => handleBuyClick(nft)}>
                  Buy
                </Button>,
                <Button type="link" onClick={() => handleMakeOfferClick(nft)}>
                Make Offer
              </Button>,
              ]}
            >
              <Tag
                color={rarityColors[nft.rarity]}
                style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}
              >
                {rarityLabels[nft.rarity]}
              </Tag>

              <Meta title={nft.name} description={`Price: ${nft.price} APT`} />
              <p>{nft.description}</p>
              <p>ID: {nft.id}</p>
              <p>Owner: {truncateAddress(nft.owner)}</p>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal
        title="Make an Offer"
        visible={isOfferModalVisible}
        onCancel={handleCancelOffer}
        footer={[
          <Button key="cancel" onClick={handleCancelOffer} disabled={isLoading}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmOffer} disabled={isLoading}>
            Confirm Offer
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <Input
              type="number"
              placeholder="Enter your offer amount in APT"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
            />
          </>
        )}
      </Modal>

      <div style={{ marginTop: 30, marginBottom: 30 }}>
        <Pagination
          current={currentPage}
          pageSize={pageSize}
          total={applyFiltersAndSort().length}
          onChange={(page) => setCurrentPage(page)}
          style={{ display: "flex", justifyContent: "center" }}
        />
      </div>

      <Modal
        title="Purchase NFT"
        visible={isBuyModalVisible}
        onCancel={handleCancelBuy}
        footer={[
          <Button key="cancel" onClick={handleCancelBuy}>
            Cancel
          </Button>,
          <Button key="confirm" type="primary" onClick={handleConfirmPurchase}>
            Confirm Purchase
          </Button>,
        ]}
      >
        {selectedNft && (
          <>
            <p><strong>NFT ID:</strong> {selectedNft.id}</p>
            <p><strong>Name:</strong> {selectedNft.name}</p>
            <p><strong>Description:</strong> {selectedNft.description}</p>
            <p><strong>Rarity:</strong> {rarityLabels[selectedNft.rarity]}</p>
            <p><strong>Price:</strong> {selectedNft.price} APT</p>
            <p><strong>Owner:</strong> {truncateAddress(selectedNft.owner)}</p>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MarketView;
