import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogoMarca } from "@/components/Logo";

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="text-center space-y-4">
      <LogoMarca className="h-16 w-16 mx-auto opacity-80" />
      <h1 className="text-5xl">404</h1>
      <p className="text-muted-foreground">Essa página saiu para buscar gelo e não voltou.</p>
      <Button asChild>
        <Link to="/">Voltar ao início</Link>
      </Button>
    </div>
  </div>
);

export default NotFound;
