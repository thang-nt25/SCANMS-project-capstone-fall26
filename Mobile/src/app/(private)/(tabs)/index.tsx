import { Redirect, type Href } from "expo-router";
import { useAuth } from "../../../features/auth/AuthProvider";
import { ROLE_TABS } from "../../../navigation/role-tabs";
export default function Home() {
  const { session } = useAuth();
  return (
    <Redirect
      href={`/(private)/(tabs)/${ROLE_TABS[session!.user.role][0]}` as Href}
    />
  );
}
