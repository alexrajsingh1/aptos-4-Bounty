// TODO# 1: Define Module and Marketplace Address
address your-marketplace-address-here {

    module NFTMarketplace {
        use 0x1::signer;
        use 0x1::vector;
        use 0x1::coin;
        use 0x1::aptos_coin;

        // TODO# 2: Define NFT Structure
               struct NFT has store, key {
            id: u64,
            owner: address,
            creator: address,
            name: vector<u8>,
            description: vector<u8>,
            uri: vector<u8>,
            price: u64,
            for_sale: bool,
            offers: vector<Offer>,
            rarity: u8,
            likes: u64, 
            likers: vector<address>  
        }

        struct Offer has copy, drop, store {
        buyer: address,
        offer_price: u64
    }


        // TODO# 3: Define Marketplace Structure
          struct Marketplace has key {
            nfts: vector<NFT>
        }

        
        // TODO# 4: Define ListedNFT Structure
             struct ListedNFT has copy, drop {
            id: u64,
            price: u64,
            rarity: u8
        }

        // TODO# 5: Set Marketplace Fee
                const MARKETPLACE_FEE_PERCENT: u64 = 2; // 2% fee

         // Tip/Donation Fee Percentage for Marketplace
                const TIP_FEE_PERCENT: u64 = 1; // 1% fee on tips or donations       



        // TODO# 6: Initialize Marketplace   
            public entry fun initialize(account: &signer) {
             let marketplace = Marketplace {
                nfts: vector::empty<NFT>()
            };
            move_to(account, marketplace);
        }     


        // TODO# 7: Check Marketplace Initialization
                #[view]
        public fun is_marketplace_initialized(marketplace_addr: address): bool {
            exists<Marketplace>(marketplace_addr)
        }

        // Add Like Functionality with Liker Tracking
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

        // View Like Count for an NFT
        #[view]
        public fun get_like_count(
            marketplace_addr: address,
            nft_id: u64
        ): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.likes
        }

        // View Likers for an NFT
        #[view]
        public fun get_likers(
            marketplace_addr: address,
            nft_id: u64
        ): vector<address> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.likers
        }

            // Make an offer for an NFT
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

    // Accept an offer
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
        let offer_found = false;

        while (offer_index < offers_len) {
    let offer = vector::borrow<Offer>(&nft.offers, offer_index);
    if (offer.buyer == buyer) {
        let offer_price = offer.offer_price;

        // Transfer payment
        let marketplace_fee = offer_price / 50; // 2% fee
        let seller_revenue = offer_price - marketplace_fee;

        coin::transfer<aptos_coin::AptosCoin>(account, nft.owner, seller_revenue);
        coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, marketplace_fee);

        // Update NFT
        nft.owner = buyer;
        nft.for_sale = false;
        nft.price = 0;

        nft.offers = vector::empty<Offer>();
        return // Exit after processing
    };
    offer_index = offer_index + 1;
};

assert!(false, 704); // No matching offer found

    }

    // Decline an offer
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
        return
    };
    i = i + 1;
};
assert!(false, 706); // Offer not found

    }


    // View Offers for NFT
#[view]
public fun get_offers(
    marketplace_addr: address,
    nft_id: u64
): vector<Offer> acquires Marketplace {
    let marketplace = borrow_global<Marketplace>(marketplace_addr);

    // Check if NFT ID is within bounds
    assert!(nft_id < vector::length(&marketplace.nfts), 707); // NFT ID out of range

    let nft = vector::borrow(&marketplace.nfts, nft_id);

    // Debug: Return offers
    nft.offers
}


        const FEE_COLLECTION_ADDRESS: address = @your-marketplace-address-here;

        // TODO# 8: Mint New NFT
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

    // Check if the user is whitelisted
    let user_addr = signer::address_of(account);
    let is_whitelisted = check_whitelist(&whitelist, user_addr);

    // If not whitelisted, ensure the user pays the minting fee
    if (!is_whitelisted) {
        assert!(coin::balance<aptos_coin::AptosCoin>(user_addr) >= fee, 500); // Insufficient balance
        coin::transfer<aptos_coin::AptosCoin>(account, FEE_COLLECTION_ADDRESS, fee); // Transfer the fee
    };

    // Mint the new NFT
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

