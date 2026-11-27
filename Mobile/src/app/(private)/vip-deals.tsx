import { routeScreen } from "../../navigation/router";
import { DealsScreen } from "../../features/deals/DealsScreen";
export default routeScreen("Deals", ({ route }) => <DealsScreen dealId={route.params?.dealId} />, false);
