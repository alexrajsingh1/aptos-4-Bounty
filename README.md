---
# 🎨 Bounty - Aptos NFT Marketplace dApp ( FullStack ) 🚀

Welcome to the enhanced **NFT Marketplace dApp**, a cutting-edge platform built on the Aptos blockchain. This project takes your NFT marketplace experience to the next level by integrating advanced functionalities that empower users and enrich their journey.

Whether you're an NFT collector, creator, or trader, this marketplace offers powerful tools to mint, buy, sell, trade, and interact with NFTs like never before.

---

### Watch the demo video here:

<a href="https://youtu.be/ofnIxV5pCig" target="_blank">
    <img src="https://github.com/alexrajsingh1/aptos-4-Bounty/blob/main/vide.png" alt="Video Demo" style="width: 300px; height: 300px;">
</a>

---

## 🌟 New Key Features

### 1. **🛠️ NFT Transfers**
Effortlessly gift or trade your NFTs through the marketplace.  
- **🔄 Direct Transfers:** Transfer NFTs to any wallet securely.  
- **🏷️ Ownership Reset:** Automatically updates sale status and price upon transfer.  

### 2. **💡 Offer System**
Make the marketplace more interactive with customizable offers.  
- **🤝 Buyers:** Propose a price for NFTs, even if they're not listed.  
- **❤️ Sellers:** Accept, decline, or manage multiple offers with ease.  

### 3. **💸 APT Payments**
Seamlessly transact using APT tokens, with support for tipping and donations.  
- **💳 Secure Payments:** Integrated fee deductions ensure fairness.  
- **👏 Creator Support:** Tip creators directly to show appreciation.  

### 4. **🖌️ Minting for All Users**
Empower all users to mint unique NFTs with ease.  
- **🆓 Flexible Fees:** Free minting for whitelisted users, optional fees for others.  
- **🎲 Custom Rarity:** Define rarity levels to make NFTs stand out.  

### 5. **👍 Like and Tip NFTs**
Engage with NFTs by liking and tipping their creators.  
- **✔️ Unique Likes:** Avoid duplicate likes to maintain credibility.  
- **💵 Support Creators:** Every like rewards creators with a fee.  

### 6. **🔍 Advanced Filtering and Sorting**
Discover NFTs that match your taste with powerful search tools.  
- **⬆️⬇️ Sorting Options:** Sort by price, popularity, rarity.  
- **🗝️ Keyword Search:** Instantly find NFTs by name or description.  

---

## 🛠️ Introduction

The NFT Marketplace allows users to:
- 🎨 Mint NFTs with metadata, rarity, and price.
- 💸 Buy, sell, and transfer NFTs.
- ❤️ Like and tip NFTs.
- 📜 Manage and view offers on NFTs.
- 📊 Query marketplace data efficiently.

This contract ensures secure ownership, transaction integrity, and seamless user experience with a transparent fee structure.

---

## 🔑 Key Components

### 📦 NFT Structure

Defines the properties of an NFT:
- 🆔 `id`: Unique identifier.
- 🛡️ `owner`: Current owner of the NFT.
- 🎨 `creator`: Address of the NFT creator.
- 🖋️ `name`: Name of the NFT.
- 📜 `description`: Description of the NFT.
- 🌐 `uri`: Metadata URI for the NFT.
- 💲 `price`: Listing price in coins.
- 🏷️ `for_sale`: Boolean indicating sale status.
- 🧾 `offers`: List of offers from potential buyers.
- 🎲 `rarity`: Rarity level of the NFT (e.g., 1-10).
- 👍 `likes`: Number of likes the NFT has received.
- 👥 `likers`: Addresses of users who liked the NFT.

### 🏬 Marketplace Structure

Holds the list of all NFTs:
- 📜 `nfts`: A vector containing all NFTs in the marketplace.

### 📏 Constants

- 💵 `MARKETPLACE_FEE_PERCENT`: 2% transaction fee for marketplace operations.
- 💸 `TIP_FEE_PERCENT`: 1% fee on tips or donations.
- 🏦 `FEE_COLLECTION_ADDRESS`: Address where marketplace fees are collected.


### 🔒 Security and Transparency

The contract employs robust error handling with specific error codes:
- **❌ 800**: Duplicate like attempt.
- **💸 801**: Insufficient balance for liking.
- **🚫 500-706**: Various errors for invalid transactions, unauthorized actions, and data mismatches.

---
# 🌟 New Key Features( Detailed )
---

## 1. **🔄 NFT Transfers**

### 📝 Description:
This functionality allows users to directly transfer ownership of their NFTs to other wallets via the marketplace. It facilitates gifting or trading of NFTs without requiring additional interactions outside the marketplace.

### ⚙️ Functionality:

#### Key Points:
- **👤 Ownership Verification:** Ensures the sender is the current owner of the NFT.
- **🚫 No Self-Transfers:** Prevents transfers to the current owner.
- **🔄 Status Reset:** Resets the `for_sale` status and price of the NFT after the transfer.

