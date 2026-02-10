import { useState } from 'react';
import { Search, Tag } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';

export function MarketplaceSidebar() {
    const { setFilter } = useMarketplaceStore();
    const [query, setQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>('All');

    const categories = ['All', 'AI Models', 'Data', 'Utilities', 'Financial', 'Social'];

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setFilter({ query: e.target.value, category: selectedCategory === 'All' ? undefined : selectedCategory });
    };

    const handleCategoryClick = (category: string) => {
        setSelectedCategory(category);
        setFilter({ query, category: category === 'All' ? undefined : category });
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="flex items-center gap-2 mb-4 px-2">
                <Tag className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Marketplace</h2>
            </div>

            <div className="relative mb-4 px-2">
                <Search className="absolute left-4 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search services..."
                    value={query}
                    onChange={handleSearch}
                    className="pl-8 bg-background"
                />
            </div>

            <div className="space-y-1 px-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">Categories</h3>
                {categories.map(cat => (
                    <Button
                        key={cat}
                        variant={selectedCategory === cat ? "secondary" : "ghost"}
                        className="w-full justify-start text-sm"
                        onClick={() => handleCategoryClick(cat)}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            <div className="mt-auto p-2">
                <div className="p-3 bg-card rounded-lg border border-border text-xs">
                    <h4 className="font-medium mb-1">AlephNet Services</h4>
                    <p className="text-muted-foreground">
                        Discover decentralized services powered by the mesh.
                    </p>
                </div>
            </div>
        </div>
    );
}
