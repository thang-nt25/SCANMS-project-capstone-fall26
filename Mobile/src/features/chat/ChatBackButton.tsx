import { IconButton } from "../../components/commerce";
import { useMobileNavigation } from "../../navigation/router";

/** Deep-linked chat screens may be the first route; goBack also handles that case. */
export function ChatBackButton() {
  const navigation = useMobileNavigation();
  return (
    <IconButton
      name="arrow-left"
      label="Quay lại"
      onPress={navigation.goBack}
    />
  );
}
