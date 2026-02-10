import { create } from 'zustand';

interface MarketplaceStore {
    filter: {
        query?: string;
        category?: string;
        tags?: string[];
    };
    setFilter: (filter: any) => void;
}

export const useMarketplaceStore = create<MarketplaceStore>((set) => ({
    filter: {},
    setFilter: (filter) => set({ filter }),
}));