#### Code Snippet:
```move
public entry fun transfer_nft(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    recipient: address
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
    let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

    assert!(nft_ref.owner == signer::address_of(account), 500); // Caller is not the owner
    assert!(nft_ref.owner != recipient, 501); // Prevent transfer to the same owner

    // Update NFT ownership and reset its for_sale status and price
    nft_ref.owner = recipient;
    nft_ref.for_sale = false;
    nft_ref.price = 0;
}
```

---

## 2. **💬 Offer System**

### 📝 Description:
This feature allows users to make, accept, or decline offers on NFTs listed in the marketplace. It enhances trading by enabling direct negotiations between buyers and sellers.

### ⚙️ Functionality:

#### Key Points:
- **💸 Price Proposals:** Buyers can propose a price for NFTs, even if they are not listed for sale.
- **✅ Negotiations:** Sellers can review and accept offers or decline them outright.

#### Code Snippets:

**💬 Make an Offer:**
```move
public entry fun make_offer(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    offer_price: u64
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
    let nft = vector::borrow_mut(&mut marketplace.nfts, nft_id);

    assert!(offer_price > 0, 700); // Offer price must be positive
    assert!(nft.owner != signer::address_of(account), 701); // Owner cannot make an offer

    let offer = Offer {
        buyer: signer::address_of(account),
        offer_price,
    };

    vector::push_back(&mut nft.offers, offer);
}
```

**✅ Accept an Offer:**
```move
public entry fun accept_offer(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    buyer: address
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
    let nft = vector::borrow_mut(&mut marketplace.nfts, nft_id);

    assert!(nft.owner == signer::address_of(account), 702); // Only the owner can accept offers
    assert!(nft.for_sale, 703); // NFT must be listed for sale

    let offer_index: u64 = 0;
    let offers_len = vector::length<Offer>(&nft.offers);

    while (offer_index < offers_len) {
        let offer = vector::borrow<Offer>(&nft.offers, offer_index);
        if (offer.buyer == buyer) {
            let offer_price = offer.offer_price;
            let marketplace_fee = offer_price / 50; // 2% fee
            let seller_revenue = offer_price - marketplace_fee;

            coin::transfer<aptos_coin::AptosCoin>(account, nft.owner, seller_revenue);
            coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, marketplace_fee);

            nft.owner = buyer;
            nft.for_sale = false;
            nft.price = 0;
            nft.offers = vector::empty<Offer>();
            return;
        };
        offer_index = offer_index + 1;
    };

    assert!(false, 704); // No matching offer found
}
```

**❌ Decline an Offer:**
```move
public entry fun decline_offer(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    buyer: address
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
    let nft = vector::borrow_mut(&mut marketplace.nfts, nft_id);

    assert!(nft.owner == signer::address_of(account), 705); // Only the owner can decline offers

    let i: u64 = 0;
    let offers_len = vector::length<Offer>(&nft.offers);

    while (i < offers_len) {
        let offer = vector::borrow<Offer>(&nft.offers, i);
        if (offer.buyer == buyer) {
            vector::remove(&mut nft.offers, i);
            return;
        };
        i = i + 1;
    };
    assert!(false, 706); // Offer not found
}
```

---

## 3. **💸 APT Payments**

### 📝 Description:
Incorporates APT tokens as the primary medium of exchange in the marketplace. Includes tipping or donation functionality to support creators.

### ⚙️ Functionality:

#### Key Points:
- **💰 APT Transactions:** Buyers pay for NFTs and tips/donations using APT tokens.
- **🔒 Secure Payments:** Ensures secure payment and fee deduction for transactions.

#### Code Snippet:
**💸 Tip or Donate:**
```move
public entry fun tip_or_donate(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    amount: u64
) acquires Marketplace {
    let marketplace = borrow_global<Marketplace>(marketplace_addr);
    let nft = vector::borrow(&marketplace.nfts, nft_id);

    assert!(amount > 0, 600); // Invalid donation amount

    let tip_fee = (amount * TIP_FEE_PERCENT) / 100;
    let creator_revenue = amount - tip_fee;

    coin::transfer<aptos_coin::AptosCoin>(account, nft.creator, creator_revenue);
    coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, tip_fee);
}
```

---

## 4. **🖼️ Minting for All Users**

### 📝 Description:
Allows all connected users to mint NFTs. Introduces optional minting fees and a whitelist for free minting.

### ⚙️ Functionality:

#### Key Points:
- **✔️ Free Minting for Whitelisted:** Whitelisted users can mint for free.
- **💵 Minting Fee:** Non-whitelisted users must pay a minting fee.

