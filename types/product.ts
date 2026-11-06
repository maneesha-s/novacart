export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  categoryName: string;
};

export type ProductDetailsData = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  image: string | null;
  stock: number;
  categoryName: string;
};

export type ProductListData = {
  items: ProductCardData[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};
