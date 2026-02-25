// src/hooks/useCategories.ts
import { useQuery } from "@tanstack/react-query";
import API from "../api";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  threads_count: number;
  children?: Category[];
  thread_count: number;
}

const fetchCategories = async (): Promise<Category[]> => {
  const res = await API.get("/categories");
  return res.data;
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 5, // cache 5 min
  });
};
