import { useEffect } from 'react';
import { useMarketplace } from '../../hooks/useMarketplace';
import { useMarketplaceStore } from '../../store/useMarketplaceStore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Shield, Zap } from 'lucide-react';

export function MarketplaceStage() {
    const { filter } = useMarketplaceStore();
    const { services, listServices, isLoading, error } = useMarketplace();

    useEffect(() => {
        listServices(filter);
    }, [filter, listServices]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Loading services...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-full text-destructive">Error: {error}</div>;
    }

    return (
        <div className="p-6 h-full overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {services.map(service => (
                    <Card key={service.id} className="flex flex-col h-full hover:border-primary/50 transition-colors">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center mb-2">
                                    {service.iconUrl ? (
                                        <img src={service.iconUrl} alt={service.name} className="w-8 h-8" />
                                    ) : (
                                        <Zap className="w-6 h-6 text-primary" />
                                    )}
                                </div>
                                <Badge variant="outline" className="text-[10px]">{service.version}</Badge>
                            </div>
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            <CardDescription className="line-clamp-2 text-xs">
                                {service.description}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="flex flex-wrap gap-1 mb-4">
                                {service.tags?.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Shield className="w-3 h-3 text-green-500" />
                                <span>Verified Provider</span>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t pt-4">
                            <Button className="w-full" size="sm">
                                View Details
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
                
                {services.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Zap className="w-12 h-12 mb-4 opacity-20" />
                        <p>No services found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
