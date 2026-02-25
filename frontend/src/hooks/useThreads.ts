// src/hooks/useThreads.ts
import { useQuery } from "@tanstack/react-query";
import API from "../api";
import { Thread } from "../store/useThreadStore";

interface ThreadsResponse {
  data: Thread[];
  next_cursor?: string | null;
}

export const fetchCategoryThreads = async (
  categorySlug: string,
  cursor?: string,
) => {
  const url = cursor
    ? `/categories/${categorySlug}/threads?cursor=${cursor}`
    : `/categories/${categorySlug}/threads`;
  const res = await API.get<ThreadsResponse>(url);
  return res.data;
};

export const useCategoryThreads = (categorySlug: string) => {
  return useQuery({
    queryKey: ["categoryThreads", categorySlug],
    queryFn: () => fetchCategoryThreads(categorySlug),
    staleTime: 1000 * 60, // 1 min
    keepPreviousData: true,
  });
};