#### Code Snippet:
```move
public entry fun mint_nft(
    account: &signer, 
    name: vector<u8>, 
    description: vector<u8>, 
    uri: vector<u8>, 
    rarity: u8, 
    fee: u64,
    whitelist: vector<address>
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(signer::address_of(account));
    let nft_id = vector::length(&marketplace.nfts);

    let user_addr = signer::address_of(account);
    let is_whitelisted = check_whitelist(&whitelist, user_addr);

    if (!is_whitelisted) {
        assert!(coin::balance<aptos_coin::AptosCoin>(user_addr) >= fee, 500); // Insufficient balance
        coin::transfer<aptos_coin::AptosCoin>(account, FEE_COLLECTION_ADDRESS, fee);
    };

    let new_nft = NFT {
        id: nft_id,
        owner: user_addr,
        creator: user_addr,
        name,
        description,
        uri,
        price: 0,
        for_sale: false,
        rarity,
        offers: vector::empty(), 
        likes: 0, 
        likers: vector::empty<address>(),
    };

    vector::push_back(&mut marketplace.nfts, new_nft);
}
```

**🔧 Helper Function:**
```move
fun check_whitelist(whitelist: &vector<address>, user: address): bool {
    let whitelist_len = vector::length(whitelist);
    let i = 0;
    while (i < whitelist_len) {
        if (*vector::borrow(whitelist, i) == user) {
            return true;
        };
        i = i + 1;
    };
    false
}
```
---

## 5. **❤️ Like Functionality with Fee and Liker Tracking**

### 📝 Description:
The Like NFT feature allows users to like NFTs, rewarding creators with a like fee and tracking unique likers.

### ⚙️ Functionality:

### Key Features:
1. **💸 Like Fee:**
   - Users are required to pay a fee to like an NFT.
   - The fee is transferred directly to the NFT creator.

2. **🚫 Duplicate Like Prevention:**
   - Users cannot like the same NFT more than once.
   - Checks are performed to ensure that a liker isn't already in the `likers` list.

3. **📊 View Functions:**
   - Users can query the total number of likes and the list of likers for a specific NFT.


#### Code Snippet:

#### 1. **👍 Like an NFT:**
```move
public entry fun like_nft(
    account: &signer,
    marketplace_addr: address,
    nft_id: u64,
    like_fee: u64
) acquires Marketplace {
    let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
    let nft = vector::borrow_mut(&mut marketplace.nfts, nft_id);

    let liker = signer::address_of(account);

    // Ensure the liker hasn't already liked the NFT
    let likers_len = vector::length(&nft.likers);
    let i = 0;
    while (i < likers_len) {
        if (*vector::borrow(&nft.likers, i) == liker) {
            assert!(false, 800); // Duplicate like not allowed
        };
        i = i + 1;
    };

    // Transfer the like fee to the NFT creator
    assert!(coin::balance<aptos_coin::AptosCoin>(liker) >= like_fee, 801); // Insufficient balance
    coin::transfer<aptos_coin::AptosCoin>(account, nft.creator, like_fee);

    // Increment like count and add liker to the list
    nft.likes = nft.likes + 1;
    vector::push_back(&mut nft.likers, liker);
}
```


#### 2. **📊 Get Like Count:**
```move
#[view]
public fun get_like_count(
    marketplace_addr: address,
    nft_id: u64
): u64 acquires Marketplace {
    let marketplace = borrow_global<Marketplace>(marketplace_addr);
    let nft = vector::borrow(&marketplace.nfts, nft_id);
    nft.likes
}
```


#### 3. **🧑‍🤝‍🧑 Get Likers:**
```move
#[view]
public fun get_likers(
    marketplace_addr: address,
    nft_id: u64
): vector<address> acquires Marketplace {
    let marketplace = borrow_global<Marketplace>(marketplace_addr);
    let nft = vector::borrow(&marketplace.nfts, nft_id);
    nft.likers
}
```

---
## 6. **🔍 Advanced Filtering and Sorting Feature**

### 📝 Description:  
The Advanced Filtering and Sorting feature allows users to refine their NFT searches based on various criteria and sort results for a better browsing experience.

### ⚙️ Functionality:  
Users can filter NFTs by attributes like price range and rarity, search by keywords, and sort by price or likes.

#### Key Points:
1. **🔍 Search Functionality:** Enables keyword-based search in NFT names and descriptions.
2. **🎚️ Dynamic Filtering:** Filters by price range and rarity for tailored results.
3. **🔽 Sorting Options:** Sort NFTs by price (ascending/descending) or popularity (likes).
4. **🧭 Enhanced User Experience:** Simplifies navigation and improves discoverability of relevant NFTs.

### Code Snippet:
```javascript
const applyFiltersAndSort = () => {
  let filteredNfts = [...nfts];

  // Search by name or description
  if (searchQuery) {
    filteredNfts = filteredNfts.filter(
      (nft) =>
        nft.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        nft.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Filter by rarity
  if (rarity !== 'all') {
    filteredNfts = filteredNfts.filter((nft) => nft.rarity === rarity);
  }

  // Sorting based on price or likes
  if (sortOption === 'priceAsc') {
    filteredNfts.sort((a, b) => a.price - b.price);
  } else if (sortOption === 'priceDesc') {
    filteredNfts.sort((a, b) => b.price - a.price);
  } else if (sortOption === 'likesDesc') {
    filteredNfts.sort((a, b) => b.likes - a.likes);
  }

  return filteredNfts;
};
```
