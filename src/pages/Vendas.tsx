
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { mockProducts, mockSales } from "@/data/mockData";
import { 
  ShoppingCart, 
  Search, 
  Trash2, 
  MinusCircle, 
  PlusCircle,
  Receipt,
  CheckCircle2
} from "lucide-react";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { FadeIn, SlideInFromBottom, StaggeredContainer } from "@/components/ui/motion";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const Vendas = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState(mockProducts);
  const [sales, setSales] = useState(mockSales);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter products based on search
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    // Check if we have enough stock
    const currentProduct = products.find(p => p.id === product.id);
    const existingCartItem = cart.find(item => item.id === product.id);
    const currentCartQuantity = existingCartItem ? existingCartItem.quantity : 0;
    
    if (currentProduct && currentProduct.currentStock <= currentCartQuantity) {
      toast.error(`Estoque insuficiente para ${product.name}`);
      return;
    }
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      
      if (existingItem) {
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prevCart, { 
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1
        }];
      }
    });
  };

  const updateQuantity = (id: string, change: number) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    const currentProduct = products.find(p => p.id === id);
    
    // Check if trying to increment beyond available stock
    if (change > 0 && currentProduct && item.quantity >= currentProduct.currentStock) {
      toast.error(`Estoque insuficiente para ${item.name}`);
      return;
    }
    
    setCart(prevCart => 
      prevCart.map(item => 
        item.id === id 
          ? { ...item, quantity: Math.max(1, item.quantity + change) } 
          : item
      )
    );
  };

  const removeFromCart = (id: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const finalizeOrder = () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Check if we have enough stock for all items
      const notEnoughStock = cart.some(item => {
        const product = products.find(p => p.id === item.id);
        return product ? product.currentStock < item.quantity : true;
      });
      
      if (notEnoughStock) {
        toast.error("Alguns produtos não têm estoque suficiente");
        setIsProcessing(false);
        return;
      }
      
      // Update stock
      const updatedProducts = products.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        if (cartItem) {
          return {
            ...product,
            currentStock: product.currentStock - cartItem.quantity
          };
        }
        return product;
      });
      
      // Create new sale
      const newSale = {
        id: `s${sales.length + 1}`,
        customer: "Cliente",
        date: new Date(),
        totalAmount: calculateTotal(),
        items: cart.map(item => ({
          id: `i${Math.random().toString(36).substring(2, 9)}`,
          product: item.name,
          quantity: item.quantity,
          price: item.price,
        }))
      };
      
      // Update state
      setProducts(updatedProducts);
      setSales([newSale, ...sales]);
      
      toast.success("Venda finalizada com sucesso!");
      clearCart();
    } catch (error) {
      toast.error("Erro ao finalizar venda");
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <SlideInFromBottom>
          <div>
            <h2 className="text-3xl font-display font-semibold tracking-tight">Vendas</h2>
            <p className="text-muted-foreground">
              Registre vendas e gerencie seu caixa
            </p>
          </div>
        </SlideInFromBottom>

        <FadeIn>
          <Tabs defaultValue="nova" className="w-full">
            <TabsList className="w-full max-w-md mb-4">
              <TabsTrigger value="nova" className="flex-1">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Nova Venda
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex-1">
                <Receipt className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="nova" className="m-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card className="h-full">
                    <div className="p-4 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produtos..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>
                    <CardContent className="p-0 overflow-auto" style={{ maxHeight: '60vh' }}>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        <StaggeredContainer className="contents" staggerDelay={0.05}>
                          {filteredProducts.map(product => (
                            <FadeIn key={product.id}>
                              <Card 
                                className={`hover:scale-[1.02] transition-transform overflow-hidden cursor-pointer h-full flex flex-col ${product.currentStock === 0 ? 'opacity-50' : ''}`}
                                onClick={() => product.currentStock > 0 ? addToCart(product) : toast.error(`Sem estoque para ${product.name}`)}
                              >
                                <div className="h-24 bg-primary/10 flex items-center justify-center">
                                  <ShoppingCart className="h-8 w-8 text-primary/70" />
                                </div>
                                <CardContent className="p-3 flex flex-col flex-grow">
                                  <div className="space-y-1 flex-1">
                                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h3>
                                    <div className="flex justify-between items-center mt-2">
                                      <p className="text-sm font-semibold">R$ {product.price.toFixed(2)}</p>
                                      <Badge 
                                        variant={product.currentStock <= product.minimumStock ? "destructive" : "outline"}
                                        className="text-xs"
                                      >
                                        {product.currentStock} un
                                      </Badge>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </FadeIn>
                          ))}
                        </StaggeredContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1">
                  <Card className="h-full flex flex-col">
                    <div className="p-4 border-b">
                      <div className="flex justify-between items-center">
                        <h3 className="font-display font-medium">Carrinho</h3>
                        {cart.length > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={clearCart}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Limpar
                          </Button>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-0 flex-1 overflow-auto" style={{ maxHeight: '40vh' }}>
                      <div className="p-4">
                        {cart.length > 0 ? (
                          <div className="space-y-4">
                            {cart.map(item => (
                              <div key={item.id} className="flex justify-between items-center p-2 rounded-lg border">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  <p className="text-muted-foreground text-xs">R$ {item.price.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center space-x-2 ml-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, -1)}
                                  >
                                    <MinusCircle className="h-4 w-4" />
                                  </Button>
                                  
                                  <span className="text-sm w-5 text-center">{item.quantity}</span>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => updateQuantity(item.id, 1)}
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-center gap-2">
                            <ShoppingCart className="h-8 w-8 opacity-20" />
                            <p>Carrinho vazio</p>
                            <p className="text-xs">Adicione produtos clicando neles</p>
                          </div>
                        )}
                      </div>
                    </CardContent>

                    <div className="p-4 border-t mt-auto">
                      <div className="space-y-4">
                        <div className="flex justify-between text-lg font-semibold">
                          <span>Total:</span>
                          <span>R$ {calculateTotal().toFixed(2)}</span>
                        </div>
                        <Button 
                          className="w-full" 
                          size="lg"
                          disabled={cart.length === 0 || isProcessing}
                          onClick={finalizeOrder}
                        >
                          {isProcessing ? "Processando..." : "Finalizar Venda"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="historico" className="m-0">
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <StaggeredContainer staggerDelay={0.05}>
                        {sales.map((sale) => (
                          <FadeIn key={sale.id}>
                            <TableRow className="hover:bg-muted/30">
                              <TableCell className="font-medium">{sale.customer}</TableCell>
                              <TableCell>
                                {new Date(sale.date).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>{sale.items.length}</TableCell>
                              <TableCell className="font-semibold">
                                R$ {sale.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Concluída
                                </Badge>
                              </TableCell>
                            </TableRow>
                          </FadeIn>
                        ))}
                      </StaggeredContainer>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
};

export default Vendas;
