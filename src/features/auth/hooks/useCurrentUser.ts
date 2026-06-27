import { useQuery } from "@tanstack/react-query";
import { authService } from "../services/authService";

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ["me"],
    queryFn: authService.me,
    retry: false, // don't retry on 401 — user is just not logged in
    staleTime: Infinity, // current user data doesn't go stale automatically
  });
};
