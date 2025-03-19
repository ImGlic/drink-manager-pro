
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockProducts } from "@/data/mockData";
import { Search, Plus, Wine, ChevronDown, ChevronUp, PackagePlus, Trash2, Pencil } from "lucide-react";
import { FadeIn, SlideInFromBottom } from "@/components/ui/motion";
import AdicionarProdutoModal from "@/components/estoque/AdicionarProdutoModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

interface Product {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minimumStock: number;
  price: number;
}

const Estoque = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);

  // Extract unique categories from products
  const categories = Array.from(new Set(products.map(product => product.category)));

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory ? product.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortConfig.key === 'currentStock') {
      return sortConfig.direction === 'asc'
        ? a.currentStock - b.currentStock
        : b.currentStock - a.currentStock;
    } else if (sortConfig.key === 'price') {
      return sortConfig.direction === 'asc'
        ? a.price - b.price
        : b.price - a.price;
    }
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
  };

  const handleAddProduct = (productData: Omit<Product, "id">) => {
    const newProduct = {
      id: `p${products.length + 1}`,
      ...productData
    };
    
    setProducts([...products, newProduct]);
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts(products.filter(product => product.id !== productId));
    toast.success("Produto removido com sucesso!");
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <SlideInFromBottom>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <h2 className="text-3xl font-display font-semibold tracking-tight">Estoque</h2>
              <p className="text-muted-foreground">
                Gerencie os produtos e o estoque da sua loja
              </p>
            </div>
            <Button className="shrink-0" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Produto
            </Button>
          </div>
        </SlideInFromBottom>

        <FadeIn>
          <Tabs defaultValue="todos" className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <TabsList className="h-auto p-1">
                <TabsTrigger value="todos" onClick={() => handleCategorySelect(null)}>
                  Todos
                </TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger 
                    key={category} 
                    value={category}
                    onClick={() => handleCategorySelect(category)}
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  className="pl-8 w-full sm:w-[260px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <TabsContent value="todos" className="m-0">
              <Card>
                <CardContent className="p-0">
                  <div className="relative overflow-x-auto rounded-md">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead 
                            className="cursor-pointer font-medium"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center">
                              Produto {getSortIcon('name')}
                            </div>
                          </TableHead>
                          <TableHead className="font-medium">
                            Categoria
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-medium"
                            onClick={() => handleSort('currentStock')}
                          >
                            <div className="flex items-center">
                              Estoque {getSortIcon('currentStock')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer font-medium"
                            onClick={() => handleSort('price')}
                          >
                            <div className="flex items-center">
                              Preço {getSortIcon('price')}
                            </div>
                          </TableHead>
                          <TableHead className="font-medium">
                            Status
                          </TableHead>
                          <TableHead className="w-[100px]">
                            Ações
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedProducts.length > 0 ? (
                          sortedProducts.map((product) => (
                            <TableRow key={product.id} className="hover:bg-muted/30">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Wine className="h-5 w-5" />
                                  </div>
                                  {product.name}
                                </div>
                              </TableCell>
                              <TableCell>{product.category}</TableCell>
                              <TableCell>
                                <div className="flex items-center">
                                  {product.currentStock}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    / {product.minimumStock} min
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                R$ {product.price.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {product.currentStock <= product.minimumStock ? (
                                  <Badge variant="destructive">Estoque Baixo</Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    Normal
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                              Nenhum produto encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="m-0">
                {/* Conteúdo idêntico à aba "todos", mas já filtrado por categoria */}
              </TabsContent>
            ))}
          </Tabs>
        </FadeIn>
      </div>

      <AdicionarProdutoModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onAddProduct={handleAddProduct}
        categories={categories}
      />
    </Layout>
  );
};

export default Estoque;
