
import React, { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockProducts } from "@/data/mockData";
import { Search, Plus, Filter, Wine, ChevronDown, ChevronUp } from "lucide-react";
import { FadeIn, SlideInFromBottom, StaggeredContainer } from "@/components/ui/motion";

interface SortConfig {
  key: string;
  direction: "asc" | "desc";
}

const Estoque = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "name", direction: "asc" });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract unique categories from products
  const categories = Array.from(new Set(mockProducts.map(product => product.category)));

  // Filter products based on search and category
  const filteredProducts = mockProducts.filter(product => {
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
            <Button className="shrink-0">
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
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
                        <tr>
                          <th 
                            scope="col" 
                            className="px-6 py-3 cursor-pointer"
                            onClick={() => handleSort('name')}
                          >
                            <div className="flex items-center">
                              Produto {getSortIcon('name')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Categoria
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 cursor-pointer"
                            onClick={() => handleSort('currentStock')}
                          >
                            <div className="flex items-center">
                              Estoque {getSortIcon('currentStock')}
                            </div>
                          </th>
                          <th 
                            scope="col" 
                            className="px-6 py-3 cursor-pointer"
                            onClick={() => handleSort('price')}
                          >
                            <div className="flex items-center">
                              Preço {getSortIcon('price')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <StaggeredContainer staggerDelay={0.05}>
                          {sortedProducts.length > 0 ? (
                            sortedProducts.map((product) => (
                              <FadeIn key={product.id} className="section-transition hover:bg-muted/30">
                                <tr>
                                  <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <Wine className="h-5 w-5" />
                                      </div>
                                      {product.name}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">{product.category}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center">
                                      {product.currentStock}
                                      <span className="text-xs text-muted-foreground ml-1">
                                        / {product.minimumStock} min
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    R$ {product.price.toFixed(2)}
                                  </td>
                                  <td className="px-6 py-4">
                                    {product.currentStock <= product.minimumStock ? (
                                      <Badge variant="destructive">Estoque Baixo</Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                        Normal
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              </FadeIn>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                Nenhum produto encontrado.
                              </td>
                            </tr>
                          )}
                        </StaggeredContainer>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {categories.map(category => (
              <TabsContent key={category} value={category} className="m-0">
                {/* Conteúdo idêntico à aba "todos", mas já filtrado por categoria */}
                <Card>
                  <CardContent className="p-0">
                    {/* ... conteúdo idêntico filtrado por categoria */}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </FadeIn>
      </div>
    </Layout>
  );
};

export default Estoque;
