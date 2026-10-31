import { useEffect, useState } from "react";
import api from "@/services/api";

export function useChatCapabilities() {
  const [messageReplies, setMessageReplies] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const load = () => {
      if (!localStorage.getItem("token")) {
        setMessageReplies(false);
        return;
      }
      void api
        .get("/chat/capabilities", {
          signal: controller.signal,
          headers: { "x-skip-cache": "1" },
        })
        .then((response: any) => {
          if (!controller.signal.aborted)
            setMessageReplies(
              (response.data ?? response)?.messageReplies === true,
            );
        })
        .catch(() => {
          if (!controller.signal.aborted) setMessageReplies(false);
        });
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener("auth-user-updated", load);
    return () => {
      controller.abort();
      window.removeEventListener("focus", load);
      window.removeEventListener("auth-user-updated", load);
    };
  }, []);
  return { messageReplies };
}