// Helper function to check if a user is in the whitelist
fun check_whitelist(whitelist: &vector<address>, user: address): bool {
    let whitelist_len = vector::length(whitelist);
    let i = 0;
    while (i < whitelist_len) {
        if (*vector::borrow(whitelist, i) == user) { // Dereference &address
            return true
        };
        i = i + 1;
    };
    false
}


        // TODO# 9: View NFT Details
                #[view]
        public fun get_nft_details(marketplace_addr: address, nft_id: u64): (u64, address, address, vector<u8>, vector<u8>, vector<u8>, u64, bool, u8, u64) acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);

            (nft.id, nft.owner, nft.creator, nft.name, nft.description, nft.uri, nft.price, nft.for_sale, nft.rarity, nft.likes)
        }

        
        // TODO# 10: List NFT for Sale
                public entry fun list_for_sale(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 100); // Caller is not the owner
            assert!(!nft_ref.for_sale, 101); // NFT is already listed
            assert!(price > 0, 102); // Invalid price

            nft_ref.for_sale = true;
            nft_ref.price = price;
        }


        // TODO# 11: Update NFT Price
                public entry fun set_price(account: &signer, marketplace_addr: address, nft_id: u64, price: u64) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 200); // Caller is not the owner
            assert!(price > 0, 201); // Invalid price

            nft_ref.price = price;
        }


        // TODO# 12: Purchase NFT
                public entry fun purchase_nft(account: &signer, marketplace_addr: address, nft_id: u64, payment: u64) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

        assert!(nft_ref.for_sale, 400); // NFT is not for sale
        assert!(payment >= nft_ref.price, 401); // Insufficient payment

        // Calculate marketplace fee
        let fee = (nft_ref.price * MARKETPLACE_FEE_PERCENT) / 100;
        let seller_revenue = payment - fee;

        // Transfer payment to the seller and fee to the marketplace
        coin::transfer<aptos_coin::AptosCoin>(account, nft_ref.owner, seller_revenue);
        coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, fee);

        // Transfer ownership
        nft_ref.owner = signer::address_of(account);
        nft_ref.for_sale = false;
        nft_ref.price = 0;
    }
         
         // New Tip/Donate Functionality
    public entry fun tip_or_donate(
        account: &signer,
        marketplace_addr: address,
        nft_id: u64,
        amount: u64
    ) acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        let nft = vector::borrow(&marketplace.nfts, nft_id);

        assert!(amount > 0, 600); // Invalid donation amount

        // Calculate tip fee
        let tip_fee = (amount * TIP_FEE_PERCENT) / 100;
        let creator_revenue = amount - tip_fee;

        // Transfer tip to NFT creator and fee to the marketplace
        coin::transfer<aptos_coin::AptosCoin>(account, nft.creator, creator_revenue);
        coin::transfer<aptos_coin::AptosCoin>(account, marketplace_addr, tip_fee);
    }

       
       #[view]
    public fun get_marketplace_balance(marketplace_addr: address): u64 {
        coin::balance<aptos_coin::AptosCoin>(marketplace_addr)
    }


        // TODO# 13: Check if NFT is for Sale
                #[view]
        public fun is_nft_for_sale(marketplace_addr: address, nft_id: u64): bool acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.for_sale
        }


        // TODO# 14: Get NFT Price
                #[view]
        public fun get_nft_price(marketplace_addr: address, nft_id: u64): u64 acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.price
        }


        // TODO# 15: Transfer Ownership
                public entry fun transfer_ownership(account: &signer, marketplace_addr: address, nft_id: u64, new_owner: address) acquires Marketplace {
            let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
            let nft_ref = vector::borrow_mut(&mut marketplace.nfts, nft_id);

            assert!(nft_ref.owner == signer::address_of(account), 300); // Caller is not the owner
            assert!(nft_ref.owner != new_owner, 301); // Prevent transfer to the same owner

            // Update NFT ownership and reset its for_sale status and price
            nft_ref.owner = new_owner;
            nft_ref.for_sale = false;
            nft_ref.price = 0;
        }


        // TODO# 16: Retrieve NFT Owner
                #[view]
        public fun get_owner(marketplace_addr: address, nft_id: u64): address acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft = vector::borrow(&marketplace.nfts, nft_id);
            nft.owner
        }


        // TODO# 17: Retrieve NFTs for Sale
                #[view]
        public fun get_all_nfts_for_owner(marketplace_addr: address, owner_addr: address, limit: u64, offset: u64): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.owner == owner_addr) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }
 

        // TODO# 18: Retrieve NFTs for Sale
                #[view]
        public fun get_all_nfts_for_sale(marketplace_addr: address, limit: u64, offset: u64): vector<ListedNFT> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nfts_for_sale = vector::empty<ListedNFT>();

            let nfts_len = vector::length(&marketplace.nfts);
            let end = min(offset + limit, nfts_len);
            let mut_i = offset;
            while (mut_i < end) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.for_sale) {
                    let listed_nft = ListedNFT { id: nft.id, price: nft.price, rarity: nft.rarity };
                    vector::push_back(&mut nfts_for_sale, listed_nft);
                };
                mut_i = mut_i + 1;
            };

            nfts_for_sale
        }


        // TODO# 19: Define Helper Function for Minimum Value
                // Helper function to find the minimum of two u64 numbers
        public fun min(a: u64, b: u64): u64 {
            if (a < b) { a } else { b }
        }


        // TODO# 20: Retrieve NFTs by Rarity
                // New function to retrieve NFTs by rarity
        #[view]
        public fun get_nfts_by_rarity(marketplace_addr: address, rarity: u8): vector<u64> acquires Marketplace {
            let marketplace = borrow_global<Marketplace>(marketplace_addr);
            let nft_ids = vector::empty<u64>();

            let nfts_len = vector::length(&marketplace.nfts);
            let mut_i = 0;
            while (mut_i < nfts_len) {
                let nft = vector::borrow(&marketplace.nfts, mut_i);
                if (nft.rarity == rarity) {
                    vector::push_back(&mut nft_ids, nft.id);
                };
                mut_i = mut_i + 1;
            };

            nft_ids
        }

        // TODO# 21: NFT Direct Transfer Functionality
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
    }
}