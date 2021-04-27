import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productExists = updatedCart.find((item) => item.id === productId);
      const currentAmount = productExists ? productExists.amount : 0;

      const stock = await api.get(`stock/${productId}`);
      const { amount: stockAmount } = stock.data;

      if (currentAmount + 1 > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) {
        productExists.amount += 1;
        updatedCart
          .filter((product) => product.id !== productId)
          .push(productExists);
      } else {
        const product = await api.get(`products/${productId}`);
        const newProduct = { ...product.data, amount: 1 };
        updatedCart.push(newProduct);
      }

      setCart([...updatedCart]);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...updatedCart])
      );
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];

      const productExists = updatedCart.find((item) => item.id === productId);

      if (!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const newCartItems = updatedCart.filter((item) => item.id !== productId);

      setCart([...newCartItems]);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...newCartItems])
      );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart];

      const productExists = updatedCart.find((item) => item.id === productId);

      if (!productExists || amount < 1) {
        toast.error("Erro na alteração de quantidade do produto");
        return;
      }

      const currentAmount = productExists.amount;

      if (currentAmount <= 0) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const stock = await api.get(`stock/${productId}`);
      const { amount: stockAmount } = stock.data;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      productExists.amount = amount;

      const newCartItems = updatedCart.filter((item) => item.id !== productId);

      setCart([...newCartItems, productExists]);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify([...newCartItems, productExists])
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
