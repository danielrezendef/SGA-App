import { useAppAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { resolveDocumentLogo } from "@/lib/documentLogo";

export function useDocumentLogo() {
  const { user } = useAppAuth();
  const utils = trpc.useUtils();
  const key = user?.documentLogoKey;
  const query = trpc.documentLogo.get.useQuery(
    { key: key ?? "" },
    {
      enabled: Boolean(key),
      staleTime: 60_000,
      retry: false,
    }
  );
  return {
    logo: resolveDocumentLogo(key ? query.data : null),
    loading: Boolean(key) && query.isLoading,
    async getLogo() {
      if (!key) return resolveDocumentLogo();
      try {
        const data = await utils.documentLogo.get.fetch(
          { key },
          { staleTime: 60_000 }
        );
        return resolveDocumentLogo(data);
      } catch {
        return resolveDocumentLogo();
      }
    },
  };
}
